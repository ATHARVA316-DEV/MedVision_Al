import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

const API_BASE = '/api'

export default function Dashboard({ patients, setPatients, currentPatient, setCurrentPatient, fetchPatients }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('eye')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showWebcam, setShowWebcam] = useState(false)
  const [esp32Url, setEsp32Url] = useState('')
  const [showEsp32Input, setShowEsp32Input] = useState(false)
  const [esp32Status, setEsp32Status] = useState('idle') // idle | connecting | connected | error
  const [esp32Error, setEsp32Error] = useState('')
  const [newPatient, setNewPatient] = useState({ name: '', age: '', gender: '' })
  const [showNewPatient, setShowNewPatient] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [result, setResult] = useState(null)
  const [sensorData, setSensorData] = useState({
    spo2: '98', heart_rate: '72',
    pregnancies: '0', glucose: '100', blood_pressure: '70',
    skin_thickness: '20', insulin: '80', bmi: '25', diabetes_pedigree: '0.5'
  })

  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  // ── Patient CRUD ──────────────────────────────────────────────
  const createPatient = async () => {
    if (!newPatient.name || !newPatient.age || !newPatient.gender) return alert('Please fill all fields')
    if (patients.length >= 5) return alert('Maximum 5 patients allowed. Delete one first.')
    try {
      const res = await fetch(`${API_BASE}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatient)
      })
      if (res.ok) {
        const patient = await res.json()
        await fetchPatients()
        setCurrentPatient(patient)
        setShowNewPatient(false)
        setNewPatient({ name: '', age: '', gender: '' })
      } else {
        const err = await res.json()
        alert(err.error)
      }
    } catch (e) { console.error(e) }
  }

  const deletePatient = async (id) => {
    if (!confirm('Delete this patient?')) return
    await fetch(`${API_BASE}/patients/${id}`, { method: 'DELETE' })
    if (currentPatient?.id === id) setCurrentPatient(null)
    fetchPatients()
  }

  // ── Image Handling ────────────────────────────────────────────
  const handleImageFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setPreviewImage(reader.result)
    reader.readAsDataURL(file)
    setResult(null)
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file?.type.startsWith('image/')) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setPreviewImage(reader.result)
    reader.readAsDataURL(file)
    setResult(null)
  }, [])

  // ── Webcam ────────────────────────────────────────────────────
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setShowWebcam(true)
    } catch (e) { alert('Unable to access camera: ' + e.message) }
  }

  const captureWebcam = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg')
    setPreviewImage(dataUrl)
    canvas.toBlob((blob) => { setImageFile(new File([blob], 'capture.jpg', { type: 'image/jpeg' })) }, 'image/jpeg')
    stopWebcam()
    setResult(null)
  }

  const stopWebcam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setShowWebcam(false)
  }

  // ── ESP32-CAM Capture ─────────────────────────────────────────
  const captureFromEsp32 = async (url) => {
    // Normalize: strip trailing slash, ensure /capture endpoint
    let baseUrl = (url || esp32Url).trim()
    baseUrl = baseUrl.replace(/\/stream$/, '').replace(/\/capture$/, '').replace(/\/$/, '')
    const finalUrl = baseUrl + '/capture'

    setEsp32Status('connecting')
    setEsp32Error('')
    setResult(null)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const res = await fetch(finalUrl, {
        signal: controller.signal,
        mode: 'cors'
      })
      clearTimeout(timeoutId)

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const blob = await res.blob()
      if (!blob.type.startsWith('image/')) throw new Error('Response is not an image')

      const file = new File([blob], 'esp32_capture.jpg', { type: 'image/jpeg' })
      const dataUrl = URL.createObjectURL(blob)

      setImageFile(file)
      setPreviewImage(dataUrl)
      setEsp32Status('connected')
    } catch (err) {
      const msg = err.name === 'AbortError'
        ? 'Connection timed out. Check if the ESP32-CAM is powered on and connected to the same network.'
        : `Failed to reach ESP32-CAM: ${err.message}`
      setEsp32Error(msg)
      setEsp32Status('error')
    }
  }

  // ── Analysis ──────────────────────────────────────────────────
  const analyzeImage = async (type) => {
    if (!currentPatient) return alert('Please select a patient first')
    if (!imageFile) return alert('Please upload or capture an image first')
    setIsAnalyzing(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      const res = await fetch(`${API_BASE}/predict/${type}`, { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        setResult(data)
        // Save to patient
        await fetch(`${API_BASE}/patients/${currentPatient.id}/screening`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, result: data })
        })
        fetchPatients()
      }
    } catch (e) { console.error(e) }
    setIsAnalyzing(false)
  }

  const analyzeSensor = async (type) => {
    if (!currentPatient) return alert('Please select a patient first')
    setIsAnalyzing(true)
    setResult(null)
    try {
      const payload = type === 'hemoglobin'
        ? { spo2: sensorData.spo2, heart_rate: sensorData.heart_rate, age: currentPatient.age, gender: currentPatient.gender }
        : { ...sensorData, age: currentPatient.age }
      const res = await fetch(`${API_BASE}/predict/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data)
        await fetch(`${API_BASE}/patients/${currentPatient.id}/screening`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, result: data })
        })
        fetchPatients()
      }
    } catch (e) { console.error(e) }
    setIsAnalyzing(false)
  }

  const generateReport = async () => {
    if (!currentPatient) return alert('Please select a patient')
    try {
      const res = await fetch(`${API_BASE}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: currentPatient.id })
      })
      if (res.ok) navigate(`/report/${currentPatient.id}`)
    } catch (e) { console.error(e) }
  }

  const clearPreview = () => {
    setPreviewImage(null)
    setImageFile(null)
    setResult(null)
  }

  const getUrgencyClass = (urgency) => {
    switch(urgency) {
      case 'critical': return 'badge-danger'
      case 'high': return 'badge-danger'
      case 'moderate': return 'badge-warning'
      default: return 'badge-success'
    }
  }

  const tabConfig = {
    eye: { label: 'Eye Scan', icon: '👁', type: 'image', desc: 'Upload or capture an eye/retinal image for screening' },
    skin: { label: 'Skin Analysis', icon: '🔬', type: 'image', desc: 'Upload or capture a skin lesion image for analysis' },
    hemoglobin: { label: 'Hemoglobin', icon: '🩸', type: 'sensor', desc: 'Enter biosensor readings for hemoglobin estimation' },
    diabetes: { label: 'Diabetes Risk', icon: '📊', type: 'sensor', desc: 'Enter health parameters for diabetes risk assessment' },
  }

  const isImageTab = tabConfig[activeTab]?.type === 'image'

  return (
    <div className="dashboard">
      {/* Top Bar */}
      <header className="dash-header">
        <div className="dash-header-left">
          <button className="btn btn-sm" onClick={() => navigate('/')} style={{ background:'rgba(255,255,255,0.1)', color:'white', border:'1px solid rgba(255,255,255,0.15)' }}>
            ← Back
          </button>
          <h1>MedVision <span className="text-gradient">AI</span> — Diagnostic Dashboard</h1>
        </div>
        {currentPatient && (
          <button className="btn btn-primary btn-sm" onClick={generateReport}>
            📋 Generate Report
          </button>
        )}
      </header>

      <div className="dash-layout">
        {/* ── Sidebar: Patients ─────────────────────────────────────── */}
        <aside className="dash-sidebar">
          <div className="sidebar-header">
            <h3>Patients</h3>
            <span className="badge badge-info">{patients.length}/5</span>
          </div>

          <div className="patient-list">
            {patients.map((p) => (
              <div key={p.id}
                className={`patient-item ${currentPatient?.id === p.id ? 'active' : ''}`}
                onClick={() => { setCurrentPatient(p); setResult(null); clearPreview(); }}>
                <div className="patient-avatar">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="patient-info">
                  <span className="patient-name">{p.name}</span>
                  <span className="patient-meta">{p.age}y • {p.gender}</span>
                </div>
                <div className="patient-screenings">
                  {p.screenings?.eye && <span title="Eye screened">👁</span>}
                  {p.screenings?.skin && <span title="Skin screened">🔬</span>}
                  {p.screenings?.hemoglobin && <span title="Hb screened">🩸</span>}
                  {p.screenings?.diabetes && <span title="Diabetes screened">📊</span>}
                </div>
                <button className="patient-delete" onClick={(e) => { e.stopPropagation(); deletePatient(p.id) }}>×</button>
              </div>
            ))}
          </div>

          {patients.length < 5 && (
            <div>
              {showNewPatient ? (
                <div className="new-patient-form">
                  <input className="form-input" placeholder="Full Name" value={newPatient.name}
                    onChange={(e) => setNewPatient({...newPatient, name: e.target.value})} />
                  <input className="form-input" placeholder="Age" type="number" value={newPatient.age}
                    onChange={(e) => setNewPatient({...newPatient, age: e.target.value})} />
                  <select className="form-select" value={newPatient.gender}
                    onChange={(e) => setNewPatient({...newPatient, gender: e.target.value})}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="form-buttons">
                    <button className="btn btn-primary btn-sm" onClick={createPatient}>Add Patient</button>
                    <button className="btn btn-sm" onClick={() => setShowNewPatient(false)} style={{ background:'#e2e8f0', color:'#475569' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="btn btn-outline add-patient-btn" onClick={() => setShowNewPatient(true)}>
                  + Add Patient
                </button>
              )}
            </div>
          )}
        </aside>

        {/* ── Main Content ──────────────────────────────────────────── */}
        <main className="dash-main">
          {!currentPatient ? (
            <div className="dash-empty">
              <div className="empty-icon">🏥</div>
              <h2>Select or Add a Patient</h2>
              <p>Choose a patient from the sidebar or add a new one to begin screening.</p>
            </div>
          ) : (
            <>
              {/* Patient Header */}
              <div className="patient-header-card">
                <div className="phc-avatar">{currentPatient.name.charAt(0).toUpperCase()}</div>
                <div>
                  <h2>{currentPatient.name}</h2>
                  <p>{currentPatient.age} years • {currentPatient.gender} • ID: {currentPatient.id}</p>
                </div>
              </div>

              {/* Screening Tabs */}
              <div className="screening-tabs">
                {Object.entries(tabConfig).map(([key, cfg]) => (
                  <button key={key}
                    className={`tab-btn ${activeTab === key ? 'active' : ''}`}
                    onClick={() => { setActiveTab(key); setResult(null); clearPreview(); }}>
                    <span className="tab-icon">{cfg.icon}</span>
                    <span>{cfg.label}</span>
                  </button>
                ))}
              </div>

              {/* Screening Content */}
              <div className="screening-content">
                <div className="screening-description">
                  <p>{tabConfig[activeTab].desc}</p>
                </div>

                {isImageTab ? (
                  <div className="image-section">
                    {/* Image Input Area */}
                    <div className="image-input-area">
                      {showWebcam ? (
                        <div className="webcam-preview">
                          <video ref={videoRef} autoPlay playsInline muted className="webcam-video" />
                          <div className="webcam-controls">
                            <button className="btn btn-primary" onClick={captureWebcam}>📸 Capture</button>
                            <button className="btn btn-sm" onClick={stopWebcam} style={{ background:'rgba(255,255,255,0.1)', color:'white' }}>Cancel</button>
                          </div>
                        </div>
                      ) : previewImage ? (
                        <div className="image-preview">
                          <img src={previewImage} alt="Preview" />
                          <button className="preview-clear" onClick={clearPreview}>×</button>
                        </div>
                      ) : (
                        <div className="drop-zone"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}>
                          <div className="drop-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                              <polyline points="17 8 12 3 7 8"/>
                              <line x1="12" y1="3" x2="12" y2="15"/>
                            </svg>
                          </div>
                          <p className="drop-text">Drag & drop an image here</p>
                          <p className="drop-subtext">or click to browse (JPEG, PNG)</p>
                        </div>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageFile} />
                    </div>

                    {/* Camera Buttons */}
                    <div className="camera-buttons">
                      <button className="btn btn-outline btn-sm" onClick={startWebcam}>
                        📷 Webcam
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => setShowEsp32Input(!showEsp32Input)}>
                        📡 ESP32-CAM
                      </button>
                    </div>

                    {showEsp32Input && (
                      <div className="esp32-input">
                        <input className="form-input"
                          placeholder="ESP32-CAM IP (e.g., http://192.168.1.100)"
                          value={esp32Url}
                          onChange={(e) => { setEsp32Url(e.target.value); setEsp32Status('idle'); setEsp32Error(''); }} />
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={!esp32Url.trim() || esp32Status === 'connecting'}
                          onClick={() => captureFromEsp32()}>
                          {esp32Status === 'connecting' ? '⏳ Connecting…' : '📸 Capture'}
                        </button>
                        {esp32Status === 'connected' && (
                          <button className="btn btn-outline btn-sm" onClick={() => captureFromEsp32()}>
                            🔄 Re-capture
                          </button>
                        )}
                        {esp32Status === 'error' && (
                          <p className="esp32-error" style={{ color: '#ef4444', fontSize: '0.8rem', margin: '6px 0 0', lineHeight: 1.4 }}>
                            ⚠️ {esp32Error}
                          </p>
                        )}
                        {esp32Status === 'connected' && (
                          <p style={{ color: '#10b981', fontSize: '0.8rem', margin: '6px 0 0' }}>
                            ✅ Image captured — ready to analyze
                          </p>
                        )}
                      </div>
                    )}

                    {/* Analyze Button */}
                    <button className="btn btn-primary btn-lg analyze-btn"
                      onClick={() => analyzeImage(activeTab)}
                      disabled={!imageFile || isAnalyzing}>
                      {isAnalyzing ? (
                        <><span className="spinner"></span> Analyzing...</>
                      ) : (
                        <>🧠 Analyze {tabConfig[activeTab].label}</>
                      )}
                    </button>
                  </div>
                ) : (
                  /* Sensor Input Area */
                  <div className="sensor-section">
                    {activeTab === 'hemoglobin' ? (
                      <div className="sensor-form">
                        <div className="form-group">
                          <label className="form-label">SpO2 Level (%)</label>
                          <input className="form-input" type="number" min="80" max="100" step="0.1"
                            value={sensorData.spo2}
                            onChange={(e) => setSensorData({...sensorData, spo2: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Heart Rate (BPM)</label>
                          <input className="form-input" type="number" min="40" max="200"
                            value={sensorData.heart_rate}
                            onChange={(e) => setSensorData({...sensorData, heart_rate: e.target.value})} />
                        </div>
                        <div className="sensor-info-box">
                          <p>💡 In a real device, these values are read from the MAX30102 sensor via ESP32. For this demo, enter the values manually.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="sensor-form diabetes-form">
                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label">Glucose (mg/dL)</label>
                            <input className="form-input" type="number" value={sensorData.glucose}
                              onChange={(e) => setSensorData({...sensorData, glucose: e.target.value})} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Blood Pressure (mmHg)</label>
                            <input className="form-input" type="number" value={sensorData.blood_pressure}
                              onChange={(e) => setSensorData({...sensorData, blood_pressure: e.target.value})} />
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label">BMI (kg/m²)</label>
                            <input className="form-input" type="number" step="0.1" value={sensorData.bmi}
                              onChange={(e) => setSensorData({...sensorData, bmi: e.target.value})} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Insulin (µU/mL)</label>
                            <input className="form-input" type="number" value={sensorData.insulin}
                              onChange={(e) => setSensorData({...sensorData, insulin: e.target.value})} />
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label">Skin Thickness (mm)</label>
                            <input className="form-input" type="number" value={sensorData.skin_thickness}
                              onChange={(e) => setSensorData({...sensorData, skin_thickness: e.target.value})} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Pregnancies</label>
                            <input className="form-input" type="number" min="0" value={sensorData.pregnancies}
                              onChange={(e) => setSensorData({...sensorData, pregnancies: e.target.value})} />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Diabetes Pedigree Function</label>
                          <input className="form-input" type="number" step="0.01" value={sensorData.diabetes_pedigree}
                            onChange={(e) => setSensorData({...sensorData, diabetes_pedigree: e.target.value})} />
                        </div>
                      </div>
                    )}

                    <button className="btn btn-primary btn-lg analyze-btn"
                      onClick={() => analyzeSensor(activeTab)}
                      disabled={isAnalyzing}>
                      {isAnalyzing ? (
                        <><span className="spinner"></span> Analyzing...</>
                      ) : (
                        <>🧠 Analyze {tabConfig[activeTab].label}</>
                      )}
                    </button>
                  </div>
                )}

                {/* Results */}
                {result && (
                  <div className="result-section animate-fade-up">
                    <h3>Analysis Results</h3>
                    {activeTab === 'eye' && (
                      <div className="result-card">
                        <div className="result-main">
                          <span className="result-label">Eye Condition</span>
                          <div className="result-header-row">
                            <span className={`result-value ${result.prediction === 'Normal' ? 'result-ok' : 'result-alert'}`}>
                              {result.prediction}
                            </span>
                            {result.urgency && (
                              <span className={`badge ${getUrgencyClass(result.urgency)}`}>
                                {result.urgency.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>

                        {result.explanation && (
                          <div className="result-explanation">
                            <p>{result.explanation}</p>
                          </div>
                        )}

                        <div className="result-confidence">
                          <span>Confidence</span>
                          <div className="confidence-bar">
                            <div className="confidence-fill" style={{ width: `${(result.confidence * 100).toFixed(1)}%` }}></div>
                          </div>
                          <span className="confidence-pct">{(result.confidence * 100).toFixed(1)}%</span>
                        </div>
                        {result.all_predictions && (
                          <div className="result-details">
                            {Object.entries(result.all_predictions).map(([cls, prob]) => (
                              <div key={cls} className="detail-row">
                                <span>{cls}</span>
                                <div className="detail-bar">
                                  <div className="detail-fill" style={{ width: `${(prob * 100).toFixed(1)}%` }}></div>
                                </div>
                                <span>{(prob * 100).toFixed(1)}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'skin' && (
                      <div className="result-card">
                        <div className="result-main">
                          <span className="result-label">Skin Lesion</span>
                          <span className={`result-value ${result.prediction === 'Benign' ? 'result-ok' : 'result-alert'}`}>
                            {result.prediction}
                          </span>
                        </div>
                        <div className="result-confidence">
                          <span>Confidence</span>
                          <div className="confidence-bar">
                            <div className="confidence-fill" style={{ width: `${(result.confidence * 100).toFixed(1)}%` }}></div>
                          </div>
                          <span className="confidence-pct">{(result.confidence * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    )}

                    {activeTab === 'hemoglobin' && (
                      <div className="result-card">
                        <div className="result-main">
                          <span className="result-label">Hemoglobin Estimate</span>
                          <span className={`result-value ${result.category === 'normal' ? 'result-ok' : 'result-alert'}`}>
                            {result.hemoglobin_estimate} g/dL
                          </span>
                        </div>
                        <div className="result-meta">
                          <span>Category: <strong>{result.category?.replace(/_/g, ' ')}</strong></span>
                          <span>Normal Range: {result.normal_range}</span>
                        </div>
                      </div>
                    )}

                    {activeTab === 'diabetes' && (
                      <div className="result-card">
                        <div className="result-main">
                          <span className="result-label">Diabetes Risk</span>
                          <span className={`result-value ${result.risk_level === 'low_risk' ? 'result-ok' : 'result-alert'}`}>
                            {result.risk_level?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="result-confidence">
                          <span>Risk Score</span>
                          <div className="confidence-bar">
                            <div className="confidence-fill"
                              style={{
                                width: `${(result.risk_score * 100).toFixed(1)}%`,
                                background: result.risk_score > 0.7 ? '#ef4444' : result.risk_score > 0.4 ? '#f59e0b' : '#10b981'
                              }}></div>
                          </div>
                          <span className="confidence-pct">{(result.risk_score * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
