"""
MedVision AI - Flask Backend
Multi-disease screening API with trained ML models.
"""
import os
import json
import uuid
import base64
import io
import traceback
from datetime import datetime

import numpy as np
from PIL import Image
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
from tensorflow.keras.models import load_model

# ─── Configuration ────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
MODELS_DIR = os.path.join(BASE_DIR, 'models')
UPLOADS_DIR = os.path.join(BASE_DIR, 'uploads')
STATIC_DIR = os.path.join(BASE_DIR, '..', 'frontend', 'dist')

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

PATIENTS_FILE = os.path.join(DATA_DIR, 'patients.json')
MAX_PATIENTS = 5

# ─── Flask App ────────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder=STATIC_DIR, static_url_path='')
CORS(app)

# ─── Model Loading ────────────────────────────────────────────────────────────
eye_model = None
skin_model = None
diabetes_model = None
hemoglobin_model = None
eye_scaler = None
diabetes_scaler = None
hemoglobin_scaler = None

EYE_CLASSES = ['Cataract', 'Diabetic Retinopathy', 'Glaucoma', 'Normal']
EYE_CLASS_MAP = {} # To be populated from CSV
SKIN_CLASSES = ['Benign', 'Malignant']

def load_models():
    """Load all trained ML models at startup."""
    global eye_model, skin_model, diabetes_model, hemoglobin_model
    global eye_scaler, diabetes_scaler, hemoglobin_scaler

    global EYE_CLASS_MAP
    import joblib

    try:
        # Load ResNet50 Eye Model (.h5)
        eye_model_path = os.path.join(MODELS_DIR, 'resnet50_eye_weights.h5')
        eye_csv_path = os.path.join(MODELS_DIR, 'eye_class_dict.csv')
        
        if os.path.exists(eye_model_path) and os.path.exists(eye_csv_path):
            eye_model = load_model(eye_model_path)
            
            # Load class mapping from CSV
            df = pd.read_csv(eye_csv_path)
            # Map CSV labels to human-readable strings for RAG
            raw_map = dict(zip(df['class_index'], df['class']))
            
            # Clinical mapping for consistency with RAG
            clinical_mapping = {
                'cataract': 'Cataract',
                'diabetic_retinopathy': 'Diabetic Retinopathy',
                'glaucoma': 'Glaucoma',
                'normal': 'Normal'
            }
            EYE_CLASS_MAP = {idx: clinical_mapping.get(label, label.title()) for idx, label in raw_map.items()}
            print("[OK] ResNet50 Eye disease model and class mapping loaded")
        else:
            print("[WARN] ResNet50 Eye model or CSV mapping not found - using fallback")
    except Exception as e:
        print(f"[WARN] ResNet50 Eye model load error: {e}")

    try:
        skin_model_path = os.path.join(MODELS_DIR, 'skin_model.pkl')
        if os.path.exists(skin_model_path):
            skin_model = joblib.load(skin_model_path)
            print("[OK] Skin disease model loaded")
        else:
            print("[WARN] Skin model not found - using fallback")
    except Exception as e:
        print(f"[WARN] Skin model load error: {e}")

    try:
        diabetes_model_path = os.path.join(MODELS_DIR, 'diabetes_model.pkl')
        diabetes_scaler_path = os.path.join(MODELS_DIR, 'diabetes_scaler.pkl')
        if os.path.exists(diabetes_model_path):
            diabetes_model = joblib.load(diabetes_model_path)
            if os.path.exists(diabetes_scaler_path):
                diabetes_scaler = joblib.load(diabetes_scaler_path)
            print("[OK] Diabetes model loaded")
        else:
            print("[WARN] Diabetes model not found - using fallback")
    except Exception as e:
        print(f"[WARN] Diabetes model load error: {e}")

    try:
        hb_model_path = os.path.join(MODELS_DIR, 'hemoglobin_model.pkl')
        hb_scaler_path = os.path.join(MODELS_DIR, 'hemoglobin_scaler.pkl')
        if os.path.exists(hb_model_path):
            hemoglobin_model = joblib.load(hb_model_path)
            if os.path.exists(hb_scaler_path):
                hemoglobin_scaler = joblib.load(hb_scaler_path)
            print("[OK] Hemoglobin model loaded")
        else:
            print("[WARN] Hemoglobin model not found - using fallback")
    except Exception as e:
        print(f"[WARN] Hemoglobin model load error: {e}")


# ─── Helpers ──────────────────────────────────────────────────────────────────
def load_patients():
    """Load patients from JSON file."""
    if os.path.exists(PATIENTS_FILE):
        with open(PATIENTS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_patients(patients):
    """Save patients to JSON file."""
    with open(PATIENTS_FILE, 'w') as f:
        json.dump(patients, f, indent=2, default=str)

def preprocess_image(image_data, target_size=(224, 224)):
    """Preprocess image for model inference."""
    if isinstance(image_data, str) and image_data.startswith('data:'):
        # Base64 encoded image
        header, data = image_data.split(',', 1)
        image_bytes = base64.b64decode(data)
    elif isinstance(image_data, bytes):
        image_bytes = image_data
    else:
        image_bytes = image_data

    image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    image = image.resize(target_size, Image.LANCZOS)
    img_array = np.array(image, dtype=np.float32) / 255.0
    return img_array

def extract_image_features(img_array):
    """Extract statistical features from image for ML classification."""
    features = []
    # Per-channel statistics
    for c in range(3):
        channel = img_array[:, :, c]
        features.extend([
            np.mean(channel),
            np.std(channel),
            np.median(channel),
            np.percentile(channel, 25),
            np.percentile(channel, 75),
            np.min(channel),
            np.max(channel),
        ])
    # Texture features (simple)
    gray = np.mean(img_array, axis=2)
    features.append(np.mean(np.abs(np.diff(gray, axis=0))))  # horizontal gradient
    features.append(np.mean(np.abs(np.diff(gray, axis=1))))  # vertical gradient
    features.append(np.std(gray))  # overall contrast

    # Region-based features (center vs periphery for eye images)
    h, w = gray.shape
    center = gray[h//4:3*h//4, w//4:3*w//4]
    periphery_mask = np.ones_like(gray, dtype=bool)
    periphery_mask[h//4:3*h//4, w//4:3*w//4] = False
    periphery = gray[periphery_mask]
    features.append(np.mean(center))
    features.append(np.mean(periphery))
    features.append(np.mean(center) - np.mean(periphery))  # center-periphery diff

    # Color ratios
    r, g, b = img_array[:,:,0], img_array[:,:,1], img_array[:,:,2]
    features.append(np.mean(r) / (np.mean(g) + 1e-6))
    features.append(np.mean(b) / (np.mean(g) + 1e-6))
    features.append(np.mean(r) / (np.mean(b) + 1e-6))

    return np.array(features).reshape(1, -1)


# ─── RAG Report Generation ────────────────────────────────────────────────────
MEDICAL_KNOWLEDGE = {
    'eye': {
        'Cataract': {
            'description': 'A cataract is a clouding of the normally clear lens of the eye, leading to decreased vision.',
            'risk_factors': 'Age, diabetes, prolonged sunlight exposure, smoking, obesity, high blood pressure.',
            'recommendations': [
                'Consult an ophthalmologist for comprehensive eye examination.',
                'Consider surgical evaluation if vision is significantly impaired.',
                'Use brighter lighting and anti-glare sunglasses as interim measures.',
                'Monitor for progression with regular follow-up visits.',
            ],
            'urgency': 'moderate'
        },
        'Diabetic Retinopathy': {
            'description': 'Diabetic retinopathy is a diabetes complication that affects the blood vessels of the retina, potentially causing vision loss.',
            'risk_factors': 'Long duration of diabetes, poor blood sugar control, high blood pressure, high cholesterol.',
            'recommendations': [
                'Urgent referral to retinal specialist for detailed fundus examination.',
                'Strict glycemic control (HbA1c < 7%) is critical.',
                'Blood pressure and cholesterol management recommended.',
                'Consider anti-VEGF therapy or laser photocoagulation if indicated.',
                'Regular screening every 3-6 months.',
            ],
            'urgency': 'high'
        },
        'Glaucoma': {
            'description': 'Glaucoma is a group of eye conditions that damage the optic nerve, often associated with elevated intraocular pressure.',
            'risk_factors': 'Family history, age over 60, elevated intraocular pressure, thin corneas.',
            'recommendations': [
                'Immediate referral to ophthalmologist for intraocular pressure measurement.',
                'Visual field testing and optic nerve imaging recommended.',
                'Prescription eye drops may be needed to reduce eye pressure.',
                'Regular monitoring every 3-6 months to track progression.',
            ],
            'urgency': 'high'
        },
        'Normal': {
            'description': 'No significant ocular pathology detected in the screening image.',
            'risk_factors': 'N/A',
            'recommendations': [
                'Continue routine eye examinations annually.',
                'Maintain healthy lifestyle habits for eye health.',
                'Wear UV-protective sunglasses outdoors.',
                'Report any changes in vision promptly.',
            ],
            'urgency': 'low'
        }
    },
    'skin': {
        'Malignant': {
            'description': 'The skin lesion exhibits characteristics consistent with potential malignancy. Further clinical evaluation is strongly recommended.',
            'risk_factors': 'UV exposure, fair skin, family history of skin cancer, multiple moles, weakened immune system.',
            'recommendations': [
                'URGENT: Immediate referral to dermatologist for biopsy and histopathological examination.',
                'Do not attempt self-treatment or removal of the lesion.',
                'Document lesion size, shape, and color changes.',
                'Full-body skin examination recommended.',
                'Consider dermoscopic evaluation.',
            ],
            'urgency': 'critical'
        },
        'Benign': {
            'description': 'The skin lesion appears to be benign based on visual analysis. However, clinical confirmation is advised.',
            'risk_factors': 'N/A',
            'recommendations': [
                'Monitor for any changes in size, shape, color, or texture (ABCDE criteria).',
                'Annual dermatological examination recommended.',
                'Use broad-spectrum SPF 30+ sunscreen daily.',
                'Photograph the lesion for future comparison.',
            ],
            'urgency': 'low'
        }
    },
    'hemoglobin': {
        'severe_anemia': {
            'description': 'Hemoglobin levels indicate severe anemia (< 7 g/dL). Immediate medical intervention required.',
            'recommendations': [
                'URGENT: Immediate medical evaluation and possible blood transfusion.',
                'Complete blood count (CBC) and iron studies needed.',
                'Evaluate for underlying causes (bleeding, nutritional deficiency, chronic disease).',
                'Nutritional supplementation with iron, B12, and folate as directed.',
            ],
            'urgency': 'critical'
        },
        'moderate_anemia': {
            'description': 'Hemoglobin levels suggest moderate anemia (7-10 g/dL). Medical evaluation recommended.',
            'recommendations': [
                'Consult physician for further evaluation.',
                'Iron-rich diet recommended (leafy greens, red meat, legumes).',
                'Iron supplementation may be prescribed.',
                'Follow-up testing in 4-6 weeks.',
            ],
            'urgency': 'high'
        },
        'mild_anemia': {
            'description': 'Hemoglobin levels suggest mild anemia (10-12 g/dL for women, 10-13 g/dL for men).',
            'recommendations': [
                'Dietary modifications with iron-rich foods.',
                'Consider iron and vitamin C supplementation.',
                'Recheck hemoglobin in 2-3 months.',
                'Rule out any ongoing blood loss.',
            ],
            'urgency': 'moderate'
        },
        'normal': {
            'description': 'Hemoglobin levels are within normal range.',
            'recommendations': [
                'Maintain balanced diet with adequate iron intake.',
                'Continue regular health check-ups.',
                'Stay hydrated and maintain active lifestyle.',
            ],
            'urgency': 'low'
        }
    },
    'diabetes': {
        'high_risk': {
            'description': 'Analysis indicates elevated diabetes risk based on provided health parameters.',
            'recommendations': [
                'Fasting blood glucose and HbA1c testing recommended.',
                'Oral glucose tolerance test (OGTT) may be advised.',
                'Lifestyle modifications: regular exercise (150 min/week), balanced diet.',
                'Weight management if BMI > 25.',
                'Regular monitoring every 3 months.',
            ],
            'urgency': 'high'
        },
        'moderate_risk': {
            'description': 'Analysis suggests moderate diabetes risk. Preventive measures recommended.',
            'recommendations': [
                'Annual fasting glucose screening recommended.',
                'Adopt Mediterranean or DASH diet.',
                'Regular physical activity (at least 30 min/day).',
                'Monitor weight and waist circumference.',
            ],
            'urgency': 'moderate'
        },
        'low_risk': {
            'description': 'Diabetes risk appears low based on current parameters.',
            'recommendations': [
                'Continue healthy lifestyle habits.',
                'Annual wellness check-up recommended.',
                'Maintain healthy weight and regular exercise.',
            ],
            'urgency': 'low'
        }
    }
}

def generate_rag_report(patient, results):
    """Generate a RAG-style structured medical report."""
    report = {
        'id': str(uuid.uuid4()),
        'generated_at': datetime.now().isoformat(),
        'patient': {
            'name': patient.get('name', 'Unknown'),
            'age': patient.get('age', 'N/A'),
            'gender': patient.get('gender', 'N/A'),
            'id': patient.get('id', 'N/A'),
        },
        'screening_results': [],
        'overall_risk': 'low',
        'summary': '',
        'disclaimer': 'This report is generated by an AI-powered screening system and is intended for preliminary assessment only. It does not constitute a medical diagnosis. Please consult a qualified healthcare professional for definitive diagnosis and treatment.'
    }

    risk_levels = []

    # Eye Disease
    if 'eye' in results and results['eye']:
        eye = results['eye']
        condition = eye.get('prediction', 'Normal')
        knowledge = MEDICAL_KNOWLEDGE['eye'].get(condition, MEDICAL_KNOWLEDGE['eye']['Normal'])
        risk_levels.append(knowledge['urgency'])
        report['screening_results'].append({
            'type': 'Eye Disease Screening',
            'icon': '👁',
            'prediction': condition,
            'confidence': round(eye.get('confidence', 0) * 100, 1),
            'description': knowledge['description'],
            'risk_factors': knowledge['risk_factors'],
            'recommendations': knowledge['recommendations'],
            'urgency': knowledge['urgency'],
        })

    # Skin Disease
    if 'skin' in results and results['skin']:
        skin = results['skin']
        condition = skin.get('prediction', 'Benign')
        knowledge = MEDICAL_KNOWLEDGE['skin'].get(condition, MEDICAL_KNOWLEDGE['skin']['Benign'])
        risk_levels.append(knowledge['urgency'])
        report['screening_results'].append({
            'type': 'Skin Lesion Analysis',
            'icon': '🧴',
            'prediction': condition,
            'confidence': round(skin.get('confidence', 0) * 100, 1),
            'description': knowledge['description'],
            'risk_factors': knowledge['risk_factors'],
            'recommendations': knowledge['recommendations'],
            'urgency': knowledge['urgency'],
        })

    # Hemoglobin
    if 'hemoglobin' in results and results['hemoglobin']:
        hb = results['hemoglobin']
        hb_value = hb.get('hemoglobin_estimate', 14)
        if hb_value < 7:
            hb_category = 'severe_anemia'
        elif hb_value < 10:
            hb_category = 'moderate_anemia'
        elif hb_value < 12:
            hb_category = 'mild_anemia'
        else:
            hb_category = 'normal'
        knowledge = MEDICAL_KNOWLEDGE['hemoglobin'][hb_category]
        risk_levels.append(knowledge['urgency'])
        report['screening_results'].append({
            'type': 'Hemoglobin Level Estimation',
            'icon': '🩸',
            'prediction': f"{hb_value:.1f} g/dL",
            'confidence': round(hb.get('confidence', 0.85) * 100, 1),
            'category': hb_category.replace('_', ' ').title(),
            'description': knowledge['description'],
            'recommendations': knowledge['recommendations'],
            'urgency': knowledge['urgency'],
        })

    # Diabetes
    if 'diabetes' in results and results['diabetes']:
        diab = results['diabetes']
        risk = diab.get('risk_level', 'low_risk')
        knowledge = MEDICAL_KNOWLEDGE['diabetes'][risk]
        risk_levels.append(knowledge['urgency'])
        report['screening_results'].append({
            'type': 'Diabetes Risk Assessment',
            'icon': '🍬',
            'prediction': risk.replace('_', ' ').title(),
            'confidence': round(diab.get('confidence', 0.80) * 100, 1),
            'risk_score': round(diab.get('risk_score', 0.5) * 100, 1),
            'description': knowledge['description'],
            'recommendations': knowledge['recommendations'],
            'urgency': knowledge['urgency'],
        })

    # Overall risk
    urgency_order = {'critical': 4, 'high': 3, 'moderate': 2, 'low': 1}
    if risk_levels:
        max_urgency = max(risk_levels, key=lambda x: urgency_order.get(x, 0))
        report['overall_risk'] = max_urgency

    # Summary
    findings_count = len(report['screening_results'])
    abnormal = [r for r in report['screening_results'] if r['urgency'] in ('high', 'critical')]
    if abnormal:
        report['summary'] = f"Screening completed with {findings_count} tests. {len(abnormal)} finding(s) require immediate medical attention. Please review detailed results below and consult a healthcare professional."
    else:
        report['summary'] = f"Screening completed with {findings_count} tests. No critical findings detected. Regular follow-up recommended as per individual test recommendations."

    return report


# ─── API Routes ───────────────────────────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'models': {
            'eye': eye_model is not None,
            'skin': skin_model is not None,
            'diabetes': diabetes_model is not None,
            'hemoglobin': hemoglobin_model is not None,
        }
    })

# ── Patient CRUD ──────────────────────────────────────────────────────────────
@app.route('/api/patients', methods=['GET'])
def get_patients():
    patients = load_patients()
    return jsonify(patients)

@app.route('/api/patients', methods=['POST'])
def create_patient():
    patients = load_patients()
    if len(patients) >= MAX_PATIENTS:
        return jsonify({'error': f'Maximum {MAX_PATIENTS} patients allowed. Please delete an existing patient first.'}), 400

    data = request.json
    if not data.get('name') or not data.get('age') or not data.get('gender'):
        return jsonify({'error': 'Name, age, and gender are required.'}), 400

    patient = {
        'id': str(uuid.uuid4())[:8],
        'name': data['name'],
        'age': int(data['age']),
        'gender': data['gender'],
        'created_at': datetime.now().isoformat(),
        'screenings': {},
        'report': None,
    }
    patients.append(patient)
    save_patients(patients)
    return jsonify(patient), 201

@app.route('/api/patients/<patient_id>', methods=['GET'])
def get_patient(patient_id):
    patients = load_patients()
    patient = next((p for p in patients if p['id'] == patient_id), None)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
    return jsonify(patient)

@app.route('/api/patients/<patient_id>', methods=['PUT'])
def update_patient(patient_id):
    patients = load_patients()
    patient = next((p for p in patients if p['id'] == patient_id), None)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    data = request.json
    for key in ['name', 'age', 'gender', 'screenings', 'report']:
        if key in data:
            patient[key] = data[key]
    save_patients(patients)
    return jsonify(patient)

@app.route('/api/patients/<patient_id>', methods=['DELETE'])
def delete_patient(patient_id):
    patients = load_patients()
    patients = [p for p in patients if p['id'] != patient_id]
    save_patients(patients)
    return jsonify({'message': 'Patient deleted'})

# ── Predictions ───────────────────────────────────────────────────────────────
@app.route('/api/predict/eye', methods=['POST'])
def predict_eye():
    """Predict eye disease from uploaded image."""
    try:
        image_data = None
        if 'image' in request.files:
            image_data = request.files['image'].read()
        elif request.json and 'image' in request.json:
            image_data = request.json['image']
        else:
            return jsonify({'error': 'No image provided'}), 400

        img_array = preprocess_image(image_data)

        if eye_model is not None and hasattr(eye_model, 'predict'):
            # Reshape for ResNet50 (batch, 224, 224, 3)
            prediction_proba = eye_model.predict(img_array.reshape(1, 224, 224, 3))[0]
            
            # Use dynamic mapping from CSV
            class_idx = np.argmax(prediction_proba)
            predicted_class = EYE_CLASS_MAP.get(class_idx, f"Condition {class_idx}")
            confidence = float(np.max(prediction_proba))
            all_preds = {EYE_CLASS_MAP.get(idx, f"Index {idx}"): float(p) for idx, p in enumerate(prediction_proba)}
        else:
            # Traditional Stat-based Fallback
            features = extract_image_features(img_array)
            predicted_class, confidence = _fallback_eye_prediction(img_array)
            all_preds = {cls: (0.55 if cls == predicted_class else 0.15) for cls in EYE_CLASSES}

        # Include Medical Explanation from RAG
        explanation = MEDICAL_KNOWLEDGE.get('eye', {}).get(predicted_class, {}).get('description', "No description available.")
        urgency = MEDICAL_KNOWLEDGE.get('eye', {}).get(predicted_class, {}).get('urgency', "low")

        result = {
            'prediction': predicted_class,
            'confidence': confidence,
            'all_predictions': all_preds,
            'explanation': explanation,
            'urgency': urgency
        }
        return jsonify(result)

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

def _fallback_eye_prediction(img_array):
    """Heuristic-based eye disease prediction as fallback."""
    gray = np.mean(img_array, axis=2)
    h, w = gray.shape
    center = gray[h//4:3*h//4, w//4:3*w//4]

    avg_brightness = np.mean(gray)
    center_brightness = np.mean(center)
    contrast = np.std(gray)
    blue_ratio = np.mean(img_array[:,:,2]) / (np.mean(img_array[:,:,1]) + 1e-6)

    # Cataract: typically shows cloudy/whitish lens
    if avg_brightness > 0.6 and contrast < 0.15:
        return 'Cataract', 0.78

    # Diabetic Retinopathy: dark spots, hemorrhages
    if contrast > 0.2 and center_brightness < 0.4:
        return 'Diabetic Retinopathy', 0.72

    # Glaucoma: cupping ratio, pale disc
    if center_brightness > avg_brightness * 1.3 and contrast > 0.15:
        return 'Glaucoma', 0.68

    return 'Normal', 0.82


@app.route('/api/predict/skin', methods=['POST'])
def predict_skin():
    """Predict skin disease from uploaded image."""
    try:
        image_data = None
        if 'image' in request.files:
            image_data = request.files['image'].read()
        elif request.json and 'image' in request.json:
            image_data = request.json['image']
        else:
            return jsonify({'error': 'No image provided'}), 400

        img_array = preprocess_image(image_data)
        features = extract_image_features(img_array)

        if skin_model is not None:
            prediction_proba = skin_model.predict_proba(features)[0]
            predicted_class = SKIN_CLASSES[np.argmax(prediction_proba)]
            confidence = float(np.max(prediction_proba))
        else:
            predicted_class, confidence = _fallback_skin_prediction(img_array)

        result = {
            'prediction': predicted_class,
            'confidence': confidence,
            'all_predictions': {cls: float(p) for cls, p in zip(SKIN_CLASSES,
                skin_model.predict_proba(features)[0] if skin_model else [0.65, 0.35]
            )},
        }
        return jsonify(result)

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

def _fallback_skin_prediction(img_array):
    """Heuristic-based skin lesion prediction as fallback."""
    r, g, b = img_array[:,:,0], img_array[:,:,1], img_array[:,:,2]
    darkness = 1.0 - np.mean(img_array)
    asymmetry = np.abs(np.mean(img_array[:,:112]) - np.mean(img_array[:,112:]))
    color_variance = np.std([np.mean(r), np.mean(g), np.mean(b)])

    if darkness > 0.5 and color_variance > 0.1 and asymmetry > 0.05:
        return 'Malignant', 0.74
    return 'Benign', 0.81


@app.route('/api/predict/hemoglobin', methods=['POST'])
def predict_hemoglobin():
    """Estimate hemoglobin from sensor data."""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        spo2 = float(data.get('spo2', 98))
        heart_rate = float(data.get('heart_rate', 72))
        age = float(data.get('age', 30))
        gender = 1 if data.get('gender', 'Male') == 'Male' else 0

        features = np.array([[spo2, heart_rate, age, gender]])

        if hemoglobin_model is not None and hemoglobin_scaler is not None:
            features_scaled = hemoglobin_scaler.transform(features)
            hb_estimate = float(hemoglobin_model.predict(features_scaled)[0])
        elif hemoglobin_model is not None:
            hb_estimate = float(hemoglobin_model.predict(features)[0])
        else:
            # Fallback: medical heuristic
            base_hb = 14.0 if gender == 1 else 12.5
            spo2_factor = (spo2 - 95) * 0.3
            age_factor = -0.02 * max(0, age - 40)
            hr_factor = -0.01 * max(0, heart_rate - 80)
            
            # Strict abnormal condition penalty
            abnormal_penalty = -6.0 if (spo2 < 92 and heart_rate > 100) else 0.0
            
            hb_estimate = base_hb + spo2_factor + age_factor + hr_factor + abnormal_penalty
            hb_estimate = max(5.0, min(18.0, hb_estimate))

        # Determine category
        if gender == 1:
            if hb_estimate < 7: category = 'severe_anemia'
            elif hb_estimate < 10: category = 'moderate_anemia'
            elif hb_estimate < 13: category = 'mild_anemia'
            else: category = 'normal'
        else:
            if hb_estimate < 7: category = 'severe_anemia'
            elif hb_estimate < 10: category = 'moderate_anemia'
            elif hb_estimate < 12: category = 'mild_anemia'
            else: category = 'normal'

        result = {
            'hemoglobin_estimate': round(hb_estimate, 1),
            'category': category,
            'confidence': 0.85,
            'unit': 'g/dL',
            'normal_range': '13.5-17.5 g/dL' if gender == 1 else '12.0-16.0 g/dL',
        }
        return jsonify(result)

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/predict/diabetes', methods=['POST'])
def predict_diabetes():
    """Predict diabetes risk from health parameters."""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        pregnancies = float(data.get('pregnancies', 0))
        glucose = float(data.get('glucose', 100))
        blood_pressure = float(data.get('blood_pressure', 70))
        skin_thickness = float(data.get('skin_thickness', 20))
        insulin = float(data.get('insulin', 80))
        bmi = float(data.get('bmi', 25))
        dpf = float(data.get('diabetes_pedigree', 0.5))
        age = float(data.get('age', 30))

        features = np.array([[pregnancies, glucose, blood_pressure, skin_thickness,
                             insulin, bmi, dpf, age]])

        if diabetes_model is not None:
            if diabetes_scaler is not None:
                features_scaled = diabetes_scaler.transform(features)
            else:
                features_scaled = features
            prediction = int(diabetes_model.predict(features_scaled)[0])
            proba = diabetes_model.predict_proba(features_scaled)[0]
            risk_score = float(proba[1])  # probability of diabetes
        else:
            # Fallback heuristic
            risk_score = 0.0
            if glucose > 140: risk_score += 0.3
            elif glucose > 120: risk_score += 0.15
            if bmi > 30: risk_score += 0.2
            elif bmi > 25: risk_score += 0.1
            if age > 45: risk_score += 0.15
            if blood_pressure > 90: risk_score += 0.1
            if dpf > 0.8: risk_score += 0.15
            risk_score = min(1.0, risk_score)
            prediction = 1 if risk_score > 0.5 else 0

        if risk_score > 0.7:
            risk_level = 'high_risk'
        elif risk_score > 0.4:
            risk_level = 'moderate_risk'
        else:
            risk_level = 'low_risk'

        result = {
            'prediction': prediction,
            'risk_score': risk_score,
            'risk_level': risk_level,
            'confidence': max(risk_score, 1 - risk_score),
        }
        return jsonify(result)

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ── Report Generation ─────────────────────────────────────────────────────────
@app.route('/api/reports/generate', methods=['POST'])
def generate_report():
    """Generate RAG-style medical report for a patient."""
    try:
        data = request.json
        patient_id = data.get('patient_id')
        
        patients = load_patients()
        patient = next((p for p in patients if p['id'] == patient_id), None)
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404

        results = patient.get('screenings', {})
        report = generate_rag_report(patient, results)

        # Save report to patient
        patient['report'] = report
        save_patients(patients)

        return jsonify(report)

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports/<patient_id>', methods=['GET'])
def get_report(patient_id):
    """Get existing report for a patient."""
    patients = load_patients()
    patient = next((p for p in patients if p['id'] == patient_id), None)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
    if not patient.get('report'):
        return jsonify({'error': 'No report generated yet'}), 404
    return jsonify(patient['report'])


# ── Save screening result to patient ──────────────────────────────────────────
@app.route('/api/patients/<patient_id>/screening', methods=['POST'])
def save_screening(patient_id):
    """Save a screening result to a patient's record."""
    try:
        patients = load_patients()
        patient = next((p for p in patients if p['id'] == patient_id), None)
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404

        data = request.json
        screening_type = data.get('type')  # eye, skin, hemoglobin, diabetes
        result = data.get('result')

        if not screening_type or not result:
            return jsonify({'error': 'Type and result required'}), 400

        if 'screenings' not in patient:
            patient['screenings'] = {}
        
        patient['screenings'][screening_type] = {
            **result,
            'screened_at': datetime.now().isoformat()
        }
        save_patients(patients)
        return jsonify(patient)

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ── Serve React Frontend (Production) ─────────────────────────────────────────
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')


# ─── Main ─────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("[*] MedVision AI - Starting server...")
    load_models()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
