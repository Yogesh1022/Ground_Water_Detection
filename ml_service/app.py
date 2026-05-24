from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

try:
    import tensorflow as tf
except Exception:  # pragma: no cover - optional in lightweight environments
    tf = None

try:
    import xgboost as xgb
except Exception:  # pragma: no cover - optional in lightweight environments
    xgb = None

try:
    import lightgbm as lgb
except Exception:  # pragma: no cover - optional in lightweight environments
    lgb = None

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TEMPORAL_MODEL_DIRS = [
    PROJECT_ROOT / "backend" / "models" / "temporal",
    PROJECT_ROOT / "models" / "temporal",
]
ENV_MODEL_DIRS = [
    PROJECT_ROOT / "backend" / "models" / "environmental",
    PROJECT_ROOT / "models" / "environmental",
]
RF_ENV_CANDIDATES = [
    PROJECT_ROOT / "backend" / "outputs" / "random_forest" / "env_engine_rf.pkl",
    PROJECT_ROOT / "outputs" / "random_forest" / "env_engine_rf.pkl",
    PROJECT_ROOT / "backend" / "models" / "environmental" / "env_engine_rf.pkl",
]

TEMPORAL_FEATURES = [
    "rainfall_mm",
    "temperature_c",
    "humidity_pct",
    "ndvi",
    "month",
    "year",
    "season_encoded",
    "latitude",
    "longitude",
    "rainfall_lag_1m",
    "rainfall_lag_2m",
    "rainfall_lag_3m",
    "rainfall_rolling_3m",
    "rainfall_rolling_6m",
    "rainfall_deficit",
    "cumulative_deficit",
    "temp_rainfall_ratio",
    "soil_moisture_index",
    "evapotranspiration",
    "soil_type_encoded",
    "elevation_m",
    "slope_degree",
    "district_encoded",
    "depth_lag_1q",
    "depth_lag_2q",
    "depth_change_rate",
    "depth_mbgl",
    "rainfall_x_soilmoist",
]

ENV_FEATURES = [
    "rainfall_mm",
    "temperature_avg",
    "humidity",
    "evapotranspiration",
    "soil_moisture_index",
    "soil_type_encoded",
    "rainfall_rolling_3m",
    "rainfall_rolling_6m",
    "rainfall_deficit",
    "cumulative_deficit",
    "temp_rainfall_ratio",
    "month",
    "season_encoded",
    "latitude",
    "longitude",
    "elevation_m",
    "slope_degree",
    "district_encoded",
    "ndvi",
    "rainfall_x_soilmoist",
]

DEFAULT_WEIGHTS = {
    "temporal": {
        "xgboost": 0.60,
        "lstm": 0.40,
        "random_forest": 0.25,
    },
    "environmental": {
        "xgboost": 0.40,
        "lgbm": 0.34,
        "random_forest": 0.26,
    },
}


class PredictRequest(BaseModel):
    prediction_path: str = Field(default="ENVIRONMENTAL_ONLY")
    latitude: float
    longitude: float
    rainfall_mm: float = 0.0
    temperature_c: float = 0.0
    humidity_pct: float = 0.0
    ndvi: float = 0.0
    month: int = 0
    year: int = 0
    feature_vector: Dict[str, float] = Field(default_factory=dict)
    nearest_wells: List[Dict[str, Any]] = Field(default_factory=list)


class MonthForecast(BaseModel):
    month_offset: int
    label: str
    depth_mbgl: float
    risk_level: str
    confidence: float


class PredictResponse(BaseModel):
    depth_mbgl: float
    risk_level: str
    confidence_pct: float
    prediction_path: str
    xgboost_depth: float = 0.0
    lstm_depth: float = 0.0
    random_forest_depth: float = 0.0
    nearest_wells: List[Dict[str, Any]] = Field(default_factory=list)
    multi_month_forecast: List[MonthForecast] = Field(default_factory=list)
    recommendation: str = ""
    actionable_advice: List[str] = Field(default_factory=list)
    model_breakdown: Dict[str, float] = Field(default_factory=dict)
    ensemble_weights: Dict[str, float] = Field(default_factory=dict)


@dataclass
class LoadedModel:
    name: str
    model: Any
    feature_names: List[str]
    mode: str
    transform: str = "identity"


class ModelRegistry:
    def __init__(self, project_root: Path) -> None:
        self.project_root = project_root
        self.models: Dict[str, Dict[str, LoadedModel]] = {
            "temporal": {},
            "environmental": {},
        }
        self.load_models()

    def load_models(self) -> None:
        self._load_temporal_models()
        self._load_environmental_models()

    def _first_existing(self, candidates: List[Path]) -> Optional[Path]:
        for candidate in candidates:
            if candidate.exists():
                return candidate
        return None

    def _load_temporal_models(self) -> None:
        temporal_dir = self._first_existing(TEMPORAL_MODEL_DIRS)
        if temporal_dir is None:
            return

        xgb_path = temporal_dir / "xgboost_best.pkl"
        if xgb_path.exists():
            try:
                self.models["temporal"]["xgboost"] = LoadedModel(
                    name="xgboost",
                    model=joblib.load(xgb_path),
                    feature_names=TEMPORAL_FEATURES,
                    mode="tabular",
                )
            except Exception:
                pass

        rf_path = temporal_dir / "random_forest_model.pkl"
        if rf_path.exists():
            try:
                self.models["temporal"]["random_forest"] = LoadedModel(
                    name="random_forest",
                    model=joblib.load(rf_path),
                    feature_names=TEMPORAL_FEATURES,
                    mode="tabular",
                )
            except Exception:
                pass

        lstm_path = temporal_dir / "lstm_best.keras"
        if tf is not None and lstm_path.exists():
            try:
                self.models["temporal"]["lstm"] = LoadedModel(
                    name="lstm",
                    model=tf.keras.models.load_model(lstm_path, compile=False),
                    feature_names=TEMPORAL_FEATURES,
                    mode="sequence",
                )
            except Exception:
                pass

    def _load_environmental_models(self) -> None:
        env_dir = self._first_existing(ENV_MODEL_DIRS)
        if env_dir is None:
            return

        xgb_path = env_dir / "xgboost_no_lag_best.json"
        if xgb is not None and xgb_path.exists():
            try:
                model = xgb.XGBRegressor()
                model.load_model(str(xgb_path))
                self.models["environmental"]["xgboost"] = LoadedModel(
                    name="xgboost",
                    model=model,
                    feature_names=ENV_FEATURES,
                    mode="tabular",
                    transform="expm1",
                )
            except Exception:
                pass

        lgbm_path = env_dir / "lgbm_no_lag_best.pkl"
        if lgbm_path.exists():
            try:
                self.models["environmental"]["lgbm"] = LoadedModel(
                    name="lgbm",
                    model=joblib.load(lgbm_path),
                    feature_names=ENV_FEATURES,
                    mode="tabular",
                    transform="expm1",
                )
            except Exception:
                pass

        rf_path = self._first_existing(RF_ENV_CANDIDATES)
        if rf_path is not None:
            try:
                self.models["environmental"]["random_forest"] = LoadedModel(
                    name="random_forest",
                    model=joblib.load(rf_path),
                    feature_names=ENV_FEATURES,
                    mode="tabular",
                    transform="identity",
                )
            except Exception:
                pass

    def members_for_path(self, prediction_path: str) -> Dict[str, LoadedModel]:
        path = prediction_path.upper()
        if "TEMPORAL" in path or "EXACT_WELL" in path or "PATH_1" in path or "PATH1" in path:
            return self.models["temporal"]
        if "KNN_IDW" in path or "PATH_2" in path or "PATH2" in path:
            return self.models["temporal"]
        return self.models["environmental"]


registry = ModelRegistry(PROJECT_ROOT)
app = FastAPI(title="Groundwater Prediction Service", version="1.0.0")


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "temporal_models": list(registry.models["temporal"].keys()),
        "environmental_models": list(registry.models["environmental"].keys()),
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    members = registry.members_for_path(req.prediction_path)
    if not members:
        raise HTTPException(status_code=503, detail="No model artifacts available for prediction")

    feature_map = dict(req.feature_vector or {})
    feature_map.setdefault("latitude", req.latitude)
    feature_map.setdefault("longitude", req.longitude)
    feature_map.setdefault("rainfall_mm", req.rainfall_mm)
    feature_map.setdefault("temperature_c", req.temperature_c)
    feature_map.setdefault("temperature_avg", req.temperature_c)
    feature_map.setdefault("humidity_pct", req.humidity_pct)
    feature_map.setdefault("humidity", req.humidity_pct)
    feature_map.setdefault("ndvi", req.ndvi)
    feature_map.setdefault("month", float(req.month))
    feature_map.setdefault("year", float(req.year))
    feature_map.setdefault("season_encoded", float(season_encoded(req.month)))

    member_predictions: Dict[str, float] = {}
    for name, member in members.items():
        try:
            prediction = predict_member(member, feature_map)
            member_predictions[name] = float(prediction)
        except Exception:
            continue

    if not member_predictions:
        raise HTTPException(status_code=503, detail="All loaded models failed to predict")

    weights = normalize_weights(DEFAULT_WEIGHTS["temporal"] if members is registry.models["temporal"] else DEFAULT_WEIGHTS["environmental"], member_predictions.keys())
    final_depth = sum(weights[name] * member_predictions[name] for name in member_predictions)
    final_depth = max(0.0, float(final_depth))

    response = PredictResponse(
        depth_mbgl=round(final_depth, 2),
        risk_level=risk_from_depth(final_depth),
        confidence_pct=confidence_from_members(member_predictions),
        prediction_path=req.prediction_path or "ENVIRONMENTAL_ONLY",
        nearest_wells=req.nearest_wells,
        multi_month_forecast=build_forecast(final_depth),
        recommendation=recommendation_from_risk(final_depth),
        actionable_advice=advice_from_risk(final_depth),
        model_breakdown={name: round(value, 2) for name, value in member_predictions.items()},
        ensemble_weights={name: round(value, 4) for name, value in weights.items()},
    )

    response.xgboost_depth = round(member_predictions.get("xgboost", final_depth), 2)
    response.lstm_depth = round(member_predictions.get("lstm", final_depth), 2)
    response.random_forest_depth = round(member_predictions.get("random_forest", final_depth), 2)
    return response


def predict_member(member: LoadedModel, feature_map: Dict[str, float]) -> float:
    if member.mode == "sequence":
        X = sequence_input(feature_map, member.feature_names)
    else:
        X = tabular_input(feature_map, member.feature_names)

    raw_pred = member.model.predict(X)
    value = flatten_prediction(raw_pred)
    if member.transform == "expm1":
        value = float(np.expm1(value))
    return float(value)


def tabular_input(feature_map: Dict[str, float], feature_names: List[str]) -> pd.DataFrame:
    row = {name: float(feature_map.get(name, 0.0)) for name in feature_names}
    return pd.DataFrame([row], columns=feature_names)


def sequence_input(feature_map: Dict[str, float], feature_names: List[str], timesteps: int = 12) -> np.ndarray:
    row = np.array([float(feature_map.get(name, 0.0)) for name in feature_names], dtype=np.float32)
    sequence = np.repeat(row[np.newaxis, :], timesteps, axis=0)
    return sequence[np.newaxis, :, :]


def flatten_prediction(raw_pred: Any) -> float:
    array = np.asarray(raw_pred).reshape(-1)
    if array.size == 0:
        return 0.0
    return float(array[0])


def normalize_weights(base_weights: Dict[str, float], available_names: Any) -> Dict[str, float]:
    available = {name: float(base_weights.get(name, 0.0)) for name in available_names}
    total = sum(available.values())
    if total <= 0:
        count = max(len(available), 1)
        return {name: 1.0 / count for name in available}
    return {name: weight / total for name, weight in available.items()}


def confidence_from_members(member_predictions: Dict[str, float]) -> float:
    if len(member_predictions) >= 3:
        return 82.0
    if len(member_predictions) == 2:
        return 78.0
    return 72.0


def risk_from_depth(depth_mbgl: float) -> str:
    if depth_mbgl > 65:
        return "DANGER"
    if depth_mbgl > 50:
        return "WARNING"
    if depth_mbgl > 35:
        return "MODERATE"
    return "SAFE"


def recommendation_from_risk(depth_mbgl: float) -> str:
    risk = risk_from_depth(depth_mbgl)
    if risk == "DANGER":
        return "Immediate water conservation and tanker planning required"
    if risk == "WARNING":
        return "Start storing water and reduce discretionary use"
    if risk == "MODERATE":
        return "Monitor trends and plan irrigation carefully"
    return "Water status is stable"


def advice_from_risk(depth_mbgl: float) -> List[str]:
    risk = risk_from_depth(depth_mbgl)
    if risk == "DANGER":
        return ["Avoid water-intensive crops", "Prepare tanker schedule", "Inspect storage tanks"]
    if risk == "WARNING":
        return ["Store extra water", "Use drip irrigation", "Monitor weekly updates"]
    if risk == "MODERATE":
        return ["Track monthly changes", "Optimize irrigation timing"]
    return ["Continue normal usage", "Review the next seasonal forecast"]


def build_forecast(depth_mbgl: float) -> List[MonthForecast]:
    forecast: List[MonthForecast] = []
    for index, month_label in enumerate(["1 Month", "2 Months", "3 Months"], start=1):
        value = depth_mbgl + (index * 1.5)
        forecast.append(
            MonthForecast(
                month_offset=index,
                label=month_label,
                depth_mbgl=round(value, 2),
                risk_level=risk_from_depth(value),
                confidence=round(max(0.6, 0.9 - (index * 0.05)), 2),
            )
        )
    return forecast


def season_encoded(month: int) -> int:
    if month in (12, 1, 2):
        return 0
    if month in (3, 4, 5):
        return 1
    if month in (6, 7, 8):
        return 2
    return 3


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
