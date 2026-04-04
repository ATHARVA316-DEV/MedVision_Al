"""
MedVision AI — Demo Model Creator
Creates lightweight ML models for eye disease and skin disease classification.
These models use statistical image features extracted from images.
For production, replace with deep learning models trained on full datasets.

Usage:
    python create_demo_models.py
"""
import os
import sys
import numpy as np
import joblib
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

# Number of image features our extract_image_features() returns:
# 7 per channel (3 channels) + 3 texture + 3 region + 3 color ratio = 30
N_FEATURES = 30

def create_eye_model():
    """
    Improved eye disease classifier with well-separated class distributions.
    Classes: 0=Cataract, 1=Diabetic Retinopathy, 2=Glaucoma, 3=Normal
    
    Distributions calibrated to real fundoscopy image feature statistics:
    - Cataract: Very high brightness, very low contrast, near-equal RGB (cloudy lens)
    - DR: Strong red channel, high contrast/gradients, center darker (hemorrhages)
    - Glaucoma: Very large center-periphery diff (optic disc cupping), pale center
    - Normal: Moderate balanced values, small center-periphery diff
    """
    print("[*] Creating improved eye disease model...")
    np.random.seed(42)
    
    n_per_class = 1000
    X_all, y_all = [], []
    
    # ── Cataract: cloudy lens → very bright, very low contrast, near-grey ──
    for _ in range(n_per_class):
        r = np.random.normal(0.72, 0.06)
        g = np.random.normal(0.70, 0.06)
        b = np.random.normal(0.68, 0.06)
        c = np.random.normal(0.07, 0.02)
        X_all.append([
            r, c, r, r-0.03, r+0.03, r-0.08, r+0.08,
            g, c, g, g-0.03, g+0.03, g-0.08, g+0.08,
            b, c, b, b-0.03, b+0.03, b-0.08, b+0.08,
            np.random.normal(0.02, 0.008),
            np.random.normal(0.02, 0.008),
            c,
            np.random.normal(0.72, 0.04),
            np.random.normal(0.70, 0.04),
            np.random.normal(0.02, 0.015),
            r/(g+1e-6), b/(g+1e-6), r/(b+1e-6),
        ])
        y_all.append(0)
    
    # ── DR: hemorrhages → high red, high contrast, irregular, center darker ──
    for _ in range(n_per_class):
        r = np.random.normal(0.48, 0.07)
        g = np.random.normal(0.22, 0.06)
        b = np.random.normal(0.15, 0.05)
        c = np.random.normal(0.28, 0.04)
        X_all.append([
            r, c, r, r-0.12, r+0.10, r-0.28, r+0.22,
            g, c*0.85, g, g-0.10, g+0.08, g-0.20, g+0.16,
            b, c*0.75, b, b-0.08, b+0.07, b-0.16, b+0.13,
            np.random.normal(0.10, 0.02),
            np.random.normal(0.09, 0.02),
            c,
            np.random.normal(0.30, 0.06),
            np.random.normal(0.42, 0.06),
            np.random.normal(-0.12, 0.04),
            r/(g+1e-6), b/(g+1e-6), r/(b+1e-6),
        ])
        y_all.append(1)
    
    # ── Glaucoma: optic disc cupping → very bright center, dark surround ──
    for _ in range(n_per_class):
        r = np.random.normal(0.42, 0.06)
        g = np.random.normal(0.34, 0.05)
        b = np.random.normal(0.30, 0.05)
        c = np.random.normal(0.19, 0.03)
        X_all.append([
            r, c, r, r-0.09, r+0.09, r-0.22, r+0.20,
            g, c*0.88, g, g-0.08, g+0.07, g-0.17, g+0.15,
            b, c*0.82, b, b-0.07, b+0.06, b-0.14, b+0.12,
            np.random.normal(0.065, 0.015),
            np.random.normal(0.065, 0.015),
            c,
            np.random.normal(0.62, 0.05),
            np.random.normal(0.30, 0.05),
            np.random.normal(0.32, 0.05),
            r/(g+1e-6), b/(g+1e-6), r/(b+1e-6),
        ])
        y_all.append(2)
    
    # ── Normal: healthy fundus → moderate values, small center-periphery diff ──
    for _ in range(n_per_class):
        r = np.random.normal(0.52, 0.06)
        g = np.random.normal(0.36, 0.05)
        b = np.random.normal(0.28, 0.05)
        c = np.random.normal(0.14, 0.025)
        X_all.append([
            r, c, r, r-0.06, r+0.06, r-0.16, r+0.15,
            g, c*0.93, g, g-0.05, g+0.05, g-0.13, g+0.12,
            b, c*0.88, b, b-0.04, b+0.04, b-0.11, b+0.10,
            np.random.normal(0.045, 0.012),
            np.random.normal(0.045, 0.012),
            c,
            np.random.normal(0.48, 0.04),
            np.random.normal(0.46, 0.04),
            np.random.normal(0.02, 0.015),
            r/(g+1e-6), b/(g+1e-6), r/(b+1e-6),
        ])
        y_all.append(3)
    
    X = np.array(X_all)
    y = np.array(y_all)
    X += np.random.normal(0, 0.01, X.shape)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
    
    model = GradientBoostingClassifier(
        n_estimators=300, max_depth=5, learning_rate=0.08,
        subsample=0.85, min_samples_leaf=5, random_state=42
    )
    model.fit(X_train, y_train)
    
    accuracy = model.score(X_test, y_test)
    print(f"  [OK] Eye model accuracy: {accuracy:.2%}")
    
    # Per-class accuracy
    from sklearn.metrics import classification_report
    y_pred = model.predict(X_test)
    for i, cls in enumerate(['Cataract', 'DR', 'Glaucoma', 'Normal']):
        mask = y_test == i
        cls_acc = (y_pred[mask] == y_test[mask]).mean() if mask.sum() > 0 else 0
        print(f"       {cls}: {cls_acc:.2%}")
    
    model_path = os.path.join(MODELS_DIR, 'eye_model.pkl')
    scaler_path = os.path.join(MODELS_DIR, 'eye_scaler.pkl')
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    print(f"  [SAVED] {model_path}")
    
    return model


def create_skin_model():
    """
    Create a robust skin lesion classification model.
    Classes: 0=Benign, 1=Malignant
    
    Feature distributions based on dermatological characteristics:
    - Malignant: darker varied color, asymmetric, high texture gradients (irregular borders), larger
    - Benign: uniform color, low gradients, symmetric
    """
    print("[*] Creating skin disease model...")
    np.random.seed(43)
    
    n_per_class = 2000
    X_all = []
    y_all = []
    
    # ── Benign: uniform color, low contrast, symmetric ──
    for _ in range(n_per_class):
        r_mean = np.random.normal(0.55, 0.10)
        g_mean = np.random.normal(0.45, 0.08)
        b_mean = np.random.normal(0.40, 0.08)
        
        r_std = np.random.normal(0.04, 0.01)
        g_std = np.random.normal(0.03, 0.01)
        b_std = np.random.normal(0.03, 0.01)
        
        contrast = np.random.normal(0.12, 0.03)
        features = [
            # R channel
            r_mean, r_std, r_mean, r_mean-0.03, r_mean+0.03, r_mean-r_std*2.5, r_mean+r_std*2.5,
            # G channel
            g_mean, g_std, g_mean, g_mean-0.02, g_mean+0.02, g_mean-g_std*2.5, g_mean+g_std*2.5,
            # B channel
            b_mean, b_std, b_mean, b_mean-0.02, b_mean+0.02, b_mean-b_std*2.5, b_mean+b_std*2.5,
            # Texture
            np.random.normal(0.03, 0.01),   # low h_grad
            np.random.normal(0.03, 0.01),   # low v_grad
            contrast,
            # Region 
            np.random.normal(0.50, 0.04),   # center
            np.random.normal(0.52, 0.04),   # periphery
            np.random.normal(0.01, 0.01),   # very small diff (symmetric)
            # Ratios
            r_mean / (g_mean + 1e-6),
            b_mean / (g_mean + 1e-6),
            r_mean / (b_mean + 1e-6),
        ]
        X_all.append(features)
        y_all.append(0)  # Benign
    
    # ── Malignant: dark, varied color, asymmetric, high contrast ──
    for _ in range(n_per_class):
        r_mean = np.random.normal(0.35, 0.15)
        g_mean = np.random.normal(0.25, 0.12)
        b_mean = np.random.normal(0.20, 0.10)
        
        r_std = np.random.normal(0.12, 0.04)
        g_std = np.random.normal(0.10, 0.03)
        b_std = np.random.normal(0.10, 0.03)
        
        contrast = np.random.normal(0.28, 0.06)
        features = [
            # R channel (high variability)
            r_mean, r_std, r_mean+0.02, r_mean-0.08, r_mean+0.10, r_mean-r_std*3, r_mean+r_std*3,
            # G channel
            g_mean, g_std, g_mean+0.01, g_mean-0.06, g_mean+0.08, g_mean-g_std*3, g_mean+g_std*3,
            # B channel
            b_mean, b_std, b_mean+0.01, b_mean-0.06, b_mean+0.08, b_mean-b_std*3, b_mean+b_std*3,
            # Texture
            np.random.normal(0.12, 0.04),   # high h_grad (irregular)
            np.random.normal(0.12, 0.04),   # high v_grad (irregular)
            contrast,
            # Region
            np.random.normal(0.25, 0.08),   # much darker center
            np.random.normal(0.45, 0.10),   # lighter periphery
            np.random.normal(-0.20, 0.08),  # large diff (asymmetric)
            # Ratios
            r_mean / (g_mean + 1e-6),
            b_mean / (g_mean + 1e-6),
            r_mean / (b_mean + 1e-6),
        ]
        X_all.append(features)
        y_all.append(1)  # Malignant
    
    X = np.array(X_all)
    y = np.array(y_all)
    # Add minimal basic noise
    X += np.random.normal(0, 0.01, X.shape)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = RandomForestClassifier(
        n_estimators=250,
        max_depth=12,
        min_samples_split=5,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    accuracy = model.score(X_test, y_test)
    print(f"  [OK] Skin model accuracy: {accuracy:.2%}")
    
    model_path = os.path.join(MODELS_DIR, 'skin_model.pkl')
    joblib.dump(model, model_path)
    print(f"  [SAVED] {model_path}")
    
    return model


def create_diabetes_model():
    """
    Create diabetes risk prediction model using robust synthetic data.
    Features: pregnancies, glucose, blood_pressure, skin_thickness, insulin, bmi, dpf, age
    """
    print("[*] Creating diabetes model...")
    np.random.seed(42)
    n_samples = 2000
    
    # Generate synthetic labels (35% diabetic)
    y = np.random.choice([0, 1], size=n_samples, p=[0.65, 0.35])
    
    # Initialize features
    pregnancies = np.random.poisson(3, n_samples)
    glucose = np.where(y == 1, np.random.normal(160, 30, n_samples), np.random.normal(105, 20, n_samples))
    blood_pressure = np.where(y == 1, np.random.normal(85, 15, n_samples), np.random.normal(70, 10, n_samples))
    skin_thickness = np.where(y == 1, np.random.normal(32, 8, n_samples), np.random.normal(20, 6, n_samples))
    insulin = np.where(y == 1, np.random.normal(210, 90, n_samples), np.random.normal(80, 40, n_samples))
    bmi = np.where(y == 1, np.random.normal(34, 6, n_samples), np.random.normal(24, 4, n_samples))
    dpf = np.random.gamma(2, 0.2, n_samples)  # Diabetes Pedigree Function
    age = np.random.randint(20, 81, n_samples)
    
    # Combine into feature matrix
    X = np.column_stack([
        pregnancies, glucose.clip(40, 250), blood_pressure.clip(40, 140),
        skin_thickness.clip(5, 60), insulin.clip(10, 600), bmi.clip(15, 60),
        dpf.clip(0.1, 2.5), age
    ])
    
    # Feature Scaling
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
    
    # Robust RandomForestClassifier
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_split=5,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    accuracy = model.score(X_test, y_test)
    print(f"  [OK] Diabetes model accuracy: {accuracy:.2%}")
    
    # Save model and scaler
    model_path = os.path.join(MODELS_DIR, 'diabetes_model.pkl')
    scaler_path = os.path.join(MODELS_DIR, 'diabetes_scaler.pkl')
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    print(f"  [SAVED] {model_path}")
    
    return model


def create_hemoglobin_model():
    """
    Create hemoglobin estimation regression model.
    Estimated from: SpO2, heart_rate, age, gender
    Trained on synthetic data calibrated to medical ranges.
    """
    print("[*] Creating hemoglobin model...")
    np.random.seed(44)
    
    n_samples = 2000
    
    # Generate realistic physiological data
    spo2 = np.random.normal(97, 2, n_samples).clip(85, 100)
    heart_rate = np.random.normal(75, 12, n_samples).clip(50, 120)
    age = np.random.uniform(18, 80, n_samples)
    gender = np.random.choice([0, 1], n_samples)  # 0=Female, 1=Male
    
    base_hb = np.where(gender == 1, 15.0, 13.0)
    spo2_effect = (spo2 - 95) * 0.4
    age_effect = -0.02 * np.maximum(0, age - 40)
    hr_effect = -0.015 * np.maximum(0, heart_rate - 80)
    
    # Strict abnormal logic logic: SpO2 < 92 and HR > 100 -> abnormal/low hemoglobin
    severe_abnormal = (spo2 < 92) & (heart_rate > 100)
    abnormal_penalty = np.where(severe_abnormal, -6.0, 0.0)
    
    noise = np.random.normal(0, 0.8, n_samples)
    
    hemoglobin = base_hb + spo2_effect + age_effect + hr_effect + abnormal_penalty + noise
    hemoglobin = hemoglobin.clip(5.0, 18.0)
    
    X = np.column_stack([spo2, heart_rate, age, gender])
    y = hemoglobin
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
    
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    from sklearn.metrics import mean_absolute_error, r2_score
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    print(f"  [OK] Hemoglobin model MAE: {mae:.2f} g/dL, R2: {r2:.2f}")
    
    model_path = os.path.join(MODELS_DIR, 'hemoglobin_model.pkl')
    scaler_path = os.path.join(MODELS_DIR, 'hemoglobin_scaler.pkl')
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    print(f"  [SAVED] {model_path}")
    
    return model


if __name__ == '__main__':
    print("=" * 60)
    print("  MedVision AI - Demo Model Creator")
    print("=" * 60)
    print()
    
    create_eye_model()
    print()
    create_skin_model()
    print()
    create_diabetes_model()
    print()
    create_hemoglobin_model()
    
    print()
    print("=" * 60)
    print("  [OK] All models created successfully!")
    print(f"  [DIR] Models saved to: {MODELS_DIR}")
    print("=" * 60)
