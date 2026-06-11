'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleMagicLink = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F7F3EE; font-family: 'Inter', sans-serif; }
        .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .card { background: #fff; border-radius: 16px; padding: 48px 40px; width: 100%; max-width: 420px; box-shadow: 0 4px 24px rgba(14,58,92,.10); }
        .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; justify-content: center; }
        .logo-box { background: #0E3A5C; border-radius: 8px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; }
        .logo-text { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 22px; color: #0E3A5C; }
        h1 { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 24px; color: #1A2633; margin-bottom: 8px; text-align: center; }
        p.sub { color: #5C6B7A; font-size: 14px; text-align: center; margin-bottom: 32px; line-height: 1.5; }
        label { display: block; font-size: 13px; font-weight: 600; color: #1A2633; margin-bottom: 6px; }
        input { width: 100%; padding: 12px 14px; border: 1.5px solid #E4DDD4; border-radius: 10px; font-family: 'Inter', sans-serif; font-size: 15px; color: #1A2633; outline: none; transition: border .2s; }
        input:focus { border-color: #0E3A5C; }
        .btn { width: 100%; margin-top: 16px; padding: 13px; background: #F26B1D; border: none; border-radius: 10px; color: #fff; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 15px; cursor: pointer; transition: background .2s, transform .1s; }
        .btn:hover { background: #D4500E; }
        .btn:active { transform: scale(.98); }
        .btn:disabled { opacity: .6; cursor: not-allowed; }
        .error { margin-top: 12px; padding: 10px 14px; background: #FAEAE7; border-radius: 8px; color: #C03020; font-size: 13px; }
        .success { text-align: center; }
        .success .icon { font-size: 48px; margin-bottom: 16px; }
        .success h2 { font-family: 'Sora', sans-serif; font-weight: 700; color: #1A2633; margin-bottom: 8px; }
        .success p { color: #5C6B7A; font-size: 14px; line-height: 1.6; }
        .badge { display: inline-block; margin-top: 20px; background: #E8F0F6; color: #0E3A5C; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; }
      `}</style>
      <div className="page">
        <div className="card">
          <div className="logo">
            <div className="logo-box">
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <path d="M4 21 L4 8 Q4 4 8 4 L18 4 Q22 4 22 8 L22 21" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <path d="M1 21 L25 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M11 14 L13 17 L15 14" stroke="#F26B1D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="13" cy="10" r="2" fill="#F26B1D"/>
              </svg>
            </div>
            <span className="logo-text">Stagepoort</span>
          </div>

          {!sent ? (
            <>
              <h1>Welkom terug</h1>
              <p className="sub">Vul je e-mailadres in. Je ontvangt een magische link om direct in te loggen — geen wachtwoord nodig.</p>
              <form onSubmit={handleMagicLink}>
                <label>E-mailadres</label>
                <input
                  type="email"
                  placeholder="naam@school.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                {error && <div className="error">⚠️ {error}</div>}
                <button className="btn" type="submit" disabled={loading}>
                  {loading ? 'Versturen...' : '✉️ Stuur magische link'}
                </button>
              </form>
            </>
          ) : (
            <div className="success">
              <div className="icon">📬</div>
              <h2>Check je inbox!</h2>
              <p>We hebben een magische link gestuurd naar<br/><strong>{email}</strong></p>
              <p style={{marginTop: 12}}>Klik op de link in de e-mail om in te loggen. De link is 15 minuten geldig.</p>
              <span className="badge">Vergeet de spammap niet te checken</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
