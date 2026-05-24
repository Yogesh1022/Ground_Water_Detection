"""Lag-free XGBoost training script for groundwater depth prediction.

This script follows the same Google Drive / Colab-friendly structure as the
Random Forest notebook, but it removes lag-based features and target leakage.
It is designed to run on either Colab Drive or a local workspace.
"""

from __future__ import annotations

import hashlib
import io
import json
import os
import time
import warnings
from datetime import datetime
from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import xgboost as xgb
from scipy import stats
from sklearn.base import clone
from sklearn.feature_selection import mutual_info_regression
from sklearn.inspection import permutation_importance
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import RandomizedSearchCV, TimeSeriesSplit, cross_val_score, learning_curve

try:
    import shap

    SHAP_AVAILABLE = True
except Exception:
    SHAP_AVAILABLE = False

# ---------------------------------------------------------------------
# Colab / Drive setup
# ---------------------------------------------------------------------
COLAB_AVAILABLE = False
try:
    from google.colab import drive  # type: ignore

    COLAB_AVAILABLE = True
    drive.mount("/content/drive")
except Exception:
    COLAB_AVAILABLE = False

SCRIPT_DIR = Path(__file__).resolve().parent
LOCAL_ROOT = SCRIPT_DIR

BASE_CANDIDATES = []
if os.environ.get("GROUNDWATER_BASE_PATH"):
    BASE_CANDIDATES.append(Path(os.environ["GROUNDWATER_BASE_PATH"]))
BASE_CANDIDATES.extend(
    [
        Path("/content/drive/MyDrive/WPS_PRO"),
        Path("/content/drive/MyDrive/Ground_Water_Detection"),
        LOCAL_ROOT,
        LOCAL_ROOT.parent,
    ]
)


def first_existing_path(candidates: list[Path]) -> Path:
    for candidate in candidates:
        if str(candidate).strip() and candidate.exists():
            return candidate
    # Fall back to the first non-empty candidate so error messages are informative.
    for candidate in candidates:
        if str(candidate).strip():
            return candidate
    raise FileNotFoundError("No valid base path candidates were provided.")


BASE_PATH = first_existing_path(BASE_CANDIDATES)

DATA_CANDIDATES = [
    BASE_PATH / "Dataset" / "training_ready_data" / "vidarbha_groundwater_model_ready.csv",
    BASE_PATH / "dataset" / "vidarbha_groundwater_model_ready.csv",
    BASE_PATH / "data" / "vidarbha_groundwater_model_ready.csv",
    BASE_PATH / "data" / "vidarbha_groundwater_extended_v2.csv",
    BASE_PATH / "Dataset" / "training_ready_data" / "vidarbha_groundwater_extended_v2.csv",
    LOCAL_ROOT / "data" / "vidarbha_groundwater_extended_v2.csv",
    LOCAL_ROOT / "data" / "vidarbha_groundwater_model_ready.csv",
]

OUTPUT_CANDIDATES = [
    BASE_PATH / "Models" / "engines" / "path1_temporal" / "outputs" / "xgboost_no_lag",
    BASE_PATH / "outputs" / "xgboost_no_lag",
    LOCAL_ROOT / "outputs" / "xgboost_no_lag",
]

MODEL_CANDIDATES = [
    BASE_PATH / "Models" / "engines" / "path1_temporal" / "saved_models",
    BASE_PATH / "saved_models",
    LOCAL_ROOT / "saved_models",
]

DATA_PATH = first_existing_path(DATA_CANDIDATES)
OUTPUT_DIR = first_existing_path(OUTPUT_CANDIDATES)
MODEL_DIR = first_existing_path(MODEL_CANDIDATES)

# ---------------------------------------------------------------------
# Global configuration
# ---------------------------------------------------------------------
warnings.filterwarnings("ignore")
sns.set_palette("viridis")
plt.style.use("seaborn-v0_8-whitegrid")
plt.rcParams["figure.figsize"] = (14, 6)
plt.rcParams["font.size"] = 12

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)

RANDOM_STATE = 42
TARGET = "depth_mbgl"

DROP_COLUMNS = ["well_id", "date", "district", "year"]
LEAKY_COLUMNS = ["depth_change_rate"]
LAG_PATTERNS = ("lag",)

FEATURE_CANDIDATES = [
    # Meteorological
    "rainfall_mm",
    "temperature_avg",
    "temperature_max_c",
    "temperature_min_c",
    "humidity",
    "evapotranspiration",
    "evapotranspiration_mm",
    # Soil / hydrology
    "soil_moisture_index",
    "runoff_mm",
    "baseflow_mm",
    "soil_type_encoded",
    # Rolling rainfall features
    "rainfall_rolling_3m",
    "rainfall_rolling_6m",
    # Stress indicators
    "rainfall_deficit",
    "cumulative_deficit",
    "temp_rainfall_ratio",
    "drought_index",
    "irrigation_demand_mm",
    "water_stress_index",
    # Temporal
    "month",
    "season_encoded",
    "season",
    "month_sin",
    "month_cos",
    # Geospatial
    "latitude",
    "longitude",
    "elevation_m",
    "slope_degree",
    "district_encoded",
    # Vegetation
    "ndvi",
    # Engineered interaction
    "rainfall_x_soilmoist",
]

FEATURE_GROUPS = {
    "Meteorological": ["rainfall_mm", "temperature_avg", "temperature_max_c", "temperature_min_c", "humidity", "evapotranspiration", "evapotranspiration_mm"],
    "Soil / Hydrology": ["soil_moisture_index", "runoff_mm", "baseflow_mm", "soil_type_encoded"],
    "Rolling Rainfall": ["rainfall_rolling_3m", "rainfall_rolling_6m"],
    "Stress": ["rainfall_deficit", "cumulative_deficit", "temp_rainfall_ratio", "drought_index", "irrigation_demand_mm", "water_stress_index"],
    "Temporal": ["month", "season_encoded", "season", "month_sin", "month_cos"],
    "Geospatial": ["latitude", "longitude", "elevation_m", "slope_degree", "district_encoded"],
    "Vegetation": ["ndvi"],
    "Engineered": ["rainfall_x_soilmoist"],
}


# ---------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------
def resolve_feature_columns(df: pd.DataFrame) -> list[str]:
    exclude = set(DROP_COLUMNS + LEAKY_COLUMNS + [TARGET])
    for col in df.columns:
        lower = col.lower()
        if any(pattern in lower for pattern in LAG_PATTERNS):
            exclude.add(col)
        if lower.startswith("depth_rolling"):
            exclude.add(col)
    features = [col for col in FEATURE_CANDIDATES if col in df.columns and col not in exclude]
    # Keep any extra safe columns that are clearly non-lag and already available.
    for col in df.columns:
        lower = col.lower()
        if col in exclude:
            continue
        if col not in features and not any(pattern in lower for pattern in LAG_PATTERNS) and not lower.startswith("depth_rolling") and col != TARGET:
            # Only add extras that look numeric and are not obvious identifiers.
            if any(token in lower for token in ("rainfall", "temperature", "humidity", "evap", "soil", "runoff", "baseflow", "stress", "month", "season", "latitude", "longitude", "elevation", "slope", "district", "ndvi", "drought", "water", "month_sin", "month_cos")):
                features.append(col)
    if not features:
        raise ValueError("No usable feature columns were found after removing lag/leakage columns.")
    return features


def infer_year_series(df: pd.DataFrame) -> pd.Series:
    if "year" in df.columns:
        years = pd.to_numeric(df["year"], errors="coerce")
        if years.notna().any():
            return years
    if "date" in df.columns:
        dates = pd.to_datetime(df["date"], errors="coerce")
        if dates.notna().any():
            return dates.dt.year
    raise ValueError("The dataset must contain either a usable 'year' column or a 'date' column.")


def split_temporally(df: pd.DataFrame, X: pd.DataFrame, y_log: pd.Series):
    years = infer_year_series(df)
    year_values = sorted({int(v) for v in years.dropna().unique()})

    if 2023 in year_values and 2024 in year_values and 2025 in year_values:
        train_mask = years <= 2023
        val_mask = years == 2024
        test_mask = years == 2025
        split_label = "year-based split (train<=2023, val=2024, test=2025)"
    else:
        n = len(df)
        train_end = int(n * 0.75)
        val_end = int(n * 0.875)
        train_mask = df.index < train_end
        val_mask = (df.index >= train_end) & (df.index < val_end)
        test_mask = df.index >= val_end
        split_label = f"index-based split (0:{train_end}, {train_end}:{val_end}, {val_end}:{n})"

    X_train = X.loc[train_mask].copy()
    X_val = X.loc[val_mask].copy()
    X_test = X.loc[test_mask].copy()
    y_train = y_log.loc[train_mask].copy()
    y_val = y_log.loc[val_mask].copy()
    y_test = y_log.loc[test_mask].copy()

    y_train_raw = df.loc[train_mask, TARGET].copy()
    y_val_raw = df.loc[val_mask, TARGET].copy()
    y_test_raw = df.loc[test_mask, TARGET].copy()

    train_medians = X_train.median(numeric_only=True)
    for name, frame in (("Train", X_train), ("Val", X_val), ("Test", X_test)):
        frame.replace([np.inf, -np.inf], np.nan, inplace=True)
        if frame.isnull().any().any():
            frame.fillna(train_medians, inplace=True)

    return X_train, X_val, X_test, y_train, y_val, y_test, y_train_raw, y_val_raw, y_test_raw, split_label


def inverse_transform(pred_log: np.ndarray) -> np.ndarray:
    return np.clip(np.expm1(pred_log), 0, None)


def classify_risk(depth: float) -> str:
    if depth < 30:
        return "SAFE"
    if depth < 100:
        return "WARNING"
    if depth < 200:
        return "CRITICAL"
    return "EXTREME"


def evaluate_predictions(y_true_raw: np.ndarray, y_pred_raw: np.ndarray) -> dict[str, float]:
    r2 = r2_score(y_true_raw, y_pred_raw)
    rmse = float(np.sqrt(mean_squared_error(y_true_raw, y_pred_raw)))
    mae = float(mean_absolute_error(y_true_raw, y_pred_raw))
    mdape = float(np.median(np.abs((y_true_raw - y_pred_raw) / np.clip(y_true_raw, 1.0, None))) * 100)
    return {"r2": float(r2), "rmse": rmse, "mae": mae, "mdape": mdape}


def print_metrics(title: str, metrics: dict[str, float]) -> None:
    print(f"\n📊 {title}")
    print(f"   R²   : {metrics['r2']:.4f}")
    print(f"   RMSE : {metrics['rmse']:.4f} m")
    print(f"   MAE  : {metrics['mae']:.4f} m")
    print(f"   MdAPE: {metrics['mdape']:.2f}%")


def save_figure(filename: str) -> None:
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / filename, dpi=150, bbox_inches="tight")
    plt.show()


def add_engineered_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if "rainfall_mm" in df.columns and "soil_moisture_index" in df.columns:
        df["rainfall_x_soilmoist"] = df["rainfall_mm"] * df["soil_moisture_index"]
    return df


def load_dataset() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH)
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
    if TARGET not in df.columns:
        raise ValueError(f"Target column '{TARGET}' not found in dataset.")
    return df


def train_baseline(x_train, y_train, x_val, y_val):
    model = xgb.XGBRegressor(
        n_estimators=500,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_weight=5,
        reg_alpha=0.1,
        reg_lambda=1.0,
        gamma=0.0,
        random_state=RANDOM_STATE,
        n_jobs=-1,
        tree_method="hist",
        eval_metric="rmse",
        early_stopping_rounds=50,
    )
    model.fit(x_train, y_train, eval_set=[(x_train, y_train), (x_val, y_val)], verbose=100)
    return model


def tune_hyperparameters(x_train, y_train):
    param_distributions = {
        "n_estimators": [300, 500, 800, 1000],
        "max_depth": [4, 5, 6, 7, 8],
        "learning_rate": [0.01, 0.03, 0.05, 0.08, 0.1, 0.15],
        "subsample": [0.6, 0.7, 0.8, 0.9],
        "colsample_bytree": [0.6, 0.7, 0.8, 0.9],
        "min_child_weight": [1, 3, 5, 7, 10],
        "reg_alpha": [0.0, 0.01, 0.1, 0.5, 1.0],
        "reg_lambda": [0.5, 1.0, 1.5, 2.0],
        "gamma": [0.0, 0.1, 0.2, 0.5],
    }
    search = RandomizedSearchCV(
        estimator=xgb.XGBRegressor(random_state=RANDOM_STATE, n_jobs=-1, tree_method="hist", eval_metric="rmse"),
        param_distributions=param_distributions,
        n_iter=25,
        cv=TimeSeriesSplit(n_splits=5),
        scoring="r2",
        n_jobs=-1,
        verbose=1,
        return_train_score=True,
        random_state=RANDOM_STATE,
    )
    search.fit(x_train, y_train)
    return search


def feature_importance_report(model, feature_names: list[str]) -> pd.DataFrame:
    booster_scores = model.get_booster().get_score(importance_type="gain")
    rows = []
    for feature in feature_names:
        rows.append({"feature": feature, "gain": float(booster_scores.get(feature, 0.0))})
    return pd.DataFrame(rows).sort_values("gain", ascending=False)


def main() -> None:
    print("=" * 72)
    print("  XGBOOST LAG-FREE GROUNDWATER MODEL")
    print("=" * 72)
    print(f"Base path : {BASE_PATH}")
    print(f"Data path  : {DATA_PATH}")
    print(f"Output dir : {OUTPUT_DIR}")
    print(f"Model dir  : {MODEL_DIR}")
    print()

    df = load_dataset()
    df = add_engineered_features(df)
    feature_cols = resolve_feature_columns(df)

    print(f"Dataset shape : {df.shape[0]:,} rows x {df.shape[1]} columns")
    print(f"Features used  : {len(feature_cols)}")
    print(f"Target         : {TARGET}")
    print("\nFeature groups present:")
    for group_name, candidates in FEATURE_GROUPS.items():
        present = [c for c in candidates if c in feature_cols]
        print(f"  {group_name:18s}: {present}")

    X = df[feature_cols].copy()
    y_raw = df[TARGET].copy()
    y_log = np.log1p(y_raw)

    print(f"\nTarget stats (raw): mean={y_raw.mean():.2f}, median={y_raw.median():.2f}, std={y_raw.std():.2f}")
    print(f"Target stats (log1p): mean={y_log.mean():.4f}, std={y_log.std():.4f}")

    X_train, X_val, X_test, y_train, y_val, y_test, y_train_raw, y_val_raw, y_test_raw, split_label = split_temporally(df, X, y_log)
    print(f"\nSplit strategy: {split_label}")
    print(f"  Train: {len(X_train):,}")
    print(f"  Val  : {len(X_val):,}")
    print(f"  Test : {len(X_test):,}")

    # Correlation and mutual information analysis
    corr_df = X_train.copy()
    corr_df[TARGET] = y_train
    correlations = corr_df.corr(numeric_only=True)[TARGET].drop(TARGET).sort_values()
    mi_scores = mutual_info_regression(X_train, y_train, random_state=RANDOM_STATE, n_neighbors=5)
    mi_series = pd.Series(mi_scores, index=feature_cols).sort_values(ascending=False)

    print("\nTop 5 features by mutual information:")
    for feat, score in mi_series.head(5).items():
        print(f"  {feat:28s} {score:.4f}")

    fig, axes = plt.subplots(1, 2, figsize=(16, 6))
    top_corr = correlations.abs().sort_values(ascending=False).head(min(15, len(correlations)))
    axes[0].barh(top_corr.index[::-1], top_corr.values[::-1], color="#4CAF50")
    axes[0].set_title("Top feature correlations", fontweight="bold")
    axes[0].set_xlabel("Absolute Pearson correlation")

    top_mi = mi_series.head(min(15, len(mi_series)))
    axes[1].barh(top_mi.index[::-1], top_mi.values[::-1], color="#9C27B0")
    axes[1].set_title("Top mutual information scores", fontweight="bold")
    axes[1].set_xlabel("MI score")
    save_figure("01_feature_analysis.png")

    # Baseline model
    t0 = time.time()
    baseline_model = train_baseline(X_train, y_train, X_val, y_val)
    baseline_elapsed = time.time() - t0
    print(f"\nBaseline training time: {baseline_elapsed:.1f}s")

    y_train_pred = inverse_transform(baseline_model.predict(X_train))
    y_val_pred = inverse_transform(baseline_model.predict(X_val))
    y_test_pred = inverse_transform(baseline_model.predict(X_test))

    baseline_train_metrics = evaluate_predictions(y_train_raw.values, y_train_pred)
    baseline_val_metrics = evaluate_predictions(y_val_raw.values, y_val_pred)
    baseline_test_metrics = evaluate_predictions(y_test_raw.values, y_test_pred)

    print_metrics("Baseline train metrics", baseline_train_metrics)
    print_metrics("Baseline validation metrics", baseline_val_metrics)
    print_metrics("Baseline test metrics", baseline_test_metrics)

    # Hyperparameter tuning
    print("\nStarting hyperparameter tuning...")
    t0 = time.time()
    search = tune_hyperparameters(X_train, y_train)
    search_elapsed = time.time() - t0
    print(f"Search completed in {search_elapsed / 60:.1f} minutes")
    print(f"Best CV R²: {search.best_score_:.4f}")
    print(f"Best params: {search.best_params_}")

    results_df = pd.DataFrame(search.cv_results_)
    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    for lr in sorted(results_df["param_learning_rate"].unique()):
        subset = results_df[results_df["param_learning_rate"] == lr].groupby("param_n_estimators")["mean_test_score"].mean()
        if len(subset) > 1:
            axes[0].plot(subset.index, subset.values, marker="o", label=f"lr={lr}")
    axes[0].set_title("R² vs n_estimators", fontweight="bold")
    axes[0].legend(fontsize=8)

    for lr in sorted(results_df["param_learning_rate"].unique()):
        subset = results_df[results_df["param_learning_rate"] == lr].groupby("param_max_depth")["mean_test_score"].mean()
        if len(subset) > 1:
            axes[1].plot(subset.index, subset.values, marker="s", label=f"lr={lr}")
    axes[1].set_title("R² vs max_depth", fontweight="bold")
    axes[1].legend(fontsize=8)

    top_20 = results_df.nlargest(20, "mean_test_score")
    x_pos = range(len(top_20))
    axes[2].bar([x - 0.15 for x in x_pos], top_20["mean_train_score"], 0.3, label="Train R²", alpha=0.8)
    axes[2].bar([x + 0.15 for x in x_pos], top_20["mean_test_score"], 0.3, label="CV R²", alpha=0.8)
    axes[2].set_title("Top 20 configs: train vs CV", fontweight="bold")
    axes[2].legend(fontsize=8)
    axes[2].tick_params(axis="x", rotation=45)
    save_figure("02_search_results.png")

    # Final model
    best_params = search.best_params_.copy()
    final_model = xgb.XGBRegressor(
        **best_params,
        random_state=RANDOM_STATE,
        n_jobs=-1,
        tree_method="hist",
        eval_metric="rmse",
        early_stopping_rounds=50,
    )
    final_model.fit(X_train, y_train, eval_set=[(X_train, y_train), (X_val, y_val)], verbose=100)

    y_train_pred_final = inverse_transform(final_model.predict(X_train))
    y_val_pred_final = inverse_transform(final_model.predict(X_val))
    y_test_pred_final = inverse_transform(final_model.predict(X_test))

    final_train_metrics = evaluate_predictions(y_train_raw.values, y_train_pred_final)
    final_val_metrics = evaluate_predictions(y_val_raw.values, y_val_pred_final)
    final_test_metrics = evaluate_predictions(y_test_raw.values, y_test_pred_final)

    print_metrics("Final train metrics", final_train_metrics)
    print_metrics("Final validation metrics", final_val_metrics)
    print_metrics("Final test metrics", final_test_metrics)

    # Evaluation plots
    fig, axes = plt.subplots(1, 3, figsize=(20, 6))
    datasets = [
        ("TRAIN", y_train_raw.values, y_train_pred_final, final_train_metrics),
        ("VALIDATION", y_val_raw.values, y_val_pred_final, final_val_metrics),
        ("TEST", y_test_raw.values, y_test_pred_final, final_test_metrics),
    ]
    for idx, (name, y_true, y_pred, metrics) in enumerate(datasets):
        ax = axes[idx]
        ax.scatter(y_true, y_pred, alpha=0.15, s=5, c="#2196F3")
        min_val = min(y_true.min(), y_pred.min())
        max_val = max(y_true.max(), y_pred.max())
        ax.plot([min_val, max_val], [min_val, max_val], "r--", linewidth=2, label="Perfect prediction")
        ax.set_title(f"{name} Set\nR²={metrics['r2']:.4f} | RMSE={metrics['rmse']:.2f}m", fontweight="bold")
        ax.set_xlabel("Actual Depth (m)")
        ax.set_ylabel("Predicted Depth (m)")
        ax.legend()
    save_figure("03_predicted_vs_actual.png")

    residuals = y_test_raw.values - y_test_pred_final
    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    axes[0].hist(residuals, bins=50, color="#FF9800", edgecolor="white", alpha=0.8)
    axes[0].axvline(0, color="red", linewidth=2, linestyle="--")
    axes[0].set_title(f"Residual distribution\nMean: {residuals.mean():.3f}m | Std: {residuals.std():.3f}m", fontweight="bold")
    axes[0].set_xlabel("Residual (m)")
    axes[0].set_ylabel("Frequency")
    axes[1].scatter(y_test_pred_final, residuals, alpha=0.15, s=5, c="#9C27B0")
    axes[1].axhline(0, color="red", linewidth=2, linestyle="--")
    axes[1].set_title("Residuals vs Predicted", fontweight="bold")
    axes[1].set_xlabel("Predicted Depth (m)")
    axes[1].set_ylabel("Residual (m)")
    stats.probplot(residuals, dist="norm", plot=axes[2])
    axes[2].set_title("Q-Q Plot", fontweight="bold")
    save_figure("04_residual_analysis.png")

    # District performance if available
    if "district_encoded" in df.columns:
        test_df = df.loc[test_mask].copy().reset_index(drop=True)
        test_df["predicted"] = y_test_pred_final
        district_perf_rows = []
        for district_id in sorted(test_df["district_encoded"].dropna().unique()):
            district_mask = test_df["district_encoded"] == district_id
            y_true_d = test_df.loc[district_mask, TARGET].values
            y_pred_d = test_df.loc[district_mask, "predicted"].values
            if len(y_true_d) < 2:
                continue
            district_perf_rows.append(
                {
                    "district_encoded": district_id,
                    "r2": r2_score(y_true_d, y_pred_d),
                    "rmse": np.sqrt(mean_squared_error(y_true_d, y_pred_d)),
                    "mae": mean_absolute_error(y_true_d, y_pred_d),
                    "count": len(y_true_d),
                }
            )
        if district_perf_rows:
            district_perf = pd.DataFrame(district_perf_rows).sort_values("r2", ascending=False)
            print("\nDistrict-wise performance:")
            print(district_perf.to_string(index=False, float_format=lambda x: f"{x:.4f}"))
            fig, axes = plt.subplots(1, 2, figsize=(16, 6))
            labels = [f"Dist {int(v)}" for v in district_perf["district_encoded"]]
            axes[0].barh(labels, district_perf["r2"], color="#4CAF50")
            axes[0].set_title("District R²", fontweight="bold")
            axes[1].barh(labels, district_perf["rmse"], color="#2196F3")
            axes[1].set_title("District RMSE", fontweight="bold")
            save_figure("05_district_performance.png")

    # Feature importance
    importance_df = feature_importance_report(final_model, feature_cols)
    print("\nTop 10 features by gain:")
    print(importance_df.head(10).to_string(index=False, float_format=lambda x: f"{x:.4f}"))
    fig, ax = plt.subplots(figsize=(10, 8))
    top_imp = importance_df.head(min(15, len(importance_df)))
    ax.barh(top_imp["feature"][::-1], top_imp["gain"][::-1], color="#388E3C")
    ax.set_title("XGBoost Feature Importance (gain)", fontweight="bold")
    ax.set_xlabel("Gain")
    save_figure("06_feature_importance.png")

    # SHAP, if available
    if SHAP_AVAILABLE:
        shap_sample_size = min(3000, len(X_test))
        X_shap = X_test.sample(n=shap_sample_size, random_state=RANDOM_STATE)
        shap_explainer = shap.TreeExplainer(final_model)
        shap_explanation = shap_explainer(X_shap)
        fig, ax = plt.subplots(figsize=(12, 10))
        shap.summary_plot(shap_explanation, X_shap, plot_type="dot", show=False, max_display=20)
        plt.title("SHAP summary", fontweight="bold")
        save_figure("07_shap_summary.png")
    else:
        print("\nSHAP not available; skipping SHAP summary plot.")

    # Risk classification
    y_true_risk = np.array([classify_risk(v) for v in y_test_raw.values])
    y_pred_risk = np.array([classify_risk(v) for v in y_test_pred_final])
    risk_accuracy = float((y_true_risk == y_pred_risk).mean() * 100)
    print(f"\nRisk classification accuracy: {risk_accuracy:.1f}%")
    print(classification_report(y_true_risk, y_pred_risk, labels=["SAFE", "WARNING", "CRITICAL", "EXTREME"], zero_division=0))
    cm = confusion_matrix(y_true_risk, y_pred_risk, labels=["SAFE", "WARNING", "CRITICAL", "EXTREME"])
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=["SAFE", "WARNING", "CRITICAL", "EXTREME"], yticklabels=["SAFE", "WARNING", "CRITICAL", "EXTREME"], ax=ax)
    ax.set_title(f"Risk Classification Confusion Matrix\nAccuracy: {risk_accuracy:.1f}%", fontweight="bold")
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    save_figure("08_risk_confusion_matrix.png")

    # Save artifacts
    version_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_hash = hashlib.md5(str(best_params).encode()).hexdigest()[:8]

    model_path = MODEL_DIR / "xgboost_no_lag_best.pkl"
    native_path = MODEL_DIR / "xgboost_no_lag_best.json"
    config_path = MODEL_DIR / "xgboost_no_lag_config.json"
    metrics_path = MODEL_DIR / "xgboost_no_lag_metrics.json"
    versioned_path = MODEL_DIR / f"xgboost_no_lag_{version_str}_{model_hash}.pkl"

    joblib.dump(final_model, model_path)
    joblib.dump(final_model, versioned_path)
    final_model.save_model(native_path)

    config = {
        "base_path": str(BASE_PATH),
        "data_path": str(DATA_PATH),
        "feature_columns": feature_cols,
        "target_column": TARGET,
        "target_transform": "log1p",
        "inverse_transform": "expm1",
        "excluded_columns": DROP_COLUMNS,
        "excluded_patterns": list(LAG_PATTERNS),
        "feature_groups": FEATURE_GROUPS,
        "split_strategy": split_label,
    }
    with config_path.open("w", encoding="utf-8") as handle:
        json.dump(config, handle, indent=2)

    metrics_payload = {
        "model_version": f"{version_str}_{model_hash}",
        "best_params": best_params,
        "best_cv_r2": float(search.best_score_),
        "baseline_test": baseline_test_metrics,
        "final_test": final_test_metrics,
        "risk_accuracy_pct": risk_accuracy,
        "train_rows": int(len(X_train)),
        "val_rows": int(len(X_val)),
        "test_rows": int(len(X_test)),
        "feature_count": int(len(feature_cols)),
        "trained_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
    with metrics_path.open("w", encoding="utf-8") as handle:
        json.dump(metrics_payload, handle, indent=2, default=str)

    print("\nSaved artifacts:")
    for path in [model_path, versioned_path, native_path, config_path, metrics_path]:
        print(f"  {path}")

    print("\nLag-free XGBoost training complete.")


if __name__ == "__main__":
    main()
