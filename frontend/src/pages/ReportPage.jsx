import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import './ReportPage.css'

const API_BASE = '/api'

export default function ReportPage() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [doctorNotes, setDoctorNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const reportRef = useRef(null)

  useEffect(() => {
    fetchReport()
  }, [patientId])

  const fetchReport = async () => {
    try {
      const [reportRes, patientRes] = await Promise.all([
        fetch(`${API_BASE}/reports/${patientId}`),
        fetch(`${API_BASE}/patients/${patientId}`)
      ])
      if (reportRes.ok) {
        const rData = await reportRes.json()
        setReport(rData)
      }
      if (patientRes.ok) {
        const pData = await patientRes.json()
        setPatient(pData)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical': return '#ef4444'
      case 'high': return '#f59e0b'
      case 'moderate': return '#f59e0b'
      default: return '#10b981'
    }
  }

  const getUrgencyLabel = (urgency) => {
    switch (urgency) {
      case 'critical': return 'CRITICAL'
      case 'high': return 'HIGH'
      case 'moderate': return 'MODERATE'
      default: return 'NORMAL'
    }
  }

  const getUrgencyBadgeClass = (urgency) => {
    switch (urgency) {
      case 'critical': return 'badge-danger'
      case 'high': return 'badge-danger'
      case 'moderate': return 'badge-warning'
      default: return 'badge-success'
    }
  }

  const downloadPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 20

    // Helper functions
    const addLine = () => { doc.setDrawColor(200, 200, 200); doc.line(15, y, pageWidth - 15, y); y += 5; }
    const checkPage = (needed) => { if (y + needed > 270) { doc.addPage(); y = 20; } }

    // ─── Header ───
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, pageWidth, 35, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('MedVision AI', 15, 15)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('AI-Powered Multi-Disease Screening Report', 15, 22)
    doc.setFontSize(8)
    doc.text(`Generated: ${new Date(report.generated_at).toLocaleString()}`, 15, 29)
    doc.text(`Report ID: ${report.id?.substring(0, 8)}`, pageWidth - 15, 29, { align: 'right' })

    y = 45

    // ─── Patient Info ───
    doc.setTextColor(30, 58, 95)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Patient Information', 15, y)
    y += 8

    doc.setTextColor(60, 60, 60)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const patientInfo = report.patient
    doc.text(`Name: ${patientInfo.name}`, 15, y)
    doc.text(`Age: ${patientInfo.age}`, 90, y)
    doc.text(`Gender: ${patientInfo.gender}`, 140, y)
    y += 6
    doc.text(`Patient ID: ${patientInfo.id}`, 15, y)
    y += 8
    addLine()

    // ─── Overall Risk ───
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 58, 95)
    doc.text('Overall Risk Assessment', 15, y)
    y += 8

    const riskColor = getUrgencyColor(report.overall_risk)
    const rgb = hexToRgb(riskColor)
    doc.setFillColor(rgb.r, rgb.g, rgb.b)
    doc.roundedRect(15, y, 60, 10, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(getUrgencyLabel(report.overall_risk), 45, y + 7, { align: 'center' })
    y += 16

    doc.setTextColor(80, 80, 80)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const summaryLines = doc.splitTextToSize(report.summary, pageWidth - 30)
    doc.text(summaryLines, 15, y)
    y += summaryLines.length * 5 + 6
    addLine()

    // ─── Screening Results ───
    report.screening_results.forEach((result) => {
      checkPage(60)

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 58, 95)
      doc.text(`${result.type}`, 15, y)
      y += 7

      // Prediction & Confidence
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      doc.text(`Prediction: ${result.prediction}`, 20, y)
      doc.text(`Confidence: ${result.confidence}%`, 110, y)
      y += 6

      // Urgency badge
      const uColor = getUrgencyColor(result.urgency)
      const uRgb = hexToRgb(uColor)
      doc.setFillColor(uRgb.r, uRgb.g, uRgb.b)
      doc.roundedRect(20, y, 40, 7, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.text(`Risk: ${getUrgencyLabel(result.urgency)}`, 40, y + 5, { align: 'center' })
      y += 12

      // Description
      doc.setTextColor(80, 80, 80)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const descLines = doc.splitTextToSize(result.description, pageWidth - 40)
      doc.text(descLines, 20, y)
      y += descLines.length * 4.5 + 4

      // Recommendations
      if (result.recommendations?.length) {
        checkPage(result.recommendations.length * 6 + 10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 58, 95)
        doc.setFontSize(9)
        doc.text('Recommendations:', 20, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 80)
        result.recommendations.forEach((rec) => {
          checkPage(8)
          const recLines = doc.splitTextToSize(`• ${rec}`, pageWidth - 45)
          doc.text(recLines, 25, y)
          y += recLines.length * 4.5 + 2
        })
      }
      y += 4
      addLine()
    })

    // ─── Doctor Notes ───
    if (doctorNotes) {
      checkPage(30)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 58, 95)
      doc.text('Doctor Notes', 15, y)
      y += 7
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      const noteLines = doc.splitTextToSize(doctorNotes, pageWidth - 30)
      doc.text(noteLines, 15, y)
      y += noteLines.length * 4.5 + 6
      addLine()
    }

    // ─── Disclaimer ───
    checkPage(30)
    doc.setFillColor(248, 250, 252)
    doc.rect(15, y, pageWidth - 30, 22, 'F')
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.setFont('helvetica', 'italic')
    const disclaimerLines = doc.splitTextToSize(report.disclaimer, pageWidth - 40)
    doc.text(disclaimerLines, 20, y + 5)

    // ─── Footer ───
    const totalPages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.setFont('helvetica', 'normal')
      doc.text(`MedVision AI - Portable Health Screening | Page ${i} of ${totalPages}`, pageWidth / 2, 290, { align: 'center' })
      doc.text('© 2026 Artsy Technologies Pvt Ltd.', pageWidth / 2, 294, { align: 'center' })
    }

    doc.save(`MedVision_Report_${report.patient.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 }
  }

  if (loading) {
    return (
      <div className="report-loading">
        <div className="spinner-large"></div>
        <p>Loading report...</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="report-loading">
        <h2>No Report Found</h2>
        <p>Generate a report from the dashboard first.</p>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
      </div>
    )
  }

  return (
    <div className="report-page">
      {/* Header Bar */}
      <header className="report-header-bar">
        <div className="rhb-left">
          <button className="btn btn-sm" onClick={() => navigate('/dashboard')} style={{ background:'rgba(255,255,255,0.1)', color:'white', border:'1px solid rgba(255,255,255,0.15)' }}>
            ← Dashboard
          </button>
          <h1>Medical Screening Report</h1>
        </div>
        <div className="rhb-right">
          <button className="btn btn-success btn-sm" onClick={downloadPDF}>
            📥 Download PDF
          </button>
          <button className="btn btn-sm" onClick={() => window.print()} style={{ background:'rgba(255,255,255,0.1)', color:'white', border:'1px solid rgba(255,255,255,0.15)' }}>
            🖨 Print
          </button>
        </div>
      </header>

      {/* Report Content */}
      <div className="report-container" ref={reportRef}>
        {/* Report Title */}
        <div className="report-title-section">
          <div className="report-logo">
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="url(#rg)" strokeWidth="2.5" />
              <path d="M11 16h10M16 11v10" stroke="url(#rg)" strokeWidth="2.5" strokeLinecap="round" />
              <defs><linearGradient id="rg" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#14b8a6"/><stop offset="1" stopColor="#3b82f6"/></linearGradient></defs>
            </svg>
            <div>
              <h2>MedVision <span className="text-gradient">AI</span></h2>
              <p>AI-Powered Multi-Disease Screening Report</p>
            </div>
          </div>
          <div className="report-meta">
            <span>Report ID: {report.id?.substring(0, 8)}</span>
            <span>Date: {new Date(report.generated_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Patient Info */}
        <div className="report-patient-card">
          <h3>Patient Information</h3>
          <div className="rpc-grid">
            <div><span className="rpc-label">Name</span><span className="rpc-value">{report.patient.name}</span></div>
            <div><span className="rpc-label">Age</span><span className="rpc-value">{report.patient.age} years</span></div>
            <div><span className="rpc-label">Gender</span><span className="rpc-value">{report.patient.gender}</span></div>
            <div><span className="rpc-label">Patient ID</span><span className="rpc-value">{report.patient.id}</span></div>
          </div>
        </div>

        {/* Overall Risk */}
        <div className="report-risk-card">
          <div className="risk-header">
            <h3>Overall Risk Assessment</h3>
            <span className={`badge ${getUrgencyBadgeClass(report.overall_risk)}`}>
              {getUrgencyLabel(report.overall_risk)} RISK
            </span>
          </div>
          <p className="risk-summary">{report.summary}</p>
        </div>

        {/* Screening Results */}
        {report.screening_results.map((result, idx) => (
          <div key={idx} className="report-result-card">
            <div className="rrc-header">
              <div className="rrc-title">
                <span className="rrc-icon">{result.icon}</span>
                <h3>{result.type}</h3>
              </div>
              <span className={`badge ${getUrgencyBadgeClass(result.urgency)}`}>
                {getUrgencyLabel(result.urgency)}
              </span>
            </div>

            <div className="rrc-prediction">
              <div className="rrc-pred-main">
                <span className="rrc-pred-label">Prediction</span>
                <span className="rrc-pred-value" style={{ color: getUrgencyColor(result.urgency) }}>
                  {result.prediction}
                </span>
              </div>
              <div className="rrc-pred-conf">
                <span className="rrc-pred-label">Confidence</span>
                <div className="rrc-conf-bar">
                  <div className="rrc-conf-fill" style={{ width: `${result.confidence}%` }}></div>
                </div>
                <span className="rrc-conf-pct">{result.confidence}%</span>
              </div>
            </div>

            <p className="rrc-description">{result.description}</p>

            {result.risk_factors && result.risk_factors !== 'N/A' && (
              <div className="rrc-info-box">
                <strong>Risk Factors:</strong> {result.risk_factors}
              </div>
            )}

            {result.recommendations?.length > 0 && (
              <div className="rrc-recommendations">
                <h4>Recommendations</h4>
                <ul>
                  {result.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        {/* Doctor Notes */}
        <div className="report-notes-card">
          <div className="notes-header">
            <h3>Doctor's Notes</h3>
            <button className="btn btn-outline btn-sm" onClick={() => setEditingNotes(!editingNotes)}>
              {editingNotes ? 'Done' : '✏️ Edit Notes'}
            </button>
          </div>
          {editingNotes ? (
            <textarea
              className="notes-textarea"
              placeholder="Add clinical observations, additional recommendations, or validation notes..."
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              rows={5}
            />
          ) : (
            <p className="notes-display">{doctorNotes || 'No doctor notes added yet. Click "Edit Notes" to add clinical observations.'}</p>
          )}
        </div>

        {/* Disclaimer */}
        <div className="report-disclaimer">
          <p>{report.disclaimer}</p>
        </div>

        {/* Footer */}
        <div className="report-footer-info">
          <p>MedVision AI — Portable Health Screening</p>
          <p>© 2026 Artsy Technologies Pvt Ltd. | @HACKOLYMPIC</p>
        </div>
      </div>
    </div>
  )
}
