"""Lag-free XGBoost training script for groundwater depth prediction.

This version keeps the same overall workflow as the deep-dive notebook, but it
removes all lag-based features and the derived leakage feature so the model
learns from weather, soil, temporal, geospatial, and vegetation inputs only.
"""

from __future__ import annotations

import hashlib
import json
import os
import time
import warnings
from dataclasses import dataclass
from datetime import datetime

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import xgboost as xgb
from scipy import stats
from sklearn.feature_selection import mutual_info_regression
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import RandomizedSearchCV, TimeSeriesSplit

try:
    import shap

    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False


DATA_PATH = os.path.join("..", "data", "vidarbha_groundwater_extended_v2.csv")
MODEL_DIR = os.path.join("..", "saved_models")
OUTPUT_DIR = os.path.join("..", "outputs", "xgboost_no_lag")
TARGET = "depth_mbgl"

DROP_COLS = ["well_id", "date", "district", "year"]
LAG_PATTERNS = ("lag", "depth_change")

FEATURE_GROUPS = {
    "Meteorological": ["rainfall_mm", "temperature_avg", "humidity", "evapotranspiration"],
    "Soil": ["soil_moisture_index", "soil_type_encoded"],
    "Rolling Averages": ["rainfall_rolling_3m", "rainfall_rolling_6m"],
    "Stress Indicators": ["rainfall_deficit", "cumulative_deficit", "temp_rainfall_ratio"],
    "Temporal": ["month", "season_encoded"],
    "Geospatial": ["latitude", "longitude", "elevation_m", "slope_degree", "district_encoded"],
    "Vegetation": ["ndvi"],
    "Engineered": ["rainfall_x_soilmoist"],
}


@dataclass
class Metrics:
    r2: float
    rmse: float
    mae: float
    mdape: float


def ensure_dirs() -> None:
    os.makedirs(MODEL_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)


def load_data() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH, parse_dates=["date"])
    df["rainfall_x_soilmoist"] = df["rainfall_mm"] * df["soil_moisture_index"]
    return df


def build_feature_columns(df: pd.DataFrame) -> list[str]:
    excluded = set(DROP_COLS + [TARGET])
    lag_cols = [col for col in df.columns if any(pattern in col.lower() for pattern in LAG_PATTERNS)]
    excluded.update(lag_cols)
    return [col for col in df.columns if col not in excluded]


def time_split(df: pd.DataFrame, features: pd.DataFrame, target_log: pd.Series):
    train_mask = df["date"].dt.year <= 2023
    val_mask = df["date"].dt.year == 2024
    test_mask = df["date"].dt.year == 2025

    x_train, x_val, x_test = features[train_mask].copy(), features[val_mask].copy(), features[test_mask].copy()
    y_train, y_val, y_test = target_log[train_mask].copy(), target_log[val_mask].copy(), target_log[test_mask].copy()
    y_train_raw = df.loc[train_mask, TARGET].copy()
    y_val_raw = df.loc[val_mask, TARGET].copy()
    y_test_raw = df.loc[test_mask, TARGET].copy()

    train_medians = x_train.median()
    for split_name, split_frame in (("Train", x_train), ("Val", x_val), ("Test", x_test)):
        split_frame.replace([np.inf, -np.inf], np.nan, inplace=True)
        if split_frame.isnull().any().any():
            split_frame.fillna(train_medians, inplace=True)
        print(f"{split_name}: {split_frame.shape[0]:,} rows")

    return x_train, x_val, x_test, y_train, y_val, y_test, y_train_raw, y_val_raw, y_test_raw


def evaluate(y_true_raw: np.ndarray, y_pred_raw: np.ndarray) -> Metrics:
    r2 = r2_score(y_true_raw, y_pred_raw)
    rmse = float(np.sqrt(mean_squared_error(y_true_raw, y_pred_raw)))
    mae = float(mean_absolute_error(y_true_raw, y_pred_raw))
    ape = np.abs((y_true_raw - y_pred_raw) / np.clip(y_true_raw, 1.0, None)) * 100.0
    mdape = float(np.median(ape))
    return Metrics(r2=r2, rmse=rmse, mae=mae, mdape=mdape)


def print_metrics(name: str, metrics: Metrics) -> None:
    print(f"\n{name}")
    print(f"  R²:    {metrics.r2:.4f}")
    print(f"  RMSE:  {metrics.rmse:.4f} m")
    print(f"  MAE:   {metrics.mae:.4f} m")
    print(f"  MdAPE: {metrics.mdape:.2f}%")


def save_plot(path: str) -> None:
    plt.tight_layout()
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()


def train_baseline(x_train, y_train, x_val, y_val):
    model = xgb.XGBRegressor(
        n_estimators=500,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        n_jobs=-1,
        tree_method="hist",
        eval_metric="rmse",
        early_stopping_rounds=50,
    )
    model.fit(x_train, y_train, eval_set=[(x_train, y_train), (x_val, y_val)], verbose=100)
    return model


def tune_model(x_train, y_train):
    param_distributions = {
        "n_estimators": [300, 500, 800, 1000],
        "max_depth": [4, 5, 6, 7, 8],
        "learning_rate": [0.01, 0.05, 0.1, 0.15, 0.2],
        "subsample": [0.6, 0.7, 0.8, 0.9],
        "colsample_bytree": [0.6, 0.7, 0.8, 0.9],
        "min_child_weight": [1, 3, 5, 7, 10],
        "reg_alpha": [0.0, 0.01, 0.1, 0.5, 1.0],
        "reg_lambda": [0.5, 1.0, 1.5, 2.0],
        "gamma": [0, 0.1, 0.2, 0.5],
    }

    search = RandomizedSearchCV(
        estimator=xgb.XGBRegressor(random_state=42, n_jobs=-1, tree_method="hist", eval_metric="rmse"),
        param_distributions=param_distributions,
        n_iter=40,
        cv=TimeSeriesSplit(n_splits=5),
        scoring="r2",
        n_jobs=-1,
        verbose=1,
        return_train_score=True,
        random_state=42,
    )
    search.fit(x_train, y_train)
    return search


def inverse_and_clip(pred_log: np.ndarray) -> np.ndarray:
    return np.clip(np.expm1(pred_log), 0, None)


def classify_risk(depth: float) -> str:
    if depth < 30:
        return "SAFE"
    if depth < 100:
        return "WARNING"
    if depth < 200:
        return "CRITICAL"
    return "EXTREME"


def main() -> None:
    warnings.filterwarnings("ignore")
    plt.style.use("seaborn-v0_8-whitegrid")
    sns.set_palette("viridis")

    ensure_dirs()
    df = load_data()
    feature_cols = build_feature_columns(df)

    print("=" * 72)
    print("XGBoost lag-free training run")
    print("=" * 72)
    print(f"Rows: {df.shape[0]:,} | Columns: {df.shape[1]}")
    print(f"Target: {TARGET}")
    print(f"Features used: {len(feature_cols)}")

    print("\nLag-free feature groups:")
    for group, columns in FEATURE_GROUPS.items():
        present = [column for column in columns if column in feature_cols]
        print(f"  {group:20s}: {present}")

    x = df[feature_cols].copy()
    y_raw = df[TARGET].copy()
    y = np.log1p(y_raw)

    x_train, x_val, x_test, y_train, y_val, y_test, y_train_raw, y_val_raw, y_test_raw = time_split(df, x, y)

    correlations = x_train.assign(depth_mbgl=y_train).corr(numeric_only=True)[TARGET].drop(TARGET).sort_values()
    mi_scores = mutual_info_regression(x_train, y_train, random_state=42, n_neighbors=5)
    mi_series = pd.Series(mi_scores, index=x_train.columns).sort_values(ascending=False)

    print("\nTop 5 features by mutual information:")
    for feature, score in mi_series.head(5).items():
        print(f"  {feature:25s} {score:.4f}")

    print("\nTop 5 Pearson correlations with target:")
    for feature, score in correlations.tail(5).sort_values(ascending=False).items():
        print(f"  {feature:25s} {score:+.4f}")

    baseline = train_baseline(x_train, y_train, x_val, y_val)
    baseline_test = evaluate(y_test_raw.values, inverse_and_clip(baseline.predict(x_test)))
    print_metrics("Baseline test metrics", baseline_test)

    print("\nStarting randomized hyperparameter search...")
    start = time.time()
    search = tune_model(x_train, y_train)
    elapsed = time.time() - start
    print(f"Search completed in {elapsed / 60:.1f} minutes")
    print(f"Best CV R²: {search.best_score_:.4f}")
    print(f"Best params: {search.best_params_}")

    final_model = xgb.XGBRegressor(
        **search.best_params_,
        random_state=42,
        n_jobs=-1,
        tree_method="hist",
        eval_metric="rmse",
        early_stopping_rounds=50,
    )
    final_model.fit(x_train, y_train, eval_set=[(x_train, y_train), (x_val, y_val)], verbose=100)

    y_train_pred = inverse_and_clip(final_model.predict(x_train))
    y_val_pred = inverse_and_clip(final_model.predict(x_val))
    y_test_pred = inverse_and_clip(final_model.predict(x_test))

    final_train = evaluate(y_train_raw.values, y_train_pred)
    final_val = evaluate(y_val_raw.values, y_val_pred)
    final_test = evaluate(y_test_raw.values, y_test_pred)

    print_metrics("Final train metrics", final_train)
    print_metrics("Final validation metrics", final_val)
    print_metrics("Final test metrics", final_test)

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.scatter(y_test_raw.values, y_test_pred, alpha=0.15, s=6, c="#2196F3")
    min_val = min(y_test_raw.min(), y_test_pred.min())
    max_val = max(y_test_raw.max(), y_test_pred.max())
    ax.plot([min_val, max_val], [min_val, max_val], "r--", linewidth=2)
    ax.set_title(f"Lag-free XGBoost: Predicted vs Actual | R²={final_test.r2:.4f}", fontweight="bold")
    ax.set_xlabel("Actual depth (m)")
    ax.set_ylabel("Predicted depth (m)")
    save_plot(os.path.join(OUTPUT_DIR, "predicted_vs_actual.png"))

    residuals = y_test_raw.values - y_test_pred
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    axes[0].hist(residuals, bins=50, color="#FF9800", edgecolor="white", alpha=0.8)
    axes[0].set_title("Residual distribution")
    axes[0].set_xlabel("Residual (m)")
    axes[0].set_ylabel("Frequency")
    stats.probplot(residuals, dist="norm", plot=axes[1])
    axes[1].set_title("Q-Q plot")
    save_plot(os.path.join(OUTPUT_DIR, "residual_analysis.png"))

    feature_importance = final_model.get_booster().get_score(importance_type="gain")
    ranked_importance = sorted(feature_importance.items(), key=lambda item: item[1], reverse=True)
    print("\nTop 10 gain features:")
    for rank, (feature, gain) in enumerate(ranked_importance[:10], 1):
        print(f"  {rank:2d}. {feature:25s} {gain:,.2f}")

    if SHAP_AVAILABLE:
        sample_size = min(2000, len(x_test))
        x_shap = x_test.sample(n=sample_size, random_state=42)
        explainer = shap.TreeExplainer(final_model)
        explanation = explainer(x_shap)
        shap.summary_plot(explanation.values, x_shap, show=False, max_display=20)
        plt.title("SHAP summary")
        save_plot(os.path.join(OUTPUT_DIR, "shap_summary.png"))

    test_results = pd.DataFrame(
        {
            "actual_depth": y_test_raw.values,
            "predicted_depth": y_test_pred,
            "actual_risk": [classify_risk(v) for v in y_test_raw.values],
            "predicted_risk": [classify_risk(v) for v in y_test_pred],
        }
    )
    print("\nRisk classification report")
    print(classification_report(test_results["actual_risk"], test_results["predicted_risk"], zero_division=0))
    cm = confusion_matrix(test_results["actual_risk"], test_results["predicted_risk"], labels=["SAFE", "WARNING", "CRITICAL", "EXTREME"])
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=["SAFE", "WARNING", "CRITICAL", "EXTREME"],
        yticklabels=["SAFE", "WARNING", "CRITICAL", "EXTREME"],
        ax=ax,
    )
    ax.set_title("Risk classification confusion matrix")
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    save_plot(os.path.join(OUTPUT_DIR, "risk_confusion_matrix.png"))

    version_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_hash = hashlib.md5(str(search.best_params_).encode()).hexdigest()[:8]

    model_path = os.path.join(MODEL_DIR, "xgboost_no_lag_best.pkl")
    native_path = os.path.join(MODEL_DIR, "xgboost_no_lag_best.json")
    config_path = os.path.join(MODEL_DIR, "xgboost_no_lag_config.json")
    metrics_path = os.path.join(MODEL_DIR, "xgboost_no_lag_metrics.json")

    joblib.dump(final_model, model_path)
    final_model.save_model(native_path)

    config = {
        "feature_columns": feature_cols,
        "target_column": TARGET,
        "target_transform": "log1p",
        "inverse_transform": "expm1",
        "excluded_columns": DROP_COLS,
        "excluded_patterns": list(LAG_PATTERNS),
        "feature_groups": FEATURE_GROUPS,
    }
    with open(config_path, "w", encoding="utf-8") as handle:
        json.dump(config, handle, indent=2)

    metrics = {
        "model_version": f"{version_str}_{model_hash}",
        "best_params": search.best_params_,
        "best_cv_r2": float(search.best_score_),
        "baseline_test": baseline_test.__dict__,
        "final_test": final_test.__dict__,
        "train_rows": int(len(x_train)),
        "val_rows": int(len(x_val)),
        "test_rows": int(len(x_test)),
        "feature_count": int(len(feature_cols)),
        "shap_available": SHAP_AVAILABLE,
    }
    with open(metrics_path, "w", encoding="utf-8") as handle:
        json.dump(metrics, handle, indent=2, default=str)

    print("\nSaved artifacts:")
    for path in (model_path, native_path, config_path, metrics_path):
        print(f"  {path}")

    print("\nLag-free XGBoost training complete.")


if __name__ == "__main__":
    main()