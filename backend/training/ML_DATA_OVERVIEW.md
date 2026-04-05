# 🧠 Medical AI Models – Dataset Documentation

This repository contains multiple machine learning models trained for healthcare-related predictions, including eye disease detection, skin lesion classification, diabetes risk assessment, and hemoglobin estimation.

---

## 📊 Datasets Used

### 👁️ 1. Eye Disease Model (ResNet50)

- **Model:** ResNet50 (Transfer Learning)
- **Weights File:** `resnet50_eye_weights.h5`

#### 📌 Dataset Source
- Built on **ImageNet pre-trained weights**
- Fine-tuned using external clinical datasets such as:
  - ODIR (Ocular Disease Intelligent Recognition)
  - Other open ophthalmology datasets

#### 🧬 Classes:
- Cataract  
- Diabetic Retinopathy  
- Glaucoma  
- Normal  

#### ⚠️ Note:
- Pre-trained medical weights were directly used

#### 🔁 Fallback Model:
- Uses **synthetic dataset**
- Features simulated:
  - Brightness
  - Contrast
  - Center-periphery intensity
  - Red channel distribution

---

### 🧴 2. Skin Lesion Model

- **Model:** Random Forest Classifier
- **File:** `skin_model.pkl`

#### 📌 Dataset Type:
- Fully **synthetic dataset (generated at runtime)**

#### 📊 Dataset Size:
- 4,000 samples

#### 🧬 Features:
- RGB mean values  
- RGB standard deviation  
- Texture gradients  
- Symmetry metrics  

#### 🧠 Label Logic:
- **Benign:**
  - Uniform color
  - Low contrast
  - High symmetry

- **Malignant:**
  - Irregular color distribution
  - High texture variation
  - Asymmetry

---

### 🩸 3. Diabetes Risk Model

- **Model:** Random Forest Classifier

#### 📌 Dataset Type:
- Synthetic dataset inspired by real-world medical data

#### 📊 Dataset Size:
- 2,000 samples

#### 📊 Features:
- Pregnancies  
- Glucose  
- Blood Pressure  
- Skin Thickness  
- Insulin  
- BMI  
- Diabetes Pedigree Function  
- Age  

#### 📚 Inspiration:
- Based on distributions similar to:
  - Pima Indians Diabetes Dataset

---

### ❤️ 4. Hemoglobin Estimation Model

- **Model:** EfficientNet / Random Forest Regressor

#### 📌 Dataset Type:
- Synthetic dataset

#### 📊 Dataset Size:
- 2,000 samples

#### 📊 Features:
- SpO2 (Blood Oxygen Saturation)  
- Heart Rate  
- Age  
- Gender  

#### ⚙️ Simulation Logic:
- Clinical rules applied:
  - Lower SpO2 → lower hemoglobin
  - High heart rate → stress factor
  - Severe penalty cases:
    - SpO2 < 92%
    - HR > 100 bpm

---

## ⚠️ Disclaimer

- Some models rely on **synthetic datasets**, not real clinical data
- Predictions are **approximate and for educational/research use only**
- Not intended for medical diagnosis

---

## 🚀 Summary

| Model | Dataset Type | Samples | Approach |
|------|------------|--------|---------|
| Eye Disease | Real + Pretrained | External | Deep Learning (ResNet50) |
| Skin Lesion | Synthetic | 4000 | Random Forest |
| Diabetes | Synthetic | 2000 | Random Forest |
| Hemoglobin | Synthetic | 2000 | Regression and  EfficientNet |

