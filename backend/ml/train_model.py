"""
RailSense AI — Model Training Pipeline
Trains an XGBoost regressor on synthetic delay data and persists the model,
feature importance plot, and metadata for use by the prediction API.

Usage:
    python backend/ml/train_model.py
"""

import json
import os
import sys
from datetime import datetime, timezone

import joblib
import matplotlib
matplotlib.use("Agg")          # headless — no display required
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR  = os.path.dirname(SCRIPT_DIR)

DATA_PATH    = os.path.join(SCRIPT_DIR,  "data",   "delay_training.csv")
MODELS_DIR   = os.path.join(BACKEND_DIR, "models")
MODEL_PATH   = os.path.join(MODELS_DIR,  "delay_v1.pkl")
PLOT_PATH    = os.path.join(MODELS_DIR,  "feature_importance.png")
META_PATH    = os.path.join(MODELS_DIR,  "model_metadata.json")

MODEL_VERSION = "1.0.0"
FEATURE_NAMES = [
    "fog_index",
    "rainfall_mm",
    "signal_status",
    "congestion_level",
    "time_of_day",
    "train_type",
]
TARGET_COL = "actual_delay_min"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def sep(title: str = "", width: int = 60) -> None:
    if title:
        pad = (width - len(title) - 2) // 2
        print(f"\n{'=' * pad} {title} {'=' * pad}")
    else:
        print("=" * width)


def accuracy_within_n(y_true: np.ndarray, y_pred: np.ndarray, n: int = 15) -> float:
    """Fraction of predictions whose absolute error is <= n minutes."""
    return float(np.mean(np.abs(y_true - y_pred) <= n))


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def main() -> None:
    sep("RailSense AI — Model Trainer")

    # ------------------------------------------------------------------
    # 1. Load data
    # ------------------------------------------------------------------
    sep("1 / 5  Loading Data")
    if not os.path.exists(DATA_PATH):
        print(f"[ERROR] Training CSV not found: {DATA_PATH}")
        print("  Run  python backend/ml/generate_training_data.py  first.")
        sys.exit(1)

    df = pd.read_csv(DATA_PATH)
    print(f"  Loaded  : {df.shape[0]:,} rows x {df.shape[1]} columns")
    print(f"  Columns : {list(df.columns)}")

    missing = [c for c in FEATURE_NAMES + [TARGET_COL] if c not in df.columns]
    if missing:
        print(f"[ERROR] Missing columns in CSV: {missing}")
        sys.exit(1)

    X = df[FEATURE_NAMES].values
    y = df[TARGET_COL].values

    # ------------------------------------------------------------------
    # 2. Train / test split
    # ------------------------------------------------------------------
    sep("2 / 5  Train / Test Split  (80 / 20)")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )
    print(f"  Train samples : {len(X_train):,}")
    print(f"  Test  samples : {len(X_test):,}")

    # ------------------------------------------------------------------
    # 3. Train XGBoost
    # ------------------------------------------------------------------
    sep("3 / 5  Training XGBoost Regressor")
    model = XGBRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1,
        verbosity=0,
    )
    print("  Fitting model …")
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )
    print("  Training complete.")

    # ------------------------------------------------------------------
    # 4. Evaluate
    # ------------------------------------------------------------------
    sep("4 / 5  Evaluation")
    y_pred = model.predict(X_test)

    rmse     = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    acc_15   = accuracy_within_n(y_test, y_pred, n=15)
    mae      = float(np.mean(np.abs(y_test - y_pred)))
    r2       = float(model.score(X_test, y_test))

    print(f"  RMSE                        : {rmse:.2f} min")
    print(f"  MAE                         : {mae:.2f} min")
    print(f"  R^2                         : {r2:.4f}")
    print(f"  Accuracy within +/-15 min   : {acc_15 * 100:.1f}%  "
          f"({'PASS' if acc_15 >= 0.75 else 'FAIL'} — target >= 75%)")

    if acc_15 < 0.75:
        print("\n  [WARNING] Accuracy below 75% target. "
              "Consider tuning hyperparameters or generating more data.")

    # ------------------------------------------------------------------
    # 5. Save artefacts
    # ------------------------------------------------------------------
    sep("5 / 5  Saving Artefacts")
    os.makedirs(MODELS_DIR, exist_ok=True)

    # 5a — Model pickle
    joblib.dump(model, MODEL_PATH)
    print(f"  [OK] Model saved    : {MODEL_PATH}")

    # 5b — Feature importance plot
    importances = model.feature_importances_
    sorted_idx  = np.argsort(importances)[::-1]
    sorted_feat = [FEATURE_NAMES[i] for i in sorted_idx]
    sorted_imp  = importances[sorted_idx]

    fig, ax = plt.subplots(figsize=(9, 5))
    colors = plt.cm.RdYlGn_r(np.linspace(0.15, 0.85, len(sorted_feat)))
    bars = ax.barh(sorted_feat[::-1], sorted_imp[::-1], color=colors[::-1],
                   edgecolor="white", linewidth=0.5, height=0.6)

    # Annotate bars
    for bar, val in zip(bars, sorted_imp[::-1]):
        ax.text(val + 0.003, bar.get_y() + bar.get_height() / 2,
                f"{val:.3f}", va="center", fontsize=9, color="#333333")

    ax.set_xlabel("Feature Importance (Gain)", fontsize=11)
    ax.set_title("RailSense AI — XGBoost Feature Importances\n(delay_v1 model)",
                 fontsize=13, fontweight="bold", pad=14)
    ax.set_xlim(0, sorted_imp.max() * 1.18)
    ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(axis="y", labelsize=10)
    fig.patch.set_facecolor("#f8f9fa")
    ax.set_facecolor("#f8f9fa")
    plt.tight_layout()
    plt.savefig(PLOT_PATH, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  [OK] Plot saved     : {PLOT_PATH}")

    # 5c — Metadata JSON
    metadata = {
        "model_version":          MODEL_VERSION,
        "trained_at":             datetime.now(timezone.utc).isoformat(),
        "rmse":                   round(rmse, 4),
        "mae":                    round(mae, 4),
        "r2":                     round(r2, 6),
        "accuracy_within_15min":  round(acc_15, 6),
        "accuracy_within_15min_pct": round(acc_15 * 100, 2),
        "target_met":             acc_15 >= 0.75,
        "feature_names":          FEATURE_NAMES,
        "target_column":          TARGET_COL,
        "n_estimators":           200,
        "max_depth":              6,
        "learning_rate":          0.1,
        "train_size":             len(X_train),
        "test_size":              len(X_test),
        "model_path":             MODEL_PATH,
        "plot_path":              PLOT_PATH,
    }
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"  [OK] Metadata saved : {META_PATH}")

    # ------------------------------------------------------------------
    # Final summary
    # ------------------------------------------------------------------
    sep("Summary")
    print(f"  Model version   : {MODEL_VERSION}")
    print(f"  RMSE            : {rmse:.2f} min")
    print(f"  Within +/-15min : {acc_15 * 100:.1f}%")
    print(f"  Target met      : {'YES' if acc_15 >= 0.75 else 'NO'}")
    sep()


if __name__ == "__main__":
    main()
