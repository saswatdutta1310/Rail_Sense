"""
Delay Prediction Model Training

Trains XGBoost model for predicting train delays using engineered features.

Model Architecture:
- Input: 30+ engineered features
- Algorithm: XGBoost regressor
- Optimization: Grid search with CV
- Output: Predicted delay in minutes + confidence score

Performance Target:
- MAE < 5 minutes
- RMSE < 8 minutes
- R² > 0.75
"""

import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import json
from pathlib import Path
from typing import Dict, Tuple
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DelayPredictionModel:
    """XGBoost model for train delay prediction"""
    
    def __init__(self, model_dir: str = "models"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        
        self.model = None
        self.scaler = None
        self.feature_names = None
        self.metadata = {}
    
    def load_training_data(self, csv_path: str) -> Tuple[pd.DataFrame, np.ndarray]:
        """Load and prepare training data"""
        logger.info(f"Loading training data from: {csv_path}")
        df = pd.read_csv(csv_path)
        
        # Extract features and target
        feature_cols = [col for col in df.columns if col not in 
                       ["timestamp", "train_type", "station_code", "actual_delay_min", "confidence_baseline"]]
        
        X = df[feature_cols].values
        y = df["actual_delay_min"].values
        
        self.feature_names = feature_cols
        
        logger.info(f"✅ Loaded {len(df)} samples with {X.shape[1]} features")
        logger.info(f"Target distribution: μ={y.mean():.2f}, σ={y.std():.2f}, min={y.min():.2f}, max={y.max():.2f}")
        
        return df, X, y
    
    def prepare_data(self, X: np.ndarray, y: np.ndarray, test_size: float = 0.2) -> Dict:
        """Prepare and split data for training"""
        logger.info(f"Preparing data split (test_size={test_size})")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )
        
        # Normalize features
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        logger.info(f"✅ Train set: {X_train_scaled.shape[0]} samples")
        logger.info(f"✅ Test set: {X_test_scaled.shape[0]} samples")
        
        return {
            "X_train": X_train_scaled,
            "X_test": X_test_scaled,
            "y_train": y_train,
            "y_test": y_test,
        }
    
    def train(self, X_train: np.ndarray, y_train: np.ndarray) -> None:
        """Train XGBoost model with optimized hyperparameters"""
        logger.info("Training XGBoost model...")
        
        # Base model parameters (optimized for delay prediction)
        base_params = {
            "objective": "reg:squarederror",
            "learning_rate": 0.05,
            "max_depth": 6,
            "min_child_weight": 1,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "gamma": 0,
            "random_state": 42,
            "n_jobs": -1,
        }
        
        # Create base model
        base_model = xgb.XGBRegressor(**base_params, n_estimators=200)
        
        # Grid search for hyperparameter optimization
        param_grid = {
            "max_depth": [5, 6, 7],
            "learning_rate": [0.01, 0.05, 0.1],
            "n_estimators": [100, 200, 300],
            "subsample": [0.7, 0.8, 0.9],
        }
        
        logger.info("Running grid search (may take 1-2 minutes)...")
        grid_search = GridSearchCV(
            base_model,
            param_grid,
            cv=5,
            scoring="neg_mean_squared_error",
            n_jobs=-1,
            verbose=1
        )
        
        grid_search.fit(X_train, y_train)
        
        self.model = grid_search.best_estimator_
        
        logger.info(f"✅ Best parameters: {grid_search.best_params_}")
        logger.info(f"✅ Best CV score: {grid_search.best_score_:.4f}")
        
        # Store metadata
        self.metadata["best_params"] = grid_search.best_params_
        self.metadata["best_cv_score"] = float(grid_search.best_score_)
        self.metadata["training_samples"] = len(X_train)
    
    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict:
        """Evaluate model on test set"""
        logger.info("Evaluating model on test set...")
        
        y_pred = self.model.predict(X_test)
        
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        
        logger.info(f"✅ MAE: {mae:.2f} minutes")
        logger.info(f"✅ RMSE: {rmse:.2f} minutes")
        logger.info(f"✅ R² Score: {r2:.4f}")
        
        metrics = {
            "mae": float(mae),
            "rmse": float(rmse),
            "r2": float(r2),
            "test_samples": len(y_test),
        }
        
        self.metadata.update(metrics)
        
        return metrics
    
    def get_feature_importance(self, top_n: int = 15) -> Dict[str, float]:
        """Get top feature importances"""
        if self.model is None:
            raise ValueError("Model not trained yet")
        
        importances = self.model.feature_importances_
        feature_importance_dict = dict(zip(self.feature_names, importances))
        
        # Sort and get top N
        top_features = sorted(feature_importance_dict.items(), key=lambda x: x[1], reverse=True)[:top_n]
        
        logger.info(f"\n📊 Top {top_n} Features:")
        for feature, importance in top_features:
            logger.info(f"  {feature}: {importance:.4f}")
        
        return dict(top_features)
    
    def predict(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Predict delays with confidence scores
        
        Returns:
            predictions: Predicted delays in minutes
            confidence: Confidence scores (0-1)
        """
        if self.model is None:
            raise ValueError("Model not trained yet")
        
        # Normalize input
        X_scaled = self.scaler.transform(X)
        
        # Get predictions
        predictions = self.model.predict(X_scaled)
        
        # Calculate confidence based on prediction uncertainty
        # Use tree variance as proxy for confidence
        predictions_std = np.std([tree.predict(X_scaled) for tree in self.model.estimators_], axis=0)
        
        # Convert std to confidence (lower std = higher confidence)
        confidence = 1.0 / (1.0 + predictions_std / predictions.std())
        confidence = np.clip(confidence, 0.5, 1.0)  # Clamp to 0.5-1.0
        
        return predictions, confidence
    
    def save(self, model_name: str = "delay_model_v1") -> None:
        """Save trained model and metadata"""
        if self.model is None:
            raise ValueError("No model to save")
        
        model_path = self.model_dir / f"{model_name}.pkl"
        scaler_path = self.model_dir / f"{model_name}_scaler.pkl"
        metadata_path = self.model_dir / f"{model_name}_metadata.json"
        
        # Save model and scaler
        joblib.dump(self.model, model_path)
        joblib.dump(self.scaler, scaler_path)
        
        # Save metadata with feature names
        metadata = self.metadata.copy()
        metadata["feature_names"] = self.feature_names
        metadata["model_version"] = model_name
        metadata["training_timestamp"] = pd.Timestamp.now().isoformat()
        
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"✅ Model saved to: {model_path}")
        logger.info(f"✅ Metadata saved to: {metadata_path}")
    
    def load(self, model_name: str = "delay_model_v1") -> None:
        """Load trained model and metadata"""
        model_path = self.model_dir / f"{model_name}.pkl"
        scaler_path = self.model_dir / f"{model_name}_scaler.pkl"
        metadata_path = self.model_dir / f"{model_name}_metadata.json"
        
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        
        with open(metadata_path, "r") as f:
            self.metadata = json.load(f)
        
        self.feature_names = self.metadata.get("feature_names")
        
        logger.info(f"✅ Model loaded from: {model_path}")


def train_delay_prediction_model(
    training_data_path: str = "data/delay_training.csv",
    model_name: str = "delay_model_v1"
) -> DelayPredictionModel:
    """
    Complete training pipeline for delay prediction model
    
    Steps:
    1. Load synthetic training data
    2. Prepare train/test split
    3. Train XGBoost model with hyperparameter tuning
    4. Evaluate on test set
    5. Save model and metadata
    """
    logger.info("=" * 60)
    logger.info("DELAY PREDICTION MODEL TRAINING PIPELINE")
    logger.info("=" * 60)
    
    # Initialize model
    model = DelayPredictionModel()
    
    # Load data
    df, X, y = model.load_training_data(training_data_path)
    
    # Prepare data
    data = model.prepare_data(X, y)
    
    # Train model
    model.train(data["X_train"], data["y_train"])
    
    # Evaluate
    metrics = model.evaluate(data["X_test"], data["y_test"])
    
    # Feature importance
    feature_importance = model.get_feature_importance()
    
    # Save model
    model.save(model_name)
    
    logger.info("=" * 60)
    logger.info("✅ TRAINING COMPLETE")
    logger.info("=" * 60)
    
    return model


if __name__ == "__main__":
    # Train model
    model = train_delay_prediction_model(
        training_data_path="ml/data/delay_training.csv",
        model_name="delay_model_v1"
    )
    
    # Example prediction
    logger.info("\n" + "=" * 60)
    logger.info("EXAMPLE PREDICTION")
    logger.info("=" * 60)
    
    # Create dummy sample
    n_features = len(model.feature_names)
    sample = np.random.randn(1, n_features)
    
    pred, conf = model.predict(sample)
    logger.info(f"Predicted delay: {pred[0]:.1f} minutes")
    logger.info(f"Confidence: {conf[0]:.1%}")
    delay = base_delay + (fog_index * 40) + (rainfall * 0.5)
    
    # Add signal delays
    delay += np.where(signal_status == 1, 25, 0)
    delay += np.where(signal_status == 2, 60, 0)
    
    # Add some non-linear noise
    delay += np.random.normal(0, 10, num_samples)
    delay = np.maximum(0, delay).astype(int)
    
    df = pd.DataFrame({
        'fog_index': fog_index,
        'rainfall': rainfall,
        'signal_status': signal_status,
        'delay_min': delay
    })
    
    return df

def train_model():
    print("Generating synthetic dataset...")
    df = create_synthetic_data()
    
    X = df[['fog_index', 'rainfall', 'signal_status']]
    y = df['delay_min']
    
    print("Training XGBoost Regressor...")
    model = xgb.XGBRegressor(n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42)
    model.fit(X, y)
    
    output_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(output_dir, 'delay_model.pkl')
    
    joblib.dump(model, model_path)
    print(f"Model saved successfully to {model_path}")
    
    # Test a prediction
    sample = pd.DataFrame({'fog_index': [0.8], 'rainfall': [60], 'signal_status': [0]})
    pred = model.predict(sample)[0]
    print(f"Sample prediction (Fog=0.8, Rain=60, Signal=Normal): {pred:.1f} mins")

if __name__ == "__main__":
    train_model()
