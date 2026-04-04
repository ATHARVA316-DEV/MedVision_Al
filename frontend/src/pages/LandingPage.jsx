import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './LandingPage.css'

export default function LandingPage() {
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="landing">
      {/* ─── Navbar ─────────────────────────────────────────────────── */}
      <nav className={`landing-nav ${isScrolled ? 'scrolled' : ''}`}>
        <div className="container nav-inner">
          <div className="nav-brand">
            <div className="nav-logo">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" stroke="url(#grad)" strokeWidth="2.5" />
                <path d="M11 16h10M16 11v10" stroke="url(#grad)" strokeWidth="2.5" strokeLinecap="round" />
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="32" y2="32">
                    <stop stopColor="#14b8a6" />
                    <stop offset="1" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="nav-title">MedVision <span className="text-gradient">AI</span></span>
          </div>
          <div className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
            <a href="#home" onClick={() => setMobileMenuOpen(false)}>Home</a>
            <a href="#problem" onClick={() => setMobileMenuOpen(false)}>The Problem</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#tech" onClick={() => setMobileMenuOpen(false)}>Tech Stack</a>
            <a href="#team" onClick={() => setMobileMenuOpen(false)}>Team</a>
          </div>
          <button className="btn btn-primary btn-sm nav-cta" onClick={() => navigate('/dashboard')}>
            View Demo
          </button>
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>

      {/* ─── Hero Section ───────────────────────────────────────────── */}
      <section id="home" className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1"></div>
          <div className="hero-orb hero-orb-2"></div>
          <div className="hero-orb hero-orb-3"></div>
          <div className="hero-grid"></div>
        </div>
        <div className="container hero-content">
          <div className="hero-left animate-fade-up">
            <div className="hero-badge">
              <span className="hero-badge-dot"></span>
              AI-Powered Healthcare Device
            </div>
            <h1>
              Reimagining Healthcare with{' '}
              <span className="text-gradient">Portable, AI-Powered</span>{' '}
              Diagnostics
            </h1>
            <p className="hero-description">
              A portable, low-cost embedded healthcare device enabling real-time,
              non-invasive multi-disease screening using AI-driven vision and biosensing.
            </p>
            <div className="hero-buttons">
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                Explore the Device
              </button>
              <a href="#features" className="btn btn-secondary btn-lg">
                See Clinical Use Cases
              </a>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <strong>~85%</strong>
                <span>Accuracy</span>
              </div>
              <div className="hero-stat-divider"></div>
              <div className="hero-stat">
                <strong>5 min</strong>
                <span>Test Time</span>
              </div>
              <div className="hero-stat-divider"></div>
              <div className="hero-stat">
                <strong>4</strong>
                <span>Disease Types</span>
              </div>
            </div>
          </div>
          <div className="hero-right animate-fade-right delay-300">
            <div className="hero-cards">
              <div className="floating-card fc-1 animate-float">
                <div className="fc-icon fc-icon-eye">👁</div>
                <div className="fc-content">
                  <span className="fc-label">Diabetic Retinopathy</span>
                  <span className="fc-value fc-success">Low Risk — 92%</span>
                </div>
              </div>
              <div className="floating-card fc-2 animate-float delay-200">
                <div className="fc-icon fc-icon-skin">🔬</div>
                <div className="fc-content">
                  <span className="fc-label">Skin Lesion</span>
                  <span className="fc-value fc-success">Benign — 88%</span>
                </div>
              </div>
              <div className="floating-card fc-3 animate-float delay-400">
                <div className="fc-icon fc-icon-vitals">❤️</div>
                <div className="fc-content">
                  <span className="fc-label">Vitals</span>
                  <span className="fc-value fc-success">Normal Range</span>
                </div>
              </div>
              <div className="hero-device-mockup">
                <div className="device-screen">
                  <div className="device-header">
                    <div className="device-dot"></div>
                    <span>MedVision AI</span>
                  </div>
                  <div className="device-body">
                    <div className="device-scan-line"></div>
                    <div className="device-text">AI Analysis Active</div>
                    <div className="device-progress">
                      <div className="device-progress-bar"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-scroll-indicator">
          <div className="scroll-mouse">
            <div className="scroll-dot"></div>
          </div>
        </div>
      </section>

      {/* ─── Problem / Solution ─────────────────────────────────────── */}
      <section id="problem" className="problem-section section-padding">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Bridging the Healthcare Gap</span>
            <h2>The Crisis in <span className="text-gradient">Rural Healthcare</span></h2>
          </div>
          <div className="problem-grid">
            <div className="prob-card">
              <div className="prob-icon">🏥</div>
              <h3>Limited Access</h3>
              <p>Rural communities lack access to diagnostic facilities. Patients travel hours for basic screening tests.</p>
            </div>
            <div className="prob-card">
              <div className="prob-icon">⏳</div>
              <h3>Delayed Detection</h3>
              <p>Diseases go undetected until advanced stages due to absence of screening infrastructure.</p>
            </div>
            <div className="prob-card">
              <div className="prob-icon">💰</div>
              <h3>Expensive & Invasive</h3>
              <p>Traditional diagnostics require expensive lab equipment and invasive blood draws.</p>
            </div>
          </div>
          <div className="solution-box">
            <div className="solution-inner">
              <h3>Our <span className="text-gradient">Solution</span></h3>
              <div className="solution-features">
                <div className="sol-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  <span>Portable low-cost AI device</span>
                </div>
                <div className="sol-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  <span>Real-time non-invasive screening</span>
                </div>
                <div className="sol-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  <span>On-field diagnosis in minutes</span>
                </div>
                <div className="sol-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  <span>Doctor-ready reports with confidence scores</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ──────────────────────────────────────────── */}
      <section id="features" className="features-section section-padding">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Multi-Disease Screening in Your Palm</span>
            <h2>Four Screenings, <span className="text-gradient">One Device</span></h2>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrap feature-eye">
                <span className="feature-icon">👁</span>
              </div>
              <h3>Eye Scan</h3>
              <p>Detects diabetic retinopathy, cataracts, and glaucoma from retinal images using AI-powered vision analysis.</p>
              <div className="feature-result">
                <span className="badge badge-success">Cataract Detected</span>
                <span className="feature-confidence">92% confidence</span>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrap feature-skin">
                <span className="feature-icon">🔬</span>
              </div>
              <h3>Skin Analysis</h3>
              <p>Analyzes skin lesions and patterns. Dermatology AI models detect benign vs malignant conditions.</p>
              <div className="feature-result">
                <span className="badge badge-success">Lesion Detected</span>
                <span className="feature-confidence">88% confidence</span>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrap feature-hb">
                <span className="feature-icon">🩸</span>
              </div>
              <h3>Hemoglobin Level</h3>
              <p>Optical biosensing (MAX30102) for non-invasive Hb level check. Anemia risk flagging in seconds.</p>
              <div className="feature-result">
                <span className="badge badge-warning">Low Hemoglobin Flagged</span>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrap feature-diabetes">
                <span className="feature-icon">📊</span>
              </div>
              <h3>Diabetes Risk</h3>
              <p>Analyses blood glucose patterns. ML-based risk scoring with early warning alerts and tracking.</p>
              <div className="feature-result">
                <span className="badge badge-danger">Elevated Levels</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ───────────────────────────────────────────── */}
      <section id="how-it-works" className="how-section section-padding">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Under the Hood</span>
            <h2>How <span className="text-gradient">MedVision AI</span> Works</h2>
          </div>
          <div className="how-steps">
            <div className="how-step">
              <div className="step-number">1</div>
              <div className="step-icon">📸</div>
              <h3>Capture</h3>
              <p>Scan area with device. Capture eye/skin images and biosignal data via ESP32-CAM and sensors.</p>
            </div>
            <div className="how-connector">
              <svg width="40" height="2"><line x1="0" y1="1" x2="40" y2="1" stroke="#0891b2" strokeWidth="2" strokeDasharray="4"/></svg>
            </div>
            <div className="how-step">
              <div className="step-number">2</div>
              <div className="step-icon">⚡</div>
              <h3>Process</h3>
              <p>AI on device detects patterns. Embedded processing with noise filtering and signal normalization.</p>
            </div>
            <div className="how-connector">
              <svg width="40" height="2"><line x1="0" y1="1" x2="40" y2="1" stroke="#0891b2" strokeWidth="2" strokeDasharray="4"/></svg>
            </div>
            <div className="how-step">
              <div className="step-number">3</div>
              <div className="step-icon">🧠</div>
              <h3>Analyze</h3>
              <p>Disease screening with computer vision and ML models. Multi-disease classification with confidence.</p>
            </div>
            <div className="how-connector">
              <svg width="40" height="2"><line x1="0" y1="1" x2="40" y2="1" stroke="#0891b2" strokeWidth="2" strokeDasharray="4"/></svg>
            </div>
            <div className="how-step">
              <div className="step-number">4</div>
              <div className="step-icon">📋</div>
              <h3>Report</h3>
              <p>PDF/email delivery. RAG-powered structured report with predictions, risk levels, and recommendations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Built for Healthcare Pros ──────────────────────────────── */}
      <section className="pros-section section-padding">
        <div className="container">
          <div className="pros-grid">
            <div className="pros-left">
              <span className="section-tag">Built for Healthcare Pros</span>
              <h2>Doctor-Ready <span className="text-gradient">Reports</span></h2>
              <div className="pros-list">
                <div className="pros-item">
                  <div className="pros-check">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  </div>
                  <span>Generate structured medical reports</span>
                </div>
                <div className="pros-item">
                  <div className="pros-check">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  </div>
                  <span>Include predictions, confidence levels, and recommendations</span>
                </div>
                <div className="pros-item">
                  <div className="pros-check">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  </div>
                  <span>Allow doctor to edit and validate</span>
                </div>
                <div className="pros-item">
                  <div className="pros-check">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  </div>
                  <span>Enable report download and print</span>
                </div>
              </div>
            </div>
            <div className="pros-right">
              <div className="report-preview">
                <div className="report-preview-header">
                  <div className="rp-dot rp-dot-red"></div>
                  <div className="rp-dot rp-dot-yellow"></div>
                  <div className="rp-dot rp-dot-green"></div>
                  <span>AI Diagnostics Report</span>
                </div>
                <div className="report-preview-body">
                  <div className="rp-row"><span className="rp-label">Cataract:</span> <span className="rp-value rp-danger">Detected</span></div>
                  <div className="rp-row"><span className="rp-label">Skin Lesion:</span> <span className="rp-value rp-warning">Detected</span></div>
                  <div className="rp-row"><span className="rp-label">Anemia:</span> <span className="rp-value rp-warning">Low Hemoglobin</span></div>
                  <div className="rp-row"><span className="rp-label">Diabetes Risk:</span> <span className="rp-value rp-danger">Elevated</span></div>
                  <div className="rp-btn">Generate Report</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Tech Stack ─────────────────────────────────────────────── */}
      <section id="tech" className="tech-section section-padding">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Technologies</span>
            <h2>Our <span className="text-gradient">Tech Stack</span></h2>
          </div>
          <div className="tech-grid">
            {['Python', 'TensorFlow', 'React', 'Node.js', 'MongoDB', 'ESP32-CAM'].map((tech) => (
              <div key={tech} className="tech-item">
                <span>{tech}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Impact ─────────────────────────────────────────────────── */}
      <section className="impact-section section-padding">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Measurable Impact</span>
            <h2>Real-World <span className="text-gradient">Results</span></h2>
          </div>
          <div className="impact-grid">
            <div className="impact-card">
              <div className="impact-number">~85%</div>
              <div className="impact-label">Accuracy</div>
            </div>
            <div className="impact-card">
              <div className="impact-number">5min</div>
              <div className="impact-label">Test Time</div>
            </div>
            <div className="impact-card">
              <div className="impact-number">₹5000</div>
              <div className="impact-label">Cost/Device</div>
            </div>
            <div className="impact-card">
              <div className="impact-number">24/7</div>
              <div className="impact-label">availability</div>
            </div>
          </div>
          <div className="impact-bullets">
            <p>✓ Improves healthcare accessibility in rural areas</p>
            <p>✓ Reduces cost and time for diagnosis</p>
            <p>✓ Enables on-field screening without lab setup</p>
          </div>
        </div>
      </section>

      {/* ─── Team ───────────────────────────────────────────────────── */}
      <section id="team" className="team-section section-padding">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">The Minds Behind It</span>
            <h2>Our <span className="text-gradient">Team</span></h2>
          </div>
          <div className="team-grid">
            {[
              { name: 'Atharva M', dept: 'Electronics and Communication' },
              { name: 'Nirmay Kayarga', dept: 'Artificial Intelligence and Machine Learning' },
              { name: 'Inesh Candade', dept: 'Electronics and Communication' },
              { name: 'Anagha TL', dept: 'Electronics and Instrumentation' },
            ].map((member, i) => (
              <div key={i} className="team-card">
                <div className="team-avatar">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <h4>{member.name}</h4>
                <p className="team-dept">{member.dept}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────────────────── */}
      <section className="cta-section">
        <div className="container cta-inner">
          <h2>Ready to bring AI-powered healthcare to your clinic?</h2>
          <p>Experience the future of portable diagnostics with MedVision AI</p>
          <div className="cta-buttons">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
              Request a Demo
            </button>
          </div>
          <div className="cta-trust">
            <span>Built for Rural Healthcare</span>
            <span>|</span>
            <span>Hackathon Project @HACKOLYMPIC</span>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <div className="nav-brand">
              <div className="nav-logo">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="14" stroke="url(#grad2)" strokeWidth="2.5" />
                  <path d="M11 16h10M16 11v10" stroke="url(#grad2)" strokeWidth="2.5" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="grad2" x1="0" y1="0" x2="32" y2="32">
                      <stop stopColor="#14b8a6" />
                      <stop offset="1" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="nav-title" style={{ color: '#f8fafc' }}>MedVision <span className="text-gradient">AI</span></span>
            </div>
            <p>Portable Health Screening</p>
          </div>
          <div className="footer-links">
            <div>
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#tech">Tech Stack</a>
            </div>
            <div>
              <h4>Company</h4>
              <a href="#team">About</a>
              <a href="#team">Team</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="container">
            <p>Made with ❤️ | Powered by AI for Rural Healthcare</p>
            <p>© 2026 Artsy Technologies Pvt Ltd. All rights reserved. | @HACKOLYMPIC</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
