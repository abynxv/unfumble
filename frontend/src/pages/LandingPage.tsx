/**
 * Landing Page — Professional B&W.
 * Sections: Nav → Hero → Metrics → Features → How → Showcase → Styles → CTA → Footer
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Arr = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
);

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <>
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className={`landing-nav${scrolled ? ' scrolled' : ''}`} id="landing-nav">
        <span className="nav-logo">unfumble</span>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#styles">Styles</a>
          <Link to="/login" className="nav-cta">Get started</Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="hero" id="hero">
        <p className="hero-eyebrow anim-1">AI-Powered Professional Headshots</p>
        <h1 className="anim-2">
          Your next headshot<br />starts with a selfie.
        </h1>
        <p className="hero-sub anim-3">
          Upload any clear face photo. Our AI transforms it into a polished,
          studio-quality professional portrait — ready in seconds, not days.
        </p>
        <div className="hero-buttons anim-4">
          <Link to="/login" className="hero-btn hero-btn-white">
            Create your headshot <Arr />
          </Link>
          <a href="#how" className="hero-btn hero-btn-outline">
            How it works
          </a>
        </div>
      </section>

      {/* ── Metrics strip ───────────────────────────────────────── */}
      <section className="metrics-strip">
        <div className="metrics-inner">
          <div className="metric">
            <span className="metric-val">4</span>
            <span className="metric-label">Professional styles</span>
          </div>
          <div className="metric-divider" />
          <div className="metric">
            <span className="metric-val">&lt;60s</span>
            <span className="metric-label">Generation time</span>
          </div>
          <div className="metric-divider" />
          <div className="metric">
            <span className="metric-val">HD</span>
            <span className="metric-label">Output quality</span>
          </div>
          <div className="metric-divider" />
          <div className="metric">
            <span className="metric-val">100%</span>
            <span className="metric-label">Private & secure</span>
          </div>
        </div>
      </section>

      {/* ── Showcase (hero image) ───────────────────────────────── */}
      <section className="land-section" id="showcase">
        <div className="showcase-wrap">
          {/*
            Replace with your image:
            <img src="/hero.png" alt="AI headshot examples" className="showcase-img" />
          */}
          <div className="showcase-placeholder">
            <span>Hero / showcase image goes here</span>
            <small>Place at /public/hero.png and update this file</small>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="land-section" id="features">
        <div className="land-header">
          <p className="land-label">Features</p>
          <h2 className="land-title">Built for professionals<br />who value their time</h2>
          <p className="land-sub">
            Skip the photographer. Skip the studio. Get the same result in a fraction of the time.
          </p>
        </div>
        <div className="features-grid">
          {[
            { icon: '✦', title: 'AI Generation', desc: 'Advanced models that understand facial structure, lighting, and professional composition.' },
            { icon: '◎', title: 'Face Clarity', desc: 'Intelligent face detection ensures sharp, natural results from any clear photo you upload.' },
            { icon: '◈', title: 'Style Library', desc: 'Corporate, Startup, Developer, Formal — each precisely tuned for its professional context.' },
            { icon: '⚡', title: 'Instant Results', desc: 'From upload to download in under 60 seconds. No appointments, no waiting.' },
            { icon: '◉', title: 'Enterprise Security', desc: 'Your photos are processed securely and never shared. Privacy by design.' },
            { icon: '↓', title: 'HD Downloads', desc: 'Download production-ready portraits for LinkedIn, resumes, websites, and ID badges.' },
          ].map((f, i) => (
            <div className="feat-card" key={i}>
              <div className="feat-icon">{f.icon}</div>
              <h3 className="feat-title">{f.title}</h3>
              <p className="feat-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section className="land-section land-section-alt" id="how">
        <div className="land-header">
          <p className="land-label">Process</p>
          <h2 className="land-title">Three steps. Sixty seconds.</h2>
          <p className="land-sub">No learning curve. No complex setup.</p>
        </div>
        <div className="steps-row">
          <div className="step">
            <div className="step-num">01</div>
            <h3>Upload</h3>
            <p>Select any clear, front-facing photo. Selfies, casual shots, or existing portraits all work.</p>
          </div>
          <div className="step-connector" />
          <div className="step">
            <div className="step-num">02</div>
            <h3>Style</h3>
            <p>Choose from Corporate, Startup, Developer, or Formal. Each is designed for a specific use case.</p>
          </div>
          <div className="step-connector" />
          <div className="step">
            <div className="step-num">03</div>
            <h3>Download</h3>
            <p>Your professional headshot is generated in under a minute. Download in HD, ready to use anywhere.</p>
          </div>
        </div>
      </section>

      {/* ── Before/After ────────────────────────────────────────── */}
      <section className="land-section" id="results">
        <div className="land-header">
          <p className="land-label">Results</p>
          <h2 className="land-title">The transformation speaks<br />for itself</h2>
          <p className="land-sub">From casual to professional in one click.</p>
        </div>
        <div className="showcase-wrap">
          {/*
            Replace with your before/after:
            <img src="/before-after.png" alt="Before and after" className="showcase-img" />
          */}
          <div className="showcase-placeholder">
            <span>Before / after comparison goes here</span>
            <small>Place at /public/before-after.png</small>
          </div>
        </div>
      </section>

      {/* ── Styles ──────────────────────────────────────────────── */}
      <section className="land-section land-section-alt" id="styles">
        <div className="land-header">
          <p className="land-label">Styles</p>
          <h2 className="land-title">Four looks. Every context covered.</h2>
        </div>
        <div className="styles-grid">
          <div className="scard">
            <span className="scard-emoji">💼</span>
            <h3 className="scard-name">Corporate</h3>
            <p className="scard-desc">Studio lighting. Neutral backdrop. Built for executive profiles and annual reports.</p>
          </div>
          <div className="scard">
            <span className="scard-emoji">🚀</span>
            <h3 className="scard-name">Startup</h3>
            <p className="scard-desc">Warm and approachable. Perfect for founder profiles, pitch decks, and team pages.</p>
          </div>
          <div className="scard">
            <span className="scard-emoji">💻</span>
            <h3 className="scard-name">Developer</h3>
            <p className="scard-desc">Smart casual with a friendly edge. Ideal for GitHub, Stack Overflow, and tech blogs.</p>
          </div>
          <div className="scard">
            <span className="scard-emoji">👔</span>
            <h3 className="scard-name">Formal</h3>
            <p className="scard-desc">Composed and elegant. For resumes, government IDs, and official documentation.</p>
          </div>
        </div>
      </section>

      {/* ── Use Cases ───────────────────────────────────────────── */}
      <section className="land-section">
        <div className="land-header">
          <p className="land-label">Use Cases</p>
          <h2 className="land-title">Trusted by professionals across industries</h2>
        </div>
        <div className="usecases-grid">
          {[
            'LinkedIn profiles',
            'Company websites',
            'Resume & CV',
            'Conference badges',
            'Email signatures',
            'Portfolio sites',
            'Press kits',
            'Social media',
          ].map((u, i) => (
            <div className="usecase" key={i}>{u}</div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="landing-cta">
        <p className="land-label" style={{ marginBottom: 16 }}>Get Started</p>
        <h2 className="cta-title">
          Your professional image<br />
          deserves an upgrade.
        </h2>
        <p className="cta-sub">No credit card. No commitment. Just results.</p>
        <Link to="/login" className="hero-btn hero-btn-white" style={{ display: 'inline-flex' }}>
          Create your headshot <Arr />
        </Link>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <span className="footer-brand">unfumble</span>
          <span className="footer-copy">© {new Date().getFullYear()} Unfumble. All rights reserved.</span>
        </div>
      </footer>
    </>
  );
}
