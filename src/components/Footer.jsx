import React from 'react'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <>
      {/* CTA Banner */}
      <section className="cta-banner">
        <div className="container">
          <div className="cta-banner-inner">
            <div>
              <p className="section-label">Ready to Start?</p>
              <h2>Need IT Solutions?<br /><span>Let's start now.</span></h2>
            </div>
            <a href="#contact" className="btn-primary" style={{fontSize:'1rem', padding:'1rem 2.5rem'}}>
              Get in Touch →
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: '#060912' }}>
        <div className="container">
          <div className="footer-top" style={{ padding: '5rem 0' }}>
            <div className="footer-brand" style={{ maxWidth: 320 }}>
              <div style={{display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1.5rem'}}>
                <div style={{ width: 32, height: 32, background: 'var(--gradient-hero)', borderRadius: 8, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '0.8rem' }}>K</div>
                <span style={{fontFamily:"'Space Grotesk', sans-serif", fontWeight:800, fontSize:'1.4rem', letterSpacing: '0.1em'}}>
                  KYTE FOUNDATION
                </span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.8 }}>The decentralized AI-agent layer for trustless project execution. Building the future of autonomous work.</p>
              <div className="footer-social" style={{ marginTop: '2rem' }}>
                {['Twitter', 'GitHub', 'Discord', 'Docs'].map((s, i) => (
                  <a key={i} href="#" className="social-icon" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {s}
                  </a>
                ))}
              </div>
            </div>

            <div className="footer-col" style={{ paddingLeft: '2rem' }}>
              <h4>Protocol</h4>
              <ul>
                {['Smart Escrow','AI Code Audit','Bounty Market','Governance','Liquid Staking'].map(l => (
                  <li key={l}><a href="#">{l}</a></li>
                ))}
              </ul>
            </div>

            <div className="footer-col">
              <h4>Resources</h4>
              <ul>
                {['Documentation','Whitepaper','API Reference','Network Stats','Brand Kit'].map(l => (
                  <li key={l}><a href="#">{l}</a></li>
                ))}
              </ul>
            </div>

            <div className="footer-col">
              <h4>Support</h4>
              <ul>
                <li><a href="mailto:support@kyte.network">Support Center</a></li>
                <li><a href="#">Developer Portal</a></li>
                <li><a href="#">Status Page</a></li>
                <li><a href="#">Contact Lab</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '2rem 0' }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>© {year} KYTE FOUNDATION. All rights reserved.</p>
            <div style={{display:'flex', gap:'2.5rem'}}>
              <a href="#" style={{fontSize:'0.8rem', color:'rgba(255,255,255,0.3)', transition: 'color 0.2s'}}>Privacy Policy</a>
              <a href="#" style={{fontSize:'0.8rem', color:'rgba(255,255,255,0.3)', transition: 'color 0.2s'}}>Terms of Protocol</a>
              <a href="#" style={{fontSize:'0.8rem', color:'rgba(255,255,255,0.3)', transition: 'color 0.2s'}}>Security Audit</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
