"""Phase 5B — Dataset validation for the ML risk pipeline.

A dataset is only accepted when it is a real CSV with the v1 feature schema
plus a binary risk_label column and enough validated rows. Everything else is
rejected with an explicit reason — never silently padded or synthesised.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass, field
from pathlib import Path

from ml.feature_schema import FEATURE_ORDER, LABEL_COLUMN, MIN_DATASET_ROWS


@dataclass
class DatasetReport:
    valid: bool
    reason: str
    row_count: int = 0
    positive_count: int = 0
    negative_count: int = 0
    missing_features: list[str] = field(default_factory=list)


def validate_dataset(path: str | Path) -> DatasetReport:
    p = Path(path)
    if not p.exists():
        return DatasetReport(False, f"dataset file not found: {p}")
    if p.suffix.lower() != ".csv":
        return DatasetReport(False, f"dataset must be a CSV file, got: {p.suffix or 'no extension'}")

    try:
        with p.open(newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            if reader.fieldnames is None:
                return DatasetReport(False, "dataset has no header row")
            columns = [c.strip() for c in reader.fieldnames]
            missing = [f for f in FEATURE_ORDER if f not in columns]
            if missing:
                return DatasetReport(False, "dataset is missing required feature columns",
                                     missing_features=missing)
            if LABEL_COLUMN not in columns:
                return DatasetReport(False, f"dataset is missing label column '{LABEL_COLUMN}'")

            rows = list(reader)
    except csv.Error as e:
        return DatasetReport(False, f"dataset could not be parsed as CSV: {e}")

    if len(rows) < MIN_DATASET_ROWS:
        return DatasetReport(
            False,
            f"insufficient validated labeled rows: {len(rows)} < minimum {MIN_DATASET_ROWS}",
            row_count=len(rows))

    positives = 0
    negatives = 0
    for i, row in enumerate(rows):
        raw = (row.get(LABEL_COLUMN) or "").strip()
        if raw not in ("0", "1"):
            return DatasetReport(
                False,
                f"row {i + 2}: label '{raw}' is not binary 0/1",
                row_count=len(rows))
        if raw == "1":
            positives += 1
        else:
            negatives += 1
        for name in FEATURE_ORDER:
            raw_val = (row.get(name) or "").strip()
            try:
                float(raw_val)
            except ValueError:
                return DatasetReport(
                    False,
                    f"row {i + 2}: feature '{name}' value '{raw_val}' is not numeric",
                    row_count=len(rows))

    if positives == 0 or negatives == 0:
        return DatasetReport(
            False,
            f"dataset must contain both classes (positives={positives}, negatives={negatives})",
            row_count=len(rows), positive_count=positives, negative_count=negatives)

    return DatasetReport(
        True, "dataset is valid",
        row_count=len(rows), positive_count=positives, negative_count=negatives)


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Validate an ML risk training dataset CSV")
    parser.add_argument("--dataset", required=True, help="Path to dataset CSV")
    args = parser.parse_args()

    report = validate_dataset(args.dataset)
    print(f"valid={report.valid}")
    print(f"reason={report.reason}")
    print(f"rows={report.row_count} positives={report.positive_count} negatives={report.negative_count}")
    if report.missing_features:
        print(f"missing_features={','.join(report.missing_features)}")
    return 0 if report.valid else 1


if __name__ == "__main__":
    raise SystemExit(main())
