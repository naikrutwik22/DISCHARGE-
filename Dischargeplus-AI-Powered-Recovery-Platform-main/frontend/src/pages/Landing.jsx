import { Link } from 'react-router-dom'
import { Activity, ArrowRight } from 'lucide-react'
import './Landing.css'

export default function Landing() {
  return (
    <div className="landing-page">
      <div className="landing-hero-overlay" />
      
      {/* Header Section */}
      <header className="landing-header">
        <div className="header-left">
          <img src="/hospital.jpg" alt="Discharge+ Logo" className="header-logo-img" />
          <div className="header-brand-info">
            <h2 className="header-brand-name">Discharge<span>+</span></h2>
            <span className="header-tagline">Recovery Redefined</span>
          </div>
        </div>
        
        <div className="header-right">
          <Link to="/login" className="header-btn">Admin Login</Link>
          <Link to="/doctor-login" className="header-btn">Doctor Login</Link>
          <Link to="/patient-login" className="header-btn">Patient Login</Link>
        </div>
      </header>

      {/* Main Center Content */}
      <div className="landing-content">
        <div className="center-info-box">
          <h2>Intelligent Post-Discharge Care Platform</h2>
          <p className="landing-description">
            Designed to reduce readmissions, empower patients, and streamline clinical workflows through continuous AI-powered monitoring and real-time remote communication.
          </p>
          <Link to="/register" className="landing-btn-solid">
            Get Started <ArrowRight size={18} style={{ marginLeft: 6 }} />
          </Link>
        </div>
      </div>
    </div>
  )
}
