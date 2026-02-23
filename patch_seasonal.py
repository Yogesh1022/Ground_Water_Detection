"""
patch_seasonal.py
─────────────────────────────────────────────────────────────────────────────
Fixes the seasonal depth variation weakness in existing CSV datasets.
Adds realistic 5–25m seasonal swing to depth_mbgl based on CGWB Vidarbha data,
then recalculates depth_lag_1q, depth_lag_2q, depth_change_rate consistently.

Target datasets:
  - data/vidarbha_groundwater_extended_v2.csv  (has well_id + date → full fix)

Why needed:
  The old p.py generator had a bug where specific_yield was used as recharge
  efficiency, making seasonal swings only ~0.02m instead of the real 5–30m.
─────────────────────────────────────────────────────────────────────────────
"""

import pandas as pd
import numpy as np
import os

# ── Seasonal depth adjustment (fraction of well's mean depth)
# Sign convention: positive = deeper (bad), negative = shallower (recharge)
# Based on CGWB Vidarbha groundwater level bulletins
SEASONAL_FRACTION = {
    1:  +0.07,   # Jan  — Winter, slow depletion
    2:  +0.09,   # Feb  — Winter peak depletion
    3:  +0.12,   # Mar  — Summer begins, more pumping
    4:  +0.17,   # Apr  — Summer stress
    5:  +0.22,   # May  — Peak summer crisis (deepest water table)
    6:  +0.13,   # Jun  — Pre-monsoon still dry
    7:  -0.10,   # Jul  — Monsoon recharge starts
    8:  -0.16,   # Aug  — Peak monsoon recovery (shallowest)
    9:  -0.12,   # Sep  — Late monsoon still recharging
    10: -0.06,   # Oct  — Post-monsoon recovery
    11: -0.02,   # Nov  — Post-monsoon, table still high
    12: +0.02,   # Dec  — Winter, minimal extraction
}
# These fractions sum to +0.36 (net depletion; offset will be removed so average stays constant)
# After centering: mean ≈ 0, peak-to-trough ≈ (0.22-(-0.16)) = 0.38 × base_depth

# Center so annual mean shift = 0
mean_frac = sum(SEASONAL_FRACTION.values()) / 12
SEASONAL_FRACTION = {m: v - mean_frac for m, v in SEASONAL_FRACTION.items()}

print(f"Seasonal fractions (centered, mean=0):")
for m, f in SEASONAL_FRACTION.items():
    bar = '█' * int(abs(f) * 50) if f > 0 else '░' * int(abs(f) * 50)
    sign = '+' if f >= 0 else '-'
    print(f"  Month {m:2d}: {sign}{abs(f):.4f}  {'▲ deeper' if f>0 else '▼ shallower'}")

print()


def fix_extended_csv(input_path, output_path):
    """Fix seasonal variation in extended CSV (with well_id and date)."""
    print(f"Loading {input_path}...")
    df = pd.read_csv(input_path, parse_dates=['date'] if 'date' in open(input_path).readline() else False)

    if 'well_id' not in df.columns or 'month' not in df.columns:
        print(f"  [SKIP] No well_id/month column found in {input_path}")
        return

    print(f"  Shape: {df.shape[0]:,} × {df.shape[1]}")

    # Check current seasonal variation
    orig_seasonal_diff = (df.groupby('month')['depth_mbgl'].mean().max() -
                          df.groupby('month')['depth_mbgl'].mean().min())
    print(f"  Current seasonal depth range: {orig_seasonal_diff:.4f}m  ← weak")

    # Per-well: compute mean depth, then add seasonal fraction × mean_depth
    print("  Applying seasonal correction per well...")

    df = df.sort_values(['well_id', 'date'] if 'date' in df.columns else ['well_id', 'month']).reset_index(drop=True)

    well_means = df.groupby('well_id')['depth_mbgl'].mean()

    seasonal_adj = df.apply(
        lambda row: SEASONAL_FRACTION[row['month']] * well_means[row['well_id']],
        axis=1
    )
    df['depth_mbgl'] = (df['depth_mbgl'] + seasonal_adj).round(3)

    # Clamp depth to physical bounds
    df['depth_mbgl'] = df['depth_mbgl'].clip(0.5, 350.0)

    # Recalculate lag/derivative features consistently
    print("  Recalculating lag features (depth_lag_1q, depth_lag_2q, depth_change_rate)...")
    df['depth_lag_1q'] = df.groupby('well_id')['depth_mbgl'].shift(1)
    df['depth_lag_2q'] = df.groupby('well_id')['depth_mbgl'].shift(2)
    df['depth_change_rate'] = df.groupby('well_id')['depth_mbgl'].diff()

    # Fill NaN lag values (first 1-2 records per well)
    df['depth_lag_1q'] = df['depth_lag_1q'].fillna(df['depth_mbgl'])
    df['depth_lag_2q'] = df['depth_lag_2q'].fillna(df['depth_mbgl'])
    df['depth_change_rate'] = df['depth_change_rate'].fillna(0.0)

    df['depth_lag_1q'] = df['depth_lag_1q'].round(3)
    df['depth_lag_2q'] = df['depth_lag_2q'].round(3)
    df['depth_change_rate'] = df['depth_change_rate'].round(4)

    # Verify improvement
    new_seasonal_diff = (df.groupby('month')['depth_mbgl'].mean().max() -
                         df.groupby('month')['depth_mbgl'].mean().min())

    print(f"\n  ── BEFORE vs AFTER ──")
    print(f"  Seasonal range: {orig_seasonal_diff:.4f}m  →  {new_seasonal_diff:.2f}m")

    monthly_means = df.groupby('month')['depth_mbgl'].mean()
    print(f"  Monthly means after fix:")
    for m, v in monthly_means.items():
        months = {1:'Jan',2:'Feb',3:'Mar',4:'Apr',5:'May',6:'Jun',
                  7:'Jul',8:'Aug',9:'Sep',10:'Oct',11:'Nov',12:'Dec'}
        print(f"    {months[m]:3s}: {v:.2f}m  {'▼ shallow (monsoon)' if m in [7,8,9] else '▲ deep (summer)' if m in [4,5] else ''}")

    new_corr = df['depth_mbgl'].corr(df['depth_lag_1q'])
    print(f"\n  depth_lag_1q correlation: {new_corr:.4f} (should be >0.90)")

    # Save
    df.to_csv(output_path, index=False)
    size_mb = os.path.getsize(output_path) / 1e6
    print(f"\n  [SAVED] → {output_path}  ({size_mb:.1f} MB, {df.shape[0]:,} rows)")
    return df


def fix_model_ready_csv(input_path, output_path, ref_extended_df):
    """
    Fix model-ready CSV (no well_id/date) by matching rows to extended dataset
    and applying the same depth corrections.
    """
    print(f"\nLoading model-ready: {input_path}...")
    df = pd.read_csv(input_path)

    if 'well_id' in df.columns:
        print(f"  [SKIP] This file already has well_id, use fix_extended_csv instead.")
        return

    print(f"  Shape: {df.shape[0]:,} × {df.shape[1]}")

    # For model-ready format, apply seasonal adjustment based on lat/lon cluster
    # Match to extended dataset by lat/lon to get well_id → get per-well mean depth
    if ref_extended_df is not None:
        well_info = ref_extended_df.drop_duplicates('well_id')[['well_id','latitude','longitude']]
        well_means = ref_extended_df.groupby('well_id')['depth_mbgl'].mean()

        # Match each row by nearest lat/lon
        from scipy.spatial import cKDTree
        tree = cKDTree(well_info[['latitude','longitude']].values)
        query_pts = df[['latitude','longitude']].values
        _, idxs = tree.query(query_pts, k=1)
        matched_well_ids = well_info.iloc[idxs]['well_id'].values
        base_depths = np.array([well_means[w] for w in matched_well_ids])
    else:
        # Fallback: use own depth as base
        base_depths = df['depth_mbgl'].values

    seasonal_adj = np.array([SEASONAL_FRACTION[m] for m in df['month']]) * base_depths
    df['depth_mbgl'] = (df['depth_mbgl'] + seasonal_adj).round(3).clip(0.5, 350.0)

    # Recalc lags — without well_id, we do best-effort using consecutive rows
    # (rows should be ordered by well then time in model-ready format)
    df['depth_lag_1q'] = df['depth_mbgl'].shift(1).fillna(df['depth_mbgl']).round(3)
    df['depth_lag_2q'] = df['depth_mbgl'].shift(2).fillna(df['depth_mbgl']).round(3)
    df['depth_change_rate'] = df['depth_mbgl'].diff().fillna(0.0).round(4)

    new_seasonal_diff = (df.groupby('month')['depth_mbgl'].mean().max() -
                         df.groupby('month')['depth_mbgl'].mean().min())
    print(f"  Seasonal range after fix: {new_seasonal_diff:.2f}m")

    df.to_csv(output_path, index=False)
    size_mb = os.path.getsize(output_path) / 1e6
    print(f"  [SAVED] → {output_path}  ({size_mb:.1f} MB)")


# ═══════════════════════════════
# MAIN
# ═══════════════════════════════
print("=" * 70)
print("  SEASONAL DEPTH FIX — Vidarbha Groundwater Datasets")
print("=" * 70)

BASE = r'E:\Ground_Water_Detection\data'

# 1. Fix the extended V2 dataset (has well_id + date — full quality fix)
ext_in  = os.path.join(BASE, 'vidarbha_groundwater_extended_v2.csv')
ext_out = os.path.join(BASE, 'vidarbha_groundwater_extended_v2.csv')  # overwrite in-place
fixed_ext_df = fix_extended_csv(ext_in, ext_out)

print()

# 2. Fix the 2015-2035 model-ready dataset
model_in = os.path.join(BASE, r'vidarbha_groundwater_extended_2015_2035 - vidarbha_groundwater_extended_2015_2035.csv')
model_out = model_in
if os.path.exists(model_in):
    fix_model_ready_csv(model_in, model_out, ref_extended_df=fixed_ext_df)
else:
    print(f"[SKIP] {model_in} not found.")

# 3. Fix model_ready_v2
mr_in  = os.path.join(BASE, 'vidarbha_groundwater_model_ready_v2.csv')
mr_out = mr_in
if os.path.exists(mr_in):
    fix_model_ready_csv(mr_in, mr_out, ref_extended_df=fixed_ext_df)

print("\n" + "=" * 70)
print("  SEASONAL FIX COMPLETE")
print("  Verify with: python dataset_analysis.py")
print("  Seasonal depth variation should now be 15-25m (was 0.02m)")
print("=" * 70)
