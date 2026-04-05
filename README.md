<div align="center">
  <h1>🏥 MedVision AI</h1>
  <p><strong>Portable AI-Powered Multi-Disease Screening System</strong></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![React](https://img.shields.io/badge/Frontend-React+Vite-blue)](https://react.dev)
  [![Python API](https://img.shields.io/badge/Backend-Python%20Flask-green)](https://flask.palletsprojects.com/)
</div>

<br />

> A portable, low-cost embedded healthcare device enabling real-time, non-invasive multi-disease screening using AI-driven vision and biosensing.

## Features

- **Eye Disease Screening** — Detects Cataract, Diabetic Retinopathy, Glaucoma
- **Skin Lesion Analysis** — Benign vs Malignant classification
- **Hemoglobin Estimation** — Non-invasive anemia risk flagging
- **Diabetes Risk Assessment** — ML-based glucose pattern analysis
- **RAG-Based Reports** — Doctor-ready structured medical reports
- **PDF Download** — Print-ready diagnostic reports
- **Webcam / ESP32-CAM** — Camera integration for screening
- **Patient Management** — Store up to 5 patient records

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React + Vite |
| **Backend** | Python Flask |
| **AI/ML** | Scikit-learn, MobileNetV2, EfficientNet, ResNet |
| **Reports** | jsPDF |
| **Hardware** | ESP32-CAM |
| **Deployment**| Render |

---

## Quick Start

### Prerequisites
Before you start, make sure you have the following installed:
- [Node.js](https://nodejs.org/en/) 18+
- [Python](https://www.python.org/downloads/) 3.10+
- `pip` package manager

### 1. Clone & Setup
Clone the repository to your local machine:
```bash
git clone https://github.com/ATHARVA316-DEV/MedVision_Al.git
cd MedVision_Al
```

### 2. Backend Setup
Set up the Python Flask API and train initial demo ML models.
```bash
cd backend
pip install -r requirements.txt
python training/create_demo_models.py  # Train AI models
python app.py                           # Start Flask server (port 5000)
```

### 3. Frontend Setup
In a new terminal window, navigate to the `frontend` directory:
```bash
cd frontend
npm install
npm run dev  # Start dev server
```

### 4. View Dashboard
Navigate to `http://localhost:5173` in your browser.

---

## 📷 ESP32-CAM Setup

MedVision AI supports live camera feeds for non-invasive screening via the ESP32-CAM module.

1. Open `esp32/medvision_cam.ino` in the Arduino IDE.
2. Update the `ssid` and `password` with your network credentials.
3. Upload the firmware to your ESP32-CAM.
4. Note the allocated IP address from the Serial Monitor (115200 baud).
5. Enter the stream URL in the dashboard: `http://<ip>:81/stream`.

---

## ☁️ Deployment (Render)

Deploying MedVision AI to the cloud is simplified using [Render](https://render.com/).

1. Push your code to GitHub.
2. Connect your repository to Render.
3. The included `render.yaml` configuration file will automatically define services.
4. Click **Deploy**!

---

## 📂 Project Structure

```text
MedVision_Al/
├── frontend/          # React + Vite application
│   ├── src/
│   │   ├── pages/     # LandingPage, Dashboard, ReportPage
│   │   └── ...
│   └── package.json
├── backend/           # Flask API + ML models
│   ├── app.py         # Main Flask server entry point
│   ├── models/        # Trained .pkl models
│   ├── training/      # Model training scripts
│   └── data/          # Patient data storage (JSON)
├── esp32/             # Arduino firmware for ESP32-CAM
├── ml_models/         # Additional ML model scripts/utilities
└── render.yaml        # Infrastructure-as-code for Render
```

---

*© 2026 Artsy Technologies Pvt Ltd. All rights reserved.*
