import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LOGIN_EMPTY = { email: '', password: '' }
const SIGNUP_EMPTY = {
  name: '',
  clubName: '',
  clubCountry: '',
  clubSuburb: '',
  email: '',
  password: '',
  agreed: false,
}

function passwordChecks(password) {
  return {
    minLength: password.length >= 8,
    specialChar: /[^A-Za-z0-9]/.test(password),
  }
}

export default function AuthPage() {
  const navigate = useNavigate()
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [loginForm, setLoginForm] = useState(LOGIN_EMPTY)
  const [signupForm, setSignupForm] = useState(SIGNUP_EMPTY)
  const [loginErrors, setLoginErrors] = useState({})
  const [signupErrors, setSignupErrors] = useState({})
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false)

  const signupPasswordState = useMemo(
    () => passwordChecks(signupForm.password),
    [signupForm.password]
  )

  function setLogin(field, value) {
    setLoginForm(prev => ({ ...prev, [field]: value }))
    if (loginErrors[field]) setLoginErrors(prev => ({ ...prev, [field]: undefined }))
    if (forgotPasswordSent) setForgotPasswordSent(false)
  }

  function setSignup(field, value) {
    setSignupForm(prev => ({ ...prev, [field]: value }))
    if (signupErrors[field]) setSignupErrors(prev => ({ ...prev, [field]: undefined }))
  }

  function validateLogin() {
    const next = {}
    if (!loginForm.email.trim()) next.email = 'Email is required'
    if (!loginForm.password) next.password = 'Password is required'
    return next
  }

  function validateSignup() {
    const next = {}
    if (!signupForm.name.trim()) next.name = 'Your name is required'
    if (!signupForm.clubName.trim()) next.clubName = 'Club name is required'
    if (!signupForm.clubCountry.trim()) next.clubCountry = 'Club country is required'
    if (!signupForm.clubSuburb.trim()) next.clubSuburb = 'Club suburb is required'
    if (!signupForm.email.trim()) next.email = 'Email is required'
    if (!signupPasswordState.minLength || !signupPasswordState.specialChar) next.password = 'Password does not meet requirements'
    if (!signupForm.agreed) next.agreed = 'You must agree before continuing'
    return next
  }

  async function handleLoginSubmit(e) {
    e.preventDefault()
    const next = validateLogin()
    setLoginErrors(next)
    if (Object.keys(next).length > 0) return
    try {
      await login(loginForm.email, loginForm.password)
      navigate('/setup')
    } catch (error) {
      setLoginErrors({ api: error.message })
    }
  }

  function handleForgotPasswordSubmit(e) {
    e.preventDefault()
    const next = {}
    if (!loginForm.email.trim()) next.email = 'Email is required'
    setLoginErrors(prev => ({ ...prev, ...next }))
    if (Object.keys(next).length > 0) return
    setForgotPasswordSent(true)
  }

  async function handleSignupSubmit(e) {
    e.preventDefault()
    const next = validateSignup()
    setSignupErrors(next)
    if (Object.keys(next).length > 0) return
    try {
      await register(signupForm.name, signupForm.email, signupForm.password)
      navigate('/setup')
    } catch (error) {
      setSignupErrors({ api: error.message })
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)] rounded-[28px] overflow-hidden border border-gray-200 shadow-sm bg-white">
        <div className="px-8 py-10 bg-green-900 text-white flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-black tracking-wide uppercase text-coral-300">
              <span aria-hidden="true">🎾</span>
              SetMaker Access
            </div>
            <h1 className="mt-4 text-4xl font-black leading-tight">Manage sessions with one organizer account.</h1>
            <p className="mt-4 text-sm leading-relaxed text-green-100">
              Sign in to continue managing schedules, or create a new club account to get started.
            </p>
          </div>
          <div className="mt-8 text-xs text-green-200">
            Social tennis scheduling, broadcast control, and round management in one place.
          </div>
        </div>

        <div className="px-6 sm:px-8 py-8 sm:py-10">
          <div className="inline-flex p-1 rounded-full bg-stone-100 mb-8">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`px-5 py-2 rounded-full text-sm font-black transition-all ${mode === 'login' ? 'bg-white text-green-900 shadow-sm' : 'text-gray-500'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`px-5 py-2 rounded-full text-sm font-black transition-all ${mode === 'signup' ? 'bg-white text-green-900 shadow-sm' : 'text-gray-500'}`}
            >
              Sign Up
            </button>
          </div>

          {mode === 'login' ? (
            showForgotPassword ? (
              <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col gap-5 animate-scale-in">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wide">Reset Password</p>
                    <p className="text-sm text-gray-500 mt-1">Enter your email and we&apos;ll send reset instructions.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false)
                      setForgotPasswordSent(false)
                    }}
                    className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Back to login
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Email *</label>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={e => setLogin('email', e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent ${loginErrors.email ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {loginErrors.email && <p className="text-xs text-red-500">{loginErrors.email}</p>}
                </div>

                <button
                  type="submit"
                  className="py-3.5 rounded-xl bg-coral-500 hover:bg-coral-600 text-white text-sm font-black transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                  Reset your password
                </button>

                {forgotPasswordSent && (
                  <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                    <p className="font-black">Check your mail</p>
                    <p className="mt-1">We have sent you an email with instructions to reset your password</p>
                  </div>
                )}
              </form>
            ) : (
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Email *</label>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={e => setLogin('email', e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent ${loginErrors.email ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {loginErrors.email && <p className="text-xs text-red-500">{loginErrors.email}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Password *</label>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={e => setLogin('password', e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent ${loginErrors.password ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  <div className="flex items-center justify-between gap-3">
                    {loginErrors.password ? <p className="text-xs text-red-500">{loginErrors.password}</p> : <span />}
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true)
                        setForgotPasswordSent(false)
                      }}
                      className="text-xs font-bold text-coral-500 hover:text-coral-600 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                {loginErrors.api && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{loginErrors.api}</p>
                )}

                <button
                  type="submit"
                  className="mt-2 py-3.5 rounded-xl bg-coral-500 hover:bg-coral-600 text-white text-sm font-black transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                  Sign In
                </button>

                <p className="text-sm text-gray-500 text-center">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="font-black text-coral-500 hover:text-coral-600 transition-colors"
                  >
                    Sign up
                  </button>
                </p>
              </form>
            )
          ) : (
            <form onSubmit={handleSignupSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Your Name *</label>
                  <input
                    type="text"
                    value={signupForm.name}
                    onChange={e => setSignup('name', e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent ${signupErrors.name ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {signupErrors.name && <p className="text-xs text-red-500">{signupErrors.name}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Club Name *</label>
                  <input
                    type="text"
                    value={signupForm.clubName}
                    onChange={e => setSignup('clubName', e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent ${signupErrors.clubName ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {signupErrors.clubName && <p className="text-xs text-red-500">{signupErrors.clubName}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Club Country *</label>
                  <input
                    type="text"
                    value={signupForm.clubCountry}
                    onChange={e => setSignup('clubCountry', e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent ${signupErrors.clubCountry ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {signupErrors.clubCountry && <p className="text-xs text-red-500">{signupErrors.clubCountry}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Club Suburb *</label>
                  <input
                    type="text"
                    value={signupForm.clubSuburb}
                    onChange={e => setSignup('clubSuburb', e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent ${signupErrors.clubSuburb ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {signupErrors.clubSuburb && <p className="text-xs text-red-500">{signupErrors.clubSuburb}</p>}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Email *</label>
                <input
                  type="email"
                  value={signupForm.email}
                  onChange={e => setSignup('email', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent ${signupErrors.email ? 'border-red-400' : 'border-gray-200'}`}
                />
                {signupErrors.email && <p className="text-xs text-red-500">{signupErrors.email}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Password *</label>
                <input
                  type="password"
                  value={signupForm.password}
                  onChange={e => setSignup('password', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent ${signupErrors.password ? 'border-red-400' : 'border-gray-200'}`}
                />
                {signupErrors.password && <p className="text-xs text-red-500">{signupErrors.password}</p>}
                <div className="text-xs text-gray-500 leading-relaxed">
                  <p className={signupPasswordState.minLength ? 'text-green-700' : ''}>Must be at least 8 characters long</p>
                  <p className={signupPasswordState.specialChar ? 'text-green-700' : ''}>Must contain one special character</p>
                </div>
              </div>

              <label className="flex items-start gap-3 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={signupForm.agreed}
                  onChange={e => setSignup('agreed', e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-coral-500 focus:ring-coral-400"
                />
                <span>
                  I agree to the Terms and Conditions and Privacy Policy.
                </span>
              </label>
              {signupErrors.agreed && <p className="text-xs text-red-500 -mt-2">{signupErrors.agreed}</p>}

              {signupErrors.api && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{signupErrors.api}</p>
              )}

              <button
                type="submit"
                className="mt-1 py-3.5 rounded-xl bg-coral-500 hover:bg-coral-600 text-white text-sm font-black transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                Create Account
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
