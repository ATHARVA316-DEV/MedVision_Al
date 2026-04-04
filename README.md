<<<<<<< HEAD
# MedVision AI

**Portable AI-Powered Multi-Disease Screening System**

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
|-------|-----------|
| Frontend | React + Vite |
| Backend | Python Flask |
| AI/ML | Scikit-learn, MobileNetV2 |
| Reports | jsPDF |
| Hardware | ESP32-CAM |
| Deployment | Render |

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- pip

### 1. Clone & Setup
```bash
git clone <your-repo>
cd "MedVision AI"
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python training/create_demo_models.py  # Train AI models
python app.py                           # Start Flask server (port 5000)
```

### 3. Frontend Setup (new terminal)
```bash
cd frontend
npm install
npm run dev  # Start dev server (port 5173)
```

### 4. Open Browser
Navigate to `http://localhost:5173`

## ESP32-CAM Setup

1. Open `esp32/medvision_cam.ino` in Arduino IDE
2. Update WiFi credentials
3. Upload to ESP32-CAM
4. Note the IP address from Serial Monitor
5. Enter stream URL in dashboard: `http://<ip>:81/stream`

## Deployment (Render)

1. Push to GitHub
2. Connect repo to Render
3. Use `render.yaml` configuration
4. Deploy!

## Project Structure

```
MedVision AI/
├── frontend/          # React + Vite app
│   ├── src/
│   │   ├── pages/     # LandingPage, Dashboard, ReportPage
│   │   └── ...
│   └── package.json
├── backend/           # Flask API + ML models
│   ├── app.py         # Main server
│   ├── models/        # Trained .pkl models
│   ├── training/      # Model training scripts
│   └── data/          # Patient data (JSON)
├── esp32/             # Arduino firmware
└── render.yaml        # Cloud deployment config
```

## Team
Artsy Technologies Pvt Ltd. | @HACKOLYMPIC

---
*© 2026 Artsy Technologies Pvt Ltd. All rights reserved.*
=======
# MedVision_Al
>>>>>>> 0458321238053c032e935e6564619c8470c3da2b
