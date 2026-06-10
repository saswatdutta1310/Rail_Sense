import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

def create_synthetic_vision_data(num_samples=5000):
    np.random.seed(42)
    
    # Simulate features extracted from an image by a CV pre-processor
    # bounding box count, average contrast, edge density
    bbox_count = np.random.randint(0, 50, num_samples)
    contrast_score = np.random.uniform(0.1, 1.0, num_samples)
    edge_density = np.random.uniform(0.01, 0.5, num_samples)
    
    # Priority classes: 0 (Low), 1 (Medium), 2 (High), 3 (Critical)
    # Rules: High bbox count and high edge density usually means more defects/issues
    risk = (bbox_count / 50) * 0.5 + (edge_density / 0.5) * 0.5
    
    # Add noise
    risk += np.random.normal(0, 0.1, num_samples)
    
    labels = []
    for r in risk:
        if r < 0.3:
            labels.append(0) # Low
        elif r < 0.6:
            labels.append(1) # Medium
        elif r < 0.8:
            labels.append(2) # High
        else:
            labels.append(3) # Critical
            
    df = pd.DataFrame({
        'bbox_count': bbox_count,
        'contrast_score': contrast_score,
        'edge_density': edge_density,
        'priority_class': labels
    })
    
    return df

def train_model():
    print("Generating synthetic vision dataset...")
    df = create_synthetic_vision_data()
    
    X = df[['bbox_count', 'contrast_score', 'edge_density']]
    y = df['priority_class']
    
    print("Training RandomForest Classifier...")
    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X, y)
    
    output_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(output_dir, 'vision_classifier.pkl')
    
    joblib.dump(model, model_path)
    print(f"Model saved successfully to {model_path}")

if __name__ == "__main__":
    train_model()
