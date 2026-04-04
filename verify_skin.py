import joblib
import numpy as np

model_path = "./backend/models/skin_model.pkl"
try:
    model = joblib.load(model_path)
    dummy_features = np.zeros(30).reshape(1, -1)
    
    pred = model.predict(dummy_features)
    proba = model.predict_proba(dummy_features)
    print(f"SUCCESS: Loaded and tested. Prediction: {pred[0]}, Proba: {proba[0]}")
except Exception as e:
    print(f"FAILED: {e}")
