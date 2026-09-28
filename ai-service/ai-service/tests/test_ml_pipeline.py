"""Phase 5B — ML pipeline tests (no legitimate dataset path).

Covers: feature schema, dataset validation, no-data behaviour, training
script refusing to fabricate a model, and registry consistency. sklearn is
never required for these tests.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

from ml.feature_schema import (
    FEATURE_ORDER,
    FEATURE_VERSION,
    LABEL_COLUMN,
    MIN_DATASET_ROWS,
    validate_feature_row,
)
from ml.validate_dataset import validate_dataset
from ml.train_risk_model import (
    EXIT_NO_DATASET,
    MODEL_OUT,
    REGISTRY_PATH,
    train,
)

ML_DIR = Path(__file__).resolve().parents[1] / "ml"


# ---- 1. Feature schema ----

def test_feature_schema_version_is_v1():
    assert FEATURE_VERSION == "v1"


def test_feature_schema_order_is_stable_and_complete():
    assert FEATURE_ORDER == [
        "requirements_passed", "requirements_review", "requirements_failed",
        "requirements_missing", "preliminary_fail_count", "preliminary_review_count",
        "expired_document_count", "conflict_count", "risk_factor_count",
        "high_risk_count", "medium_risk_count", "low_risk_count",
        "document_count", "evidence_coverage",
    ]
    assert len(FEATURE_ORDER) == 14
    assert len(set(FEATURE_ORDER)) == 14


def test_validate_feature_row_accepts_valid_and_rejects_missing():
    valid = {name: 0 for name in FEATURE_ORDER}
    valid["evidence_coverage"] = 0.5
    assert validate_feature_row(valid) == []

    incomplete = dict(valid)
    del incomplete["conflict_count"]
    problems = validate_feature_row(incomplete)
    assert any("conflict_count" in p for p in problems)


def test_validate_feature_row_rejects_out_of_range_coverage():
    row = {name: 0 for name in FEATURE_ORDER}
    row["evidence_coverage"] = 1.5
    problems = validate_feature_row(row)
    assert any("[0, 1]" in p for p in problems)


# ---- 2. Dataset validation ----

def test_validate_dataset_missing_file(tmp_path):
    report = validate_dataset(tmp_path / "does_not_exist.csv")
    assert not report.valid
    assert "not found" in report.reason


def test_validate_dataset_rejects_non_csv(tmp_path):
    p = tmp_path / "data.json"
    p.write_text("[]")
    report = validate_dataset(p)
    assert not report.valid
    assert "CSV" in report.reason


def test_validate_dataset_rejects_missing_label(tmp_path):
    header = ",".join(FEATURE_ORDER)
    body = "\n".join(",".join(["0"] * len(FEATURE_ORDER)) for _ in range(MIN_DATASET_ROWS))
    p = tmp_path / "no_label.csv"
    p.write_text(header + "\n" + body + "\n")
    report = validate_dataset(p)
    assert not report.valid
    assert LABEL_COLUMN in report.reason


def test_validate_dataset_rejects_too_few_rows(tmp_path):
    header = ",".join(FEATURE_ORDER + [LABEL_COLUMN])
    body = "\n".join(",".join(["0"] * (len(FEATURE_ORDER) + 1)) for _ in range(5))
    p = tmp_path / "tiny.csv"
    p.write_text(header + "\n" + body + "\n")
    report = validate_dataset(p)
    assert not report.valid
    assert "insufficient" in report.reason
    assert report.row_count == 5


def test_validate_dataset_rejects_single_class(tmp_path):
    header = ",".join(FEATURE_ORDER + [LABEL_COLUMN])
    body = "\n".join(",".join(["0"] * (len(FEATURE_ORDER) + 1)) for _ in range(MIN_DATASET_ROWS))
    p = tmp_path / "one_class.csv"
    p.write_text(header + "\n" + body + "\n")
    report = validate_dataset(p)
    assert not report.valid
    assert "both classes" in report.reason


# ---- 3. Training script: no-data behaviour, no fake model ----

def test_train_with_missing_dataset_refuses_and_keeps_registry_not_trained(tmp_path):
    # Snapshot the shipped registry — it must stay NOT_TRAINED after this run.
    before = json.loads(REGISTRY_PATH.read_text())
    assert before["activeModelVersion"] is None

    # Point training at temp paths so the shipped files are never rewritten.
    tmp_registry = tmp_path / "registry_status.json"
    tmp_model = tmp_path / "risk-model-v1.json"
    exit_code = train(str(tmp_path / "nope.csv"),
                      registry_path=tmp_registry, model_out=tmp_model)

    assert exit_code == EXIT_NO_DATASET
    assert not tmp_model.exists(), "No model artifact may be fabricated without data"

    after_registry = json.loads(tmp_registry.read_text())
    assert after_registry["activeModelVersion"] is None
    assert after_registry["models"][0]["status"] == "NOT_TRAINED"
    assert "REASON" not in after_registry["models"][0]["reason"]  # human text, not CLI banner
    assert "NOT TRAINED" in after_registry["models"][0]["reason"] or \
           "not found" in after_registry["models"][0]["reason"]

    shipped = json.loads(REGISTRY_PATH.read_text())
    assert shipped == before, "Shipped registry must be untouched by failed training"


def test_train_cli_exits_nonzero_without_dataset(tmp_path):
    result = subprocess.run(
        [sys.executable, str(ML_DIR / "train_risk_model.py"),
         "--dataset", str(tmp_path / "absent.csv")],
        capture_output=True, text=True,
        cwd=str(ML_DIR.parent),  # ai-service/ai-service so `ml` package resolves
        env={"PATH": "/usr/bin:/bin:/usr/local/bin", "PYTHONPATH": str(ML_DIR.parent)},
    )
    assert result.returncode == EXIT_NO_DATASET
    assert "MODEL STATUS: NOT TRAINED" in result.stdout
    assert "REASON:" in result.stdout


# ---- 4. Registry consistency (guards against silent fake training) ----

def test_registry_status_file_is_not_trained():
    registry = json.loads(REGISTRY_PATH.read_text())
    assert registry["activeModelVersion"] is None
    model = registry["models"][0]
    assert model["status"] == "NOT_TRAINED"
    assert model["featureVersion"] == FEATURE_VERSION
    assert model["metrics"] is None


def test_shipped_backend_registry_matches_python_registry():
    backend_registry = (Path(__file__).resolve().parents[3]
                        / "Backend" / "src" / "main" / "resources" / "ml" / "model-registry.json")
    if not backend_registry.exists():
        pytest.skip("backend registry not present in this checkout")
    py = json.loads(REGISTRY_PATH.read_text())
    be = json.loads(backend_registry.read_text())
    assert be["activeModelVersion"] is None
    assert be["models"][0]["status"] == "NOT_TRAINED"
    assert py["models"][0]["status"] == be["models"][0]["status"]
