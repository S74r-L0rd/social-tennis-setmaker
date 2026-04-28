import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const STEPS = [
  { path: '/setup',     label: 'Setup',     step: 1 },
  { path: '/players',  label: 'Players',   step: 2 },
  { path: '/schedule', label: 'Schedule',  step: 3 },
  { path: '/broadcast',label: 'Broadcast', step: 4 },
]

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const currentStep = STEPS.find(s => s.path === location.pathname)?.step ?? 0

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <header className="bg-green-900 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-6">

        {/* Left: Logo + Step nav */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 cursor-pointer flex-shrink-0" onClick={() => navigate('/')}>
            <div className="w-6 h-7 flex items-center justify-center -mr-0.5 text-base leading-none" aria-hidden="true">🎾</div>
            <span className="text-white font-black text-base tracking-tight leading-none">SetMaker</span>
          </div>

          {/* Step nav — desktop */}
          <nav className="hidden sm:flex items-center gap-1">
            {STEPS.map(s => {
              const isActive = s.step === currentStep
              const isDone   = s.step < currentStep
              return (
                <button
                  key={s.path}
                  onClick={() => navigate(s.path)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-coral-500 text-white shadow-sm'
                      : isDone
                      ? 'text-green-200 hover:text-white hover:bg-white/10'
                      : 'text-green-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {s.label}
                </button>
              )
            })}

            <button
              type="button"
              onClick={() => navigate('/fairness-analysis')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                location.pathname === '/fairness-analysis'
                  ? 'bg-coral-500 text-white shadow-sm'
                  : 'text-green-200 hover:text-white hover:bg-white/10'
              }`}
            >
              Fairness
            </button>
          </nav>
        </div>

        {/* Right: auth */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-sm font-bold text-green-200">{user?.name}</span>
              <button
                type="button"
                onClick={() => { logout(); navigate('/') }}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-all duration-200"
              >
                Log out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="hidden sm:inline-flex px-4 py-2 rounded-lg text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-all duration-200"
            >
              Log in
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(open => !open)}
            className="sm:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="sm:hidden border-t border-green-800 bg-green-950/95 px-5 py-4">
          <div className="flex flex-col gap-2">
            {STEPS.map(step => {
              const isActive = step.step === currentStep
              return (
                <button
                  key={step.path}
                  type="button"
                  onClick={() => navigate(step.path)}
                  className={`w-full rounded-xl px-4 py-3 text-left text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-coral-500 text-white shadow-sm'
                      : 'text-green-100 hover:bg-white/10'
                  }`}
                >
                  {step.label}
                </button>
              )
            })}

            <button
              type="button"
              onClick={() => navigate('/fairness-analysis')}
              className={`w-full rounded-xl px-4 py-3 text-left text-sm font-bold transition-all ${
                location.pathname === '/fairness-analysis'
                  ? 'bg-coral-500 text-white shadow-sm'
                  : 'text-green-100 hover:bg-white/10'
              }`}
            >
              Fairness Analysis
            </button>

            <div className="mt-2 border-t border-white/10 pt-3 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <p className="px-4 py-2 text-sm font-bold text-green-300">{user?.name}</p>
                  <button
                    type="button"
                    onClick={() => { logout(); navigate('/') }}
                    className="w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-green-100 hover:bg-white/10 transition-all"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-green-100 hover:bg-white/10 transition-all"
                >
                  Log in
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
