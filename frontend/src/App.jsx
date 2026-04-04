import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import ReportPage from './pages/ReportPage'
import './App.css'

const API_BASE = '/api'

function App() {
  const [patients, setPatients] = useState([])
  const [currentPatient, setCurrentPatient] = useState(null)

  const fetchPatients = async () => {
    try {
      const res = await fetch(`${API_BASE}/patients`)
      if (res.ok) {
        const data = await res.json()
        setPatients(data)
      }
    } catch (err) {
      console.error('Failed to fetch patients:', err)
    }
  }

  useEffect(() => {
    fetchPatients()
  }, [])

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={
          <Dashboard
            patients={patients}
            setPatients={setPatients}
            currentPatient={currentPatient}
            setCurrentPatient={setCurrentPatient}
            fetchPatients={fetchPatients}
          />
        } />
        <Route path="/report/:patientId" element={<ReportPage />} />
      </Routes>
    </Router>
  )
}

export default App
