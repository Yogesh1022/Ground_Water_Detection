"""Lag-free LightGBM training script for groundwater depth prediction.

This mirrors the Random Forest notebook structure, but it removes lag-based
features and keeps the workflow runnable even when `lightgbm` is unavailable by
falling back to `sklearn.ensemble.GradientBoostingRegressor`.
"""

from __future__ import annotations

import hashlib
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
from scipy import stats
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.feature_selection import mutual_info_regression
from sklearn.inspection import permutation_importance
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import RandomizedSearchCV, TimeSeriesSplit

try:
    from google.colab import drive  # type: ignore

    drive.mount("/content/drive")
except Exception:
    pass

try:
    import lightgbm as lgb  # type: ignore
    from lightgbm import LGBMRegressor  # type: ignore

    LIGHTGBM_AVAILABLE = True
except Exception:
    lgb = None  # type: ignore
    LGBMRegressor = GradientBoostingRegressor
    LIGHTGBM_AVAILABLE = False

try:
    import shap

    SHAP_AVAILABLE = True
except Exception:
    SHAP_AVAILABLE = False

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
    for candidate in candidates:
        if str(candidate).strip():
            return candidate
    raise FileNotFoundError("No valid path candidates were provided.")


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
    BASE_PATH / "Models" / "engines" / "path1_temporal" / "outputs" / "lgbm_no_lag",
    BASE_PATH / "outputs" / "lgbm_no_lag",
    LOCAL_ROOT / "outputs" / "lgbm_no_lag",
]
MODEL_CANDIDATES = [
    BASE_PATH / "Models" / "engines" / "path1_temporal" / "saved_models",
    BASE_PATH / "saved_models",
    LOCAL_ROOT / "saved_models",
]
DATA_PATH = first_existing_path(DATA_CANDIDATES)
OUTPUT_DIR = first_existing_path(OUTPUT_CANDIDATES)
MODEL_DIR = first_existing_path(MODEL_CANDIDATES)

warnings.filterwarnings("ignore")
sns.set_palette("magma")
plt.style.use("seaborn-v0_8-whitegrid")
plt.rcParams["figure.figsize"] = (14, 6)
plt.rcParams["font.size"] = 12

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)

RANDOM_STATE = 42
TARGET = "depth_mbgl"
DROP_COLUMNS = ["well_id", "date", "district", "year"]
LAG_PATTERNS = ("lag",)

FEATURE_CANDIDATES = [
    "rainfall_mm",
    "temperature_avg",
    "temperature_max_c",
    "temperature_min_c",
    "humidity",
    "evapotranspiration",
    "evapotranspiration_mm",
    "soil_moisture_index",
    "runoff_mm",
    "baseflow_mm",
    "soil_type_encoded",
    "rainfall_rolling_3m",
    "rainfall_rolling_6m",
    "rainfall_deficit",
    "cumulative_deficit",
    "temp_rainfall_ratio",
    "drought_index",
    "irrigation_demand_mm",
    "water_stress_index",
    "month",
    "season_encoded",
    "season",
    "month_sin",
    "month_cos",
    "latitude",
    "longitude",
    "elevation_m",
    "slope_degree",
    "district_encoded",
    "ndvi",
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


def resolve_feature_columns(df: pd.DataFrame) -> list[str]:
    exclude = set(DROP_COLUMNS + [TARGET])
    for col in df.columns:
        lower = col.lower()
        if any(pattern in lower for pattern in LAG_PATTERNS):
            exclude.add(col)
        if lower.startswith("depth_rolling"):
            exclude.add(col)
    features = [col for col in FEATURE_CANDIDATES if col in df.columns and col not in exclude]
    for col in df.columns:
        lower = col.lower()
        if col in exclude:
            continue
        if col not in features and not any(pattern in lower for pattern in LAG_PATTERNS) and not lower.startswith("depth_rolling") and col != TARGET:
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
    for frame in (X_train, X_val, X_test):
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
    return {
        "r2": float(r2_score(y_true_raw, y_pred_raw)),
        "rmse": float(np.sqrt(mean_squared_error(y_true_raw, y_pred_raw))),
        "mae": float(mean_absolute_error(y_true_raw, y_pred_raw)),
        "mdape": float(np.median(np.abs((y_true_raw - y_pred_raw) / np.clip(y_true_raw, 1.0, None))) * 100),
    }


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


def build_param_distributions() -> dict:
    if LIGHTGBM_AVAILABLE:
        return {
            "n_estimators": [200, 400, 600, 800, 1000],
            "learning_rate": [0.01, 0.03, 0.05, 0.08, 0.1],
            "num_leaves": [31, 63, 127, 255],
            "max_depth": [-1, 4, 5, 6, 7, 8, 10],
            "min_child_samples": [10, 20, 30, 40, 50],
            "subsample": [0.6, 0.7, 0.8, 0.9, 1.0],
            "colsample_bytree": [0.6, 0.7, 0.8, 0.9, 1.0],
            "reg_alpha": [0.0, 0.01, 0.1, 0.5, 1.0],
            "reg_lambda": [0.0, 0.5, 1.0, 1.5, 2.0],
        }
    return {
        "n_estimators": [100, 200, 300, 500, 800],
        "learning_rate": [0.01, 0.03, 0.05, 0.08, 0.1],
        "max_depth": [2, 3, 4, 5, 6],
        "subsample": [0.6, 0.7, 0.8, 0.9, 1.0],
        "min_samples_leaf": [1, 2, 5, 10, 20],
        "min_samples_split": [2, 4, 6, 8, 10],
        "max_features": [None, "sqrt", "log2"],
    }


def build_model(**params):
    if LIGHTGBM_AVAILABLE:
        return LGBMRegressor(
            random_state=RANDOM_STATE,
            n_jobs=-1,
            objective="regression",
            importance_type="gain",
            **params,
        )
    return LGBMRegressor(random_state=RANDOM_STATE, **params)


def get_feature_importance(model, feature_names: list[str], x_train: pd.DataFrame, y_train: pd.Series) -> pd.DataFrame:
    if LIGHTGBM_AVAILABLE and hasattr(model, "booster_"):
        scores = model.booster_.feature_importance(importance_type="gain")
        return pd.DataFrame({"feature": feature_names, "importance": scores}).sort_values("importance", ascending=False)
    if hasattr(model, "feature_importances_"):
        return pd.DataFrame({"feature": feature_names, "importance": model.feature_importances_}).sort_values("importance", ascending=False)
    perm = permutation_importance(model, x_train, y_train, n_repeats=10, random_state=RANDOM_STATE, n_jobs=-1)
    return pd.DataFrame({"feature": feature_names, "importance": perm.importances_mean}).sort_values("importance", ascending=False)


def main() -> None:
    print("=" * 72)
    print("  LGBM LAG-FREE GROUNDWATER MODEL")
    print("=" * 72)
    print(f"Base path : {BASE_PATH}")
    print(f"Data path  : {DATA_PATH}")
    print(f"Output dir : {OUTPUT_DIR}")
    print(f"Model dir  : {MODEL_DIR}")
    print(f"LightGBM available: {LIGHTGBM_AVAILABLE}")

    df = load_dataset()
    df = add_engineered_features(df)
    feature_cols = resolve_feature_columns(df)

    print(f"\nDataset shape : {df.shape[0]:,} rows x {df.shape[1]} columns")
    print(f"Features used  : {len(feature_cols)}")
    print(f"Target         : {TARGET}")
    print("\nFeature groups present:")
    for group_name, candidates in FEATURE_GROUPS.items():
        present = [c for c in candidates if c in feature_cols]
        print(f"  {group_name:18s}: {present}")

    X = df[feature_cols].copy()
    y_raw = df[TARGET].copy()
    y_log = np.log1p(y_raw)

    X_train, X_val, X_test, y_train, y_val, y_test, y_train_raw, y_val_raw, y_test_raw, split_label = split_temporally(df, X, y_log)
    print(f"\nSplit strategy: {split_label}")
    print(f"  Train: {len(X_train):,}")
    print(f"  Val  : {len(X_val):,}")
    print(f"  Test : {len(X_test):,}")

    corr_df = X_train.copy()
    corr_df[TARGET] = y_train
    correlations = corr_df.corr(numeric_only=True)[TARGET].drop(TARGET).sort_values()
    mi_scores = mutual_info_regression(X_train, y_train, random_state=RANDOM_STATE, n_neighbors=5)
    mi_series = pd.Series(mi_scores, index=feature_cols).sort_values(ascending=False)

    fig, axes = plt.subplots(1, 2, figsize=(16, 6))
    top_corr = correlations.abs().sort_values(ascending=False).head(min(15, len(correlations)))
    axes[0].barh(top_corr.index[::-1], top_corr.values[::-1], color="#4CAF50")
    axes[0].set_title("Top feature correlations", fontweight="bold")
    axes[0].set_xlabel("Absolute Pearson correlation")

    top_mi = mi_series.head(min(15, len(mi_series)))
    axes[1].barh(top_mi.index[::-1], top_mi.values[::-1], color="#E91E63")
    axes[1].set_title("Top mutual information scores", fontweight="bold")
    axes[1].set_xlabel("MI score")
    save_figure("01_feature_analysis.png")

    print("\nStarting hyperparameter search...")
    t0 = time.time()
    search = RandomizedSearchCV(
        estimator=build_model(),
        param_distributions=build_param_distributions(),
        n_iter=25,
        scoring="r2",
        cv=TimeSeriesSplit(n_splits=5),
        n_jobs=-1,
        verbose=1,
        random_state=RANDOM_STATE,
        return_train_score=True,
    )
    search.fit(X_train, y_train)
    print(f"Search completed in {(time.time() - t0) / 60:.1f} minutes")
    print(f"Best CV R²: {search.best_score_:.4f}")
    print(f"Best params: {search.best_params_}")

    results_df = pd.DataFrame(search.cv_results_)
    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    if "param_n_estimators" in results_df.columns:
        grouped = results_df.groupby("param_n_estimators")["mean_test_score"].mean()
        axes[0].plot(grouped.index, grouped.values, marker="o")
        axes[0].set_title("CV R² vs n_estimators", fontweight="bold")
    if "param_learning_rate" in results_df.columns:
        grouped = results_df.groupby("param_learning_rate")["mean_test_score"].mean()
        axes[1].plot(grouped.index, grouped.values, marker="o", color="#FF9800")
        axes[1].set_title("CV R² vs learning_rate", fontweight="bold")
    top_20 = results_df.nlargest(20, "mean_test_score")
    x_pos = range(len(top_20))
    axes[2].bar([x - 0.15 for x in x_pos], top_20["mean_train_score"], 0.3, label="Train R²", alpha=0.8)
    axes[2].bar([x + 0.15 for x in x_pos], top_20["mean_test_score"], 0.3, label="CV R²", alpha=0.8)
    axes[2].set_title("Top 20 configs: train vs CV", fontweight="bold")
    axes[2].legend(fontsize=8)
    axes[2].tick_params(axis="x", rotation=45)
    save_figure("02_search_results.png")

    best_params = search.best_params_.copy()
    final_model = build_model(**best_params)
    if LIGHTGBM_AVAILABLE:
        final_model.fit(
            X_train,
            y_train,
            eval_set=[(X_val, y_val)],
            eval_metric="rmse",
        )
    else:
        final_model.fit(X_train, y_train)

    y_train_pred = inverse_transform(final_model.predict(X_train))
    y_val_pred = inverse_transform(final_model.predict(X_val))
    y_test_pred = inverse_transform(final_model.predict(X_test))

    train_metrics = evaluate_predictions(y_train_raw.values, y_train_pred)
    val_metrics = evaluate_predictions(y_val_raw.values, y_val_pred)
    test_metrics = evaluate_predictions(y_test_raw.values, y_test_pred)

    print_metrics("Final train metrics", train_metrics)
    print_metrics("Final validation metrics", val_metrics)
    print_metrics("Final test metrics", test_metrics)

    fig, axes = plt.subplots(1, 3, figsize=(20, 6))
    for idx, (name, y_true, y_pred, metrics) in enumerate(
        [
            ("TRAIN", y_train_raw.values, y_train_pred, train_metrics),
            ("VALIDATION", y_val_raw.values, y_val_pred, val_metrics),
            ("TEST", y_test_raw.values, y_test_pred, test_metrics),
        ]
    ):
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

    residuals = y_test_raw.values - y_test_pred
    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    axes[0].hist(residuals, bins=50, color="#FF9800", edgecolor="white", alpha=0.8)
    axes[0].axvline(0, color="red", linewidth=2, linestyle="--")
    axes[0].set_title(f"Residual distribution\nMean: {residuals.mean():.3f}m | Std: {residuals.std():.3f}m", fontweight="bold")
    axes[0].set_xlabel("Residual (m)")
    axes[0].set_ylabel("Frequency")
    axes[1].scatter(y_test_pred, residuals, alpha=0.15, s=5, c="#9C27B0")
    axes[1].axhline(0, color="red", linewidth=2, linestyle="--")
    axes[1].set_title("Residuals vs Predicted", fontweight="bold")
    axes[1].set_xlabel("Predicted Depth (m)")
    axes[1].set_ylabel("Residual (m)")
    stats.probplot(residuals, dist="norm", plot=axes[2])
    axes[2].set_title("Q-Q Plot", fontweight="bold")
    save_figure("04_residual_analysis.png")

    if "district_encoded" in df.columns:
        test_df = df.loc[X_test.index].copy().reset_index(drop=True)
        test_df["predicted"] = y_test_pred
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

    importance_df = get_feature_importance(final_model, feature_cols, X_train, y_train)
    print("\nTop 10 features by importance:")
    print(importance_df.head(10).to_string(index=False, float_format=lambda x: f"{x:.4f}"))
    fig, ax = plt.subplots(figsize=(10, 8))
    top_imp = importance_df.head(min(15, len(importance_df)))
    ax.barh(top_imp["feature"][::-1], top_imp["importance"][::-1], color="#E91E63")
    ax.set_title("LightGBM Feature Importance", fontweight="bold")
    ax.set_xlabel("Importance")
    save_figure("06_feature_importance.png")

    if SHAP_AVAILABLE and len(X_test) > 0:
        shap_sample_size = min(2000, len(X_test))
        X_shap = X_test.sample(n=shap_sample_size, random_state=RANDOM_STATE)
        shap_explainer = shap.TreeExplainer(final_model)
        shap_values = shap_explainer(X_shap)
        plt.figure(figsize=(12, 10))
        shap.summary_plot(shap_values, X_shap, plot_type="dot", show=False, max_display=20)
        plt.title("SHAP summary", fontweight="bold")
        save_figure("07_shap_summary.png")
    else:
        print("\nSHAP not available; skipping SHAP summary plot.")

    y_true_risk = np.array([classify_risk(v) for v in y_test_raw.values])
    y_pred_risk = np.array([classify_risk(v) for v in y_test_pred])
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

    version_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_hash = hashlib.md5(str(best_params).encode()).hexdigest()[:8]

    model_path = MODEL_DIR / "lgbm_no_lag_best.pkl"
    native_path = MODEL_DIR / "lgbm_no_lag_best.txt"
    config_path = MODEL_DIR / "lgbm_no_lag_config.json"
    metrics_path = MODEL_DIR / "lgbm_no_lag_metrics.json"
    versioned_path = MODEL_DIR / f"lgbm_no_lag_{version_str}_{model_hash}.pkl"

    joblib.dump(final_model, model_path)
    joblib.dump(final_model, versioned_path)
    if LIGHTGBM_AVAILABLE and hasattr(final_model, "booster_"):
        final_model.booster_.save_model(str(native_path))

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
        "lightgbm_available": LIGHTGBM_AVAILABLE,
    }
    with config_path.open("w", encoding="utf-8") as handle:
        json.dump(config, handle, indent=2)

    metrics_payload = {
        "model_version": f"{version_str}_{model_hash}",
        "best_params": best_params,
        "best_cv_r2": float(search.best_score_),
        "final_test": test_metrics,
        "risk_accuracy_pct": risk_accuracy,
        "train_rows": int(len(X_train)),
        "val_rows": int(len(X_val)),
        "test_rows": int(len(X_test)),
        "feature_count": int(len(feature_cols)),
        "trained_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "lightgbm_available": LIGHTGBM_AVAILABLE,
    }
    with metrics_path.open("w", encoding="utf-8") as handle:
        json.dump(metrics_payload, handle, indent=2, default=str)

    print("\nSaved artifacts:")
    for path in [model_path, versioned_path, native_path, config_path, metrics_path]:
        print(f"  {path}")

    print("\nLag-free LightGBM training complete.")


if __name__ == "__main__":
    main()
