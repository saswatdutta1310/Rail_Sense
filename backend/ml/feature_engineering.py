"""
Feature Engineering for Delay Prediction

This module extracts and transforms features from raw railway data
for the delay prediction ML model.

Features:
- Time-based features (hour, day of week, seasonality)
- Train characteristics (type, route distance, frequency)
- Station congestion (historical delays, traffic patterns)
- Weather features (temperature, precipitation, wind)
- Signal status (grid health, maintenance windows)
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import json


class DelayFeatureEngineer:
    """Extract and transform features for delay prediction"""
    
    # Historical delay statistics (baseline for feature scaling)
    TRAIN_TYPE_BASELINE = {
        "Rajdhani": 8,          # minutes
        "Shatabdi": 4,
        "Express": 18,
        "Mail": 25,
        "Passenger": 30,
    }
    
    # Route difficulty mapping
    ROUTE_DIFFICULTY = {
        "mountain": 1.3,        # Mountain routes have more delays
        "plains": 1.0,
        "coastal": 0.9,
        "urban": 1.1,           # Urban areas have congestion
    }
    
    WEATHER_IMPACT = {
        "clear": 0.0,
        "rain": 15,             # +15 min delay
        "fog": 20,
        "snow": 40,
        "cyclone": 60,
    }
    
    def __init__(self):
        """Initialize feature engineer"""
        self.feature_stats = {}
        self.scaler_params = {}
    
    def extract_time_features(self, timestamp: datetime) -> Dict[str, float]:
        """Extract time-based features from timestamp"""
        hour = timestamp.hour
        day_of_week = timestamp.weekday()
        month = timestamp.month
        
        # Create cyclical features for hour (circular nature of 24h)
        hour_sin = np.sin(2 * np.pi * hour / 24)
        hour_cos = np.cos(2 * np.pi * hour / 24)
        
        # Create cyclical features for day (7 days)
        day_sin = np.sin(2 * np.pi * day_of_week / 7)
        day_cos = np.cos(2 * np.pi * day_of_week / 7)
        
        # Rush hour flag (6-10 AM, 5-9 PM)
        is_rush_hour = 1.0 if (6 <= hour <= 10) or (17 <= hour <= 21) else 0.0
        
        # Peak season (March-May: summer holidays, Nov-Dec: year-end)
        is_peak_season = 1.0 if month in [3, 4, 5, 11, 12] else 0.0
        
        return {
            "hour_sin": hour_sin,
            "hour_cos": hour_cos,
            "day_sin": day_sin,
            "day_cos": day_cos,
            "is_rush_hour": is_rush_hour,
            "is_peak_season": is_peak_season,
            "month": month / 12.0,  # Normalize to 0-1
        }
    
    def extract_train_features(self, train_data: Dict) -> Dict[str, float]:
        """Extract train-specific features"""
        train_type = train_data.get("train_type", "Express")
        typical_duration = train_data.get("typical_duration_min", 480)
        
        # Baseline delay for train type
        baseline_delay = self.TRAIN_TYPE_BASELINE.get(train_type, 15)
        
        # Route complexity (longer routes are more complex)
        route_complexity = min(typical_duration / 1440, 1.0)  # Normalize to 0-1
        
        # Train frequency impact (frequent trains have better infra)
        # Assuming 4 major types
        frequency_factor = {
            "Rajdhani": 0.8,    # Frequent, well-maintained
            "Shatabdi": 0.7,
            "Express": 1.0,     # Average
            "Mail": 1.1,        # Less frequent
            "Passenger": 1.2,   # Rare, lower priority
        }
        
        return {
            "baseline_delay": baseline_delay / 60,  # Normalize to 0-1 (scale by 60 min max)
            "route_complexity": route_complexity,
            "frequency_factor": frequency_factor.get(train_type, 1.0),
            "is_premium": 1.0 if train_type in ["Rajdhani", "Shatabdi"] else 0.0,
        }
    
    def extract_station_features(self, station_data: Dict, historical_delays: List[float]) -> Dict[str, float]:
        """Extract station congestion and infrastructure features"""
        platform_count = station_data.get("platform_count", 1)
        has_cctv = 1.0 if station_data.get("has_cctv", False) else 0.0
        zone = station_data.get("zone", "")
        
        # Historical average delay at this station
        avg_station_delay = np.mean(historical_delays) if historical_delays else 0
        station_delay_std = np.std(historical_delays) if len(historical_delays) > 1 else 0
        
        # Congestion level based on platform count
        # (fewer platforms = higher congestion)
        congestion_factor = max(1.0 - (platform_count / 20), 0.1)  # 0.1-1.0
        
        # CCTV and infrastructure quality indicator
        infra_quality = has_cctv * 0.5 + 0.5  # 0.5-1.0
        
        return {
            "avg_station_delay": avg_station_delay / 60,        # Normalize
            "station_delay_volatility": station_delay_std / 60,  # Normalize
            "congestion_factor": congestion_factor,
            "infra_quality": infra_quality,
            "platform_count": min(platform_count / 25, 1.0),    # Normalize
        }
    
    def extract_weather_features(self, weather_data: Dict) -> Dict[str, float]:
        """Extract weather impact features"""
        condition = weather_data.get("condition", "clear").lower()
        temperature = weather_data.get("temperature", 25)
        precipitation = weather_data.get("precipitation_mm", 0)
        wind_speed = weather_data.get("wind_speed_kmh", 0)
        
        # Weather condition impact
        weather_delay_impact = self.WEATHER_IMPACT.get(condition, 0)
        
        # Extreme temperature impact
        temp_impact = 0
        if temperature < 5:         # Very cold
            temp_impact = 8
        elif temperature > 45:      # Extreme heat
            temp_impact = 12
        elif temperature < 10 or temperature > 40:  # Cold/hot
            temp_impact = 4
        
        # Wind impact (>60 km/h affects operations)
        wind_impact = min(wind_speed / 10, 5) if wind_speed > 30 else 0
        
        # Precipitation impact (cumulative)
        precip_impact = min(precipitation / 10, 10)
        
        return {
            "weather_delay_impact": weather_delay_impact / 60,
            "temperature_impact": temp_impact / 60,
            "wind_impact": wind_impact / 60,
            "precipitation_impact": precip_impact / 60,
            "is_extreme_weather": 1.0 if (condition in ["cyclone", "snow"] or wind_speed > 60) else 0.0,
        }
    
    def extract_signal_features(self, signal_data: Dict) -> Dict[str, float]:
        """Extract signaling system features"""
        signal_status = signal_data.get("status", "normal").lower()
        maintenance_window = signal_data.get("in_maintenance_window", False)
        grid_health = signal_data.get("grid_health_pct", 95)
        
        # Signal status impact
        signal_impact = {
            "normal": 0,
            "degraded": 8,      # Minor impact
            "critical": 30,     # Major impact
            "offline": 60,      # Severe impact
        }
        
        status_delay = signal_impact.get(signal_status, 0)
        
        # Maintenance window impact
        maintenance_delay = 5 if maintenance_window else 0
        
        # Grid health impact (lower health = more delays)
        grid_impact = max((100 - grid_health) / 10, 0)
        
        return {
            "signal_status_delay": status_delay / 60,
            "maintenance_delay": maintenance_delay / 60,
            "grid_health_impact": grid_impact / 60,
            "signal_reliability": grid_health / 100,
        }
    
    def extract_congestion_features(self, congestion_data: Dict) -> Dict[str, float]:
        """Extract track and platform congestion features"""
        platform_occupancy = congestion_data.get("platform_occupancy_pct", 50)
        track_utilization = congestion_data.get("track_utilization_pct", 60)
        nearby_trains_count = congestion_data.get("nearby_trains_count", 5)
        
        # Occupancy impact (higher occupancy = more delays)
        occupancy_impact = (platform_occupancy / 100) * 20  # Max 20 min impact
        
        # Track utilization impact
        utilization_impact = (track_utilization / 100) * 15  # Max 15 min impact
        
        # Nearby trains impact (more trains = higher collision risk)
        nearby_train_impact = min(nearby_trains_count / 10, 1.0) * 10  # Max 10 min impact
        
        return {
            "platform_occupancy": platform_occupancy / 100,
            "track_utilization": track_utilization / 100,
            "congestion_delay_impact": (occupancy_impact + utilization_impact + nearby_train_impact) / 60,
            "nearby_trains_density": min(nearby_trains_count / 15, 1.0),
        }
    
    def engineer_features(
        self,
        train_data: Dict,
        station_data: Dict,
        weather_data: Dict,
        signal_data: Dict,
        congestion_data: Dict,
        timestamp: datetime = None,
        historical_delays: List[float] = None
    ) -> np.ndarray:
        """
        Combine all features into a single feature vector
        
        Returns: numpy array of 30+ features in consistent order
        """
        if timestamp is None:
            timestamp = datetime.utcnow()
        if historical_delays is None:
            historical_delays = []
        
        # Extract all feature groups
        time_features = self.extract_time_features(timestamp)
        train_features = self.extract_train_features(train_data)
        station_features = self.extract_station_features(station_data, historical_delays)
        weather_features = self.extract_weather_features(weather_data)
        signal_features = self.extract_signal_features(signal_data)
        congestion_features = self.extract_congestion_features(congestion_data)
        
        # Combine in consistent order
        feature_dict = {}
        feature_dict.update(time_features)
        feature_dict.update(train_features)
        feature_dict.update(station_features)
        feature_dict.update(weather_features)
        feature_dict.update(signal_features)
        feature_dict.update(congestion_features)
        
        # Return as ordered list
        feature_names = list(feature_dict.keys())
        feature_values = [feature_dict[name] for name in feature_names]
        
        return np.array(feature_values), feature_names
    
    def create_feature_matrix(
        self,
        records: List[Dict]
    ) -> Tuple[np.ndarray, List[str]]:
        """Create feature matrix from multiple records"""
        features_list = []
        feature_names = None
        
        for record in records:
            features, names = self.engineer_features(
                train_data=record.get("train", {}),
                station_data=record.get("station", {}),
                weather_data=record.get("weather", {}),
                signal_data=record.get("signal", {}),
                congestion_data=record.get("congestion", {}),
                timestamp=record.get("timestamp"),
                historical_delays=record.get("historical_delays", [])
            )
            features_list.append(features)
            if feature_names is None:
                feature_names = names
        
        feature_matrix = np.vstack(features_list) if features_list else np.array([])
        return feature_matrix, feature_names


def create_synthetic_training_data(n_samples: int = 5000) -> pd.DataFrame:
    """
    Generate synthetic historical delay data for model training
    
    This simulates 5000+ actual delay records with realistic patterns
    """
    engineer = DelayFeatureEngineer()
    records = []
    
    train_types = ["Rajdhani", "Shatabdi", "Express", "Mail", "Passenger"]
    stations = [
        {"code": "NDLS", "platform_count": 16, "has_cctv": True},
        {"code": "HWH", "platform_count": 23, "has_cctv": True},
        {"code": "MMCT", "platform_count": 9, "has_cctv": True},
        {"code": "SBC", "platform_count": 15, "has_cctv": True},
        {"code": "MAS", "platform_count": 17, "has_cctv": True},
    ]
    
    for i in range(n_samples):
        timestamp = datetime(2024, 1, 1) + timedelta(hours=np.random.randint(0, 8760))
        
        train_type = np.random.choice(train_types)
        station = np.random.choice(stations)
        
        # Generate features
        features, names = engineer.engineer_features(
            train_data={"train_type": train_type, "typical_duration_min": np.random.randint(180, 1440)},
            station_data=station,
            weather_data={
                "condition": np.random.choice(["clear", "rain", "fog", "snow"]),
                "temperature": np.random.normal(25, 10),
                "precipitation_mm": np.random.exponential(2),
                "wind_speed_kmh": np.random.exponential(15),
            },
            signal_data={
                "status": np.random.choice(["normal", "degraded"]),
                "in_maintenance_window": np.random.random() > 0.95,
                "grid_health_pct": np.random.normal(95, 5),
            },
            congestion_data={
                "platform_occupancy_pct": np.random.uniform(30, 90),
                "track_utilization_pct": np.random.uniform(40, 85),
                "nearby_trains_count": np.random.poisson(5),
            },
            timestamp=timestamp
        )
        
        # Generate target (actual delay in minutes)
        # Base delay from train type
        base_delay = engineer.TRAIN_TYPE_BASELINE.get(train_type, 15)
        
        # Add random noise and systematic patterns
        noise = np.random.normal(0, 5)
        rush_hour_penalty = 10 if (6 <= timestamp.hour <= 10) or (17 <= timestamp.hour <= 21) else 0
        weather_penalty = 15 if features[7] > 0 else 0  # weather_delay_impact
        
        actual_delay = max(0, base_delay + noise + rush_hour_penalty + weather_penalty)
        
        record = {
            "timestamp": timestamp.isoformat(),
            "train_type": train_type,
            "station_code": station["code"],
            "actual_delay_min": actual_delay,
            "confidence_baseline": 0.85 if actual_delay > 5 else 0.95,
        }
        
        # Add features
        for name, value in zip(names, features):
            record[name] = value
        
        records.append(record)
    
    return pd.DataFrame(records)


if __name__ == "__main__":
    print("Generating synthetic training data...")
    df = create_synthetic_training_data(5000)
    print(f"\n✅ Generated {len(df)} samples")
    print(f"\nColumns: {', '.join(df.columns[:10])}... ({len(df.columns)} total)")
    print(f"\nDelay statistics:")
    print(df["actual_delay_min"].describe())
    
    # Save for training
    df.to_csv("data/delay_training.csv", index=False)
    print(f"\n📊 Saved to: backend/ml/data/delay_training.csv")
