"""Phase 5B — Model training pipeline for the ML risk layer.

Trains ONLY on a validated labeled dataset. When no valid dataset exists
(the current project state) this script exits with:

    MODEL STATUS: NOT TRAINED
    REASON: insufficient validated labeled historical dataset

and writes NO model artifacts. It never generates synthetic training rows,
never fabricates metrics, and never marks a model as trained.

Supported algorithms (tried in order, best evaluated one recorded — no
automatic "winner" marketing): Logistic Regression, Random Forest.
Requires: pip install -r requirements-ml.txt (scikit-learn).
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from ml.feature_schema import FEATURE_ORDER, FEATURE_VERSION, LABEL_COLUMN
from ml.validate_dataset import validate_dataset

REGISTRY_PATH = Path(__file__).parent / "registry" / "registry_status.json"
MODEL_OUT = Path(__file__).parent / "registry" / "risk-model-v1.json"

EXIT_NO_DATASET = 2
EXIT_TRAINING_FAILED = 3

NOT_TRAINED_REASON = (
    "MODEL STATUS: NOT TRAINED — insufficient validated labeled historical dataset. "
    "No production ML model trained."
)


def write_registry_not_trained(reason: str, registry_path: Path = REGISTRY_PATH) -> None:
    registry_path.parent.mkdir(parents=True, exist_ok=True)
    registry_path.write_text(json.dumps({
        "registryUpdated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "activeModelVersion": None,
        "models": [{
            "modelVersion": "risk-model-v1",
            "featureVersion": FEATURE_VERSION,
            "status": "NOT_TRAINED",
            "algorithm": None,
            "trainingTimestamp": None,
            "datasetVersion": None,
            "metrics": None,
            "reason": reason,
        }],
    }, indent=2) + "\n", encoding="utf-8")


def train(dataset_path: str,
          registry_path: Path = REGISTRY_PATH,
          model_out: Path = MODEL_OUT) -> int:
    report = validate_dataset(dataset_path)
    if not report.valid:
        print("MODEL STATUS: NOT TRAINED")
        print(f"REASON: {report.reason}")
        write_registry_not_trained(f"{NOT_TRAINED_REASON} ({report.reason})", registry_path)
        return EXIT_NO_DATASET

    # Valid dataset present — require ML dependencies before proceeding.
    try:
        import csv
        import numpy as np
        from sklearn.linear_model import LogisticRegression
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
        from sklearn.model_selection import train_test_split
    except ImportError as e:
        print("MODEL STATUS: NOT TRAINED")
        print(f"REASON: valid dataset found but ML dependencies are not installed ({e}).")
        print("Install with: pip install -r requirements-ml.txt")
        write_registry_not_trained(
            f"{NOT_TRAINED_REASON} (valid dataset but missing dependency: {e})", registry_path)
        return EXIT_NO_DATASET

    with open(dataset_path, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    x = np.array([[float(r[f]) for f in FEATURE_ORDER] for r in rows])
    y = np.array([int(r[LABEL_COLUMN]) for r in rows])

    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.25, random_state=42, stratify=y)

    print(f"dataset size: {len(rows)}")
    print(f"positive class: {int(y.sum())}  negative class: {int(len(y) - y.sum())}")
    print(f"train size: {len(y_train)}  test size: {len(y_test)}")
    print(f"features: {len(FEATURE_ORDER)} (version {FEATURE_VERSION})")

    candidates = {
        "LOGISTIC_REGRESSION": LogisticRegression(max_iter=1000),
        "RANDOM_FOREST": RandomForestClassifier(n_estimators=200, random_state=42),
    }

    results = {}
    for name, model in candidates.items():
        model.fit(x_train, y_train)
        proba = model.predict_proba(x_test)[:, 1]
        preds = (proba >= 0.5).astype(int)
        results[name] = {
            "model": model,
            "metrics": {
                "accuracy": round(float(accuracy_score(y_test, preds)), 4),
                "precision": round(float(precision_score(y_test, preds, zero_division=0)), 4),
                "recall": round(float(recall_score(y_test, preds, zero_division=0)), 4),
                "f1": round(float(f1_score(y_test, preds, zero_division=0)), 4),
                "roc_auc": round(float(roc_auc_score(y_test, proba)), 4)
                if len(set(y_test.tolist())) > 1 else None,
            },
        }
        print(f"{name}: {results[name]['metrics']}")

    # Record evaluation for both; pick highest ROC-AUC (ties → logistic for explainability).
    best_name = max(
        results,
        key=lambda n: (results[n]["metrics"].get("roc_auc") or 0.0,
                       0 if n == "LOGISTIC_REGRESSION" else 1))
    best = results[best_name]

    # Export in the Java-consumable contract (logistic coefficients only;
    # a random-forest winner is recorded but marked unsupported for Java inference).
    feature_mean = x_train.mean(axis=0).tolist()
    feature_std = x_train.std(axis=0).tolist()
    entry = {
        "modelVersion": "risk-model-v1",
        "featureVersion": FEATURE_VERSION,
        "status": "TRAINED",
        "algorithm": best_name,
        "trainingTimestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "datasetVersion": f"{Path(dataset_path).name}:{len(rows)}",
        "metrics": best["metrics"],
        "allCandidateMetrics": {n: r["metrics"] for n, r in results.items()},
        "intercept": None,
        "coefficients": None,
        "featureMean": feature_mean,
        "featureStd": feature_std,
        "thresholdMedium": 0.33,
        "thresholdHigh": 0.66,
        "reason": None,
    }
    if best_name == "LOGISTIC_REGRESSION":
        entry["intercept"] = float(best["model"].intercept_[0])
        entry["coefficients"] = [float(c) for c in best["model"].coef_[0]]
    else:
        entry["status"] = "TRAINED_NOT_DEPLOYABLE"
        entry["reason"] = ("Random Forest evaluated but Java inference supports "
                           "logistic regression coefficients only.")

    model_out.parent.mkdir(parents=True, exist_ok=True)
    model_out.write_text(json.dumps(entry, indent=2) + "\n", encoding="utf-8")

    active = "risk-model-v1" if entry["status"] == "TRAINED" else None
    registry_path.write_text(json.dumps({
        "registryUpdated": entry["trainingTimestamp"],
        "activeModelVersion": active,
        "models": [entry],
    }, indent=2) + "\n", encoding="utf-8")

    print(f"MODEL STATUS: {'TRAINED' if active else entry['status']}")
    print(f"model version: risk-model-v1  algorithm: {best_name}")
    print(f"artifacts: {model_out}")
    return 0


def main() -> int:
    import argparse
    parser = argparse.ArgumentParser(description="Train the ML risk model on a validated dataset")
    parser.add_argument("--dataset", required=True, help="Path to labeled dataset CSV")
    args = parser.parse_args()
    try:
        return train(args.dataset)
    except Exception as e:  # pragma: no cover - defensive
        print("MODEL STATUS: NOT TRAINED")
        print(f"REASON: training failed ({e})")
        write_registry_not_trained(f"{NOT_TRAINED_REASON} (training error: {e})")
        return EXIT_TRAINING_FAILED


if __name__ == "__main__":
    sys.exit(main())
