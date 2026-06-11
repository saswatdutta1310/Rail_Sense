"""
RailSense AI — Synthetic Training Data Generator
Generates 5000 rows of realistic train delay data for Indian Railways.
Output: backend/ml/data/delay_training.csv
"""

import os
import numpy as np
import pandas as pd

# ── Reproducibility ────────────────────────────────────────────────────────────
SEED = 42
RNG  = np.random.default_rng(SEED)

N_ROWS = 5_000

# ── Output path ────────────────────────────────────────────────────────────────
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR  = os.path.join(SCRIPT_DIR, "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "delay_training.csv")

os.makedirs(OUTPUT_DIR, exist_ok=True)


def generate_features(n: int) -> pd.DataFrame:
    """Generate raw feature columns."""
    return pd.DataFrame(
        {
            "fog_index":        RNG.uniform(0.0, 1.0, n),
            "rainfall_mm":      RNG.uniform(0.0, 50.0, n),
            "signal_status":    RNG.integers(0, 3, n),   # 0=normal, 1=degraded, 2=failed
            "congestion_level": RNG.uniform(0.0, 1.0, n),
            "time_of_day":      RNG.integers(0, 24, n),  # 0–23
            "train_type":       RNG.integers(0, 3, n),   # 0=passenger, 1=express, 2=rajdhani
        }
    )


def compute_delay(df: pd.DataFrame) -> np.ndarray:
    """
    Compute actual_delay_min with PROPORTIONAL penalties + small residual noise.

    Penalty rules (exact):
      base_delay        = uniform(2, 8)
      fog penalty       = fog_index * 80             + uniform(-5,  5)
      signal penalty    = 0 / 25+uniform(-3,3) / 75+uniform(-5,5)
                          for status 0 / 1 / 2
      congestion penalty= congestion_level * 50      + uniform(-4,  4)
      rainfall penalty  = (rainfall_mm / 50) * 25    + uniform(-3,  3)
      final noise       = uniform(-3, 3)
      clip to [0, 240], round to nearest int
    """
    n    = len(df)
    fog  = df["fog_index"].values
    rain = df["rainfall_mm"].values
    sig  = df["signal_status"].values
    cong = df["congestion_level"].values

    # Base delay — tight uniform range
    delay = RNG.uniform(2, 8, n)

    # Fog penalty — fully proportional, 0.0->0 min, 1.0->80 min
    delay += fog * 80.0 + RNG.uniform(-5, 5, n)

    # Signal penalty — fixed anchors with small noise
    sig1_mask = sig == 1
    sig2_mask = sig == 2
    delay[sig1_mask] += 25.0 + RNG.uniform(-3, 3, int(sig1_mask.sum()))
    delay[sig2_mask] += 75.0 + RNG.uniform(-5, 5, int(sig2_mask.sum()))

    # Congestion penalty — fully proportional, 0.0->0 min, 1.0->50 min
    delay += cong * 50.0 + RNG.uniform(-4, 4, n)

    # Rainfall penalty — fully proportional, 50mm->25 min max
    delay += (rain / 50.0) * 25.0 + RNG.uniform(-3, 3, n)

    # Final residual noise
    delay += RNG.uniform(-3, 3, n)

    # Clip to valid range and return as integer minutes
    return np.clip(delay, 0, 240).round().astype(int)


def main():
    print("=" * 55)
    print("  RailSense AI — Training Data Generator")
    print("=" * 55)

    print(f"\n[1/3] Generating {N_ROWS:,} feature rows …")
    df = generate_features(N_ROWS)

    print("[2/3] Computing realistic delay targets …")
    df["actual_delay_min"] = compute_delay(df)

    # Round floats for readability
    df["fog_index"]        = df["fog_index"].round(4)
    df["rainfall_mm"]      = df["rainfall_mm"].round(2)
    df["congestion_level"] = df["congestion_level"].round(4)

    print(f"[3/3] Saving CSV -> {OUTPUT_FILE}")
    df.to_csv(OUTPUT_FILE, index=False)

    # ── Summary ────────────────────────────────────────────────────────────────
    print("\n[OK] Done!")
    print(f"   Shape : {df.shape[0]:,} rows x {df.shape[1]} columns")
    print(f"   File  : {OUTPUT_FILE}")

    print("\n-- Column dtypes ------------------------------------------------")
    print(df.dtypes.to_string())

    print("\n-- Target Statistics (actual_delay_min) -------------------------")
    stats = df["actual_delay_min"].describe()
    for stat, val in stats.items():
        print(f"   {stat:<8}: {val:.1f}")

    print("\n-- Delay Distribution -------------------------------------------")
    bins   = [0, 20, 60, 120, 180, 240]
    labels = ["0-20 min", "21-60 min", "61-120 min", "121-180 min", "181-240 min"]
    df["_bin"] = pd.cut(df["actual_delay_min"], bins=bins, labels=labels, right=True)
    counts = df["_bin"].value_counts().sort_index()
    for label, count in counts.items():
        bar = "#" * (count // 40)
        print(f"   {label:<14}  {count:>5}  {bar}")

    print("=" * 65)


if __name__ == "__main__":
    main()
