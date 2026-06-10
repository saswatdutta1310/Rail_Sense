import pandas as pd
import numpy as np
import xgboost as xgb
import joblib
import os

def create_synthetic_data(num_samples=10000):
    np.random.seed(42)
    
    # Features
    fog_index = np.random.uniform(0.0, 1.0, num_samples)
    rainfall = np.random.uniform(0.0, 150.0, num_samples)
    
    # Categorical: signal_status (0: normal, 1: degraded, 2: failed)
    signal_status = np.random.choice([0, 1, 2], num_samples, p=[0.8, 0.15, 0.05])
    
    # Base delay is ~10 mins
    base_delay = np.random.normal(10, 5, num_samples)
    
    # Rules for delay
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
