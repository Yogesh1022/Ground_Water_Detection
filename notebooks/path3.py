from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd


class Path3Ensemble:
    """
    Path 3 ensemble for environmental-engine predictions.

    This does not train a new model.
    It loads already-trained Path 3 models, gets their predictions,
    converts them to the same output scale, and combines them with weights.
    """

    def __init__(
        self,
        model_dir: str,
        xgboost_file: str = "xgboost_best.pkl",
        lgbm_file: str = "lgbm_no_lag_best.pkl",
        rf_file: str = "env_engine_rf.pkl",
        weights_file: str = "path3_ensemble_config.json",
    ):
        self.model_dir = Path(model_dir)

        self.xgboost_path = self.model_dir / xgboost_file
        self.lgbm_path = self.model_dir / lgbm_file
        self.rf_path = self.model_dir / rf_file
        self.weights_path = self.model_dir / weights_file

        self.models = {}
        self.weights = {
            "xgboost": 0.40,
            "lgbm": 0.34,
            "random_forest": 0.26,
        }

        self.target_transform = {
            "xgboost": "expm1",
            "lgbm": "expm1",
            "random_forest": "identity",
        }

        self._load_models()
        self._load_weights_if_available()

    def _load_models(self):
        if self.xgboost_path.exists():
            self.models["xgboost"] = joblib.load(self.xgboost_path)

        if self.lgbm_path.exists():
            self.models["lgbm"] = joblib.load(self.lgbm_path)

        if self.rf_path.exists():
            self.models["random_forest"] = joblib.load(self.rf_path)

        if not self.models:
            raise FileNotFoundError("No Path 3 model artifacts found.")

    def _load_weights_if_available(self):
        if self.weights_path.exists():
            with open(self.weights_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            if "members" in data:
                loaded_weights = {}
                for member in data["members"]:
                    name = member["name"]
                    weight = float(member["weight"])
                    loaded_weights[name] = weight

                if loaded_weights:
                    self.weights = loaded_weights

    def _inverse_transform(self, values, transform_name):
        values = np.asarray(values).reshape(-1)

        if transform_name == "expm1":
            return np.clip(np.expm1(values), 0, None)

        return np.clip(values, 0, None)

    def _predict_member(self, model_name, X):
        model = self.models[model_name]
        raw_pred = model.predict(X)
        return self._inverse_transform(raw_pred, self.target_transform[model_name])

    def predict(self, X):
        """
        X should contain only Path 3 environmental features.
        No lag features should be included here.
        """
        member_predictions = {}

        for name in self.models:
            member_predictions[name] = self._predict_member(name, X)

        available_weights = {
            name: self.weights.get(name, 0.0)
            for name in member_predictions.keys()
        }

        weight_total = sum(available_weights.values())
        if weight_total <= 0:
            raise ValueError("Ensemble weights must sum to a positive number.")

        normalized_weights = {
            name: weight / weight_total
            for name, weight in available_weights.items()
        }

        ensemble_pred = np.zeros(len(next(iter(member_predictions.values()))))

        for name, preds in member_predictions.items():
            ensemble_pred += normalized_weights[name] * preds

        ensemble_pred = np.clip(ensemble_pred, 0, None)

        return {
            "final_prediction": ensemble_pred,
            "member_predictions": member_predictions,
            "weights": normalized_weights,
        }


def classify_risk(depth_mbgl):
    if depth_mbgl > 65:
        return "DANGER"
    if depth_mbgl > 50:
        return "WARNING"
    if depth_mbgl > 35:
        return "MODERATE"
    return "SAFE"


def build_path3_response(ensemble_output):
    final_depth = float(np.asarray(ensemble_output["final_prediction"])[0])

    return {
        "depth_mbgl": round(final_depth, 2),
        "risk_level": classify_risk(final_depth),
        "confidence_pct": 70.0,
        "prediction_path": "ENVIRONMENTAL_ONLY",
        "model_breakdown": {
            name: float(np.asarray(preds)[0])
            for name, preds in ensemble_output["member_predictions"].items()
        },
        "ensemble_weights": ensemble_output["weights"],
    }


# Example usage
if __name__ == "__main__":
    model_dir = "../saved_models"

    path3_ensemble = Path3Ensemble(model_dir=model_dir)

    # Example input: one row of environmental-only features
    X_input = pd.DataFrame([
        {
            "rainfall_mm": 112.5,
            "temperature_avg": 31.2,
            "humidity": 68.0,
            "evapotranspiration": 4.9,
            "soil_moisture_index": 0.42,
            "ndvi": 0.61,
            "rainfall_lag_1m": 95.0,
            "rainfall_lag_2m": 88.0,
            "rainfall_lag_3m": 76.0,
            "rainfall_rolling_3m": 90.0,
            "rainfall_rolling_6m": 84.0,
            "rainfall_deficit": 12.5,
            "cumulative_deficit": 40.2,
            "temp_rainfall_ratio": 0.278,
            "month": 6,
            "season_encoded": 2,
            "latitude": 20.45,
            "longitude": 78.55,
            "elevation_m": 312.0,
            "slope_degree": 4.8,
            "district_encoded": 3,
        }
    ])

    output = path3_ensemble.predict(X_input)
    response = build_path3_response(output)

    print(response)