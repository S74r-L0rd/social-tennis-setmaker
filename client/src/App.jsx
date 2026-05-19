import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { SessionProvider } from './context/SessionContext'
import { useSession } from './context/SessionContext'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/AuthContext'
import Navbar from './components/layout/Navbar'
import LoadingScreen from './components/ui/LoadingScreen'
import HomePage from './pages/HomePage'
import AuthPage from './pages/AuthPage'
import FairnessAnalysisPage from './pages/FairnessAnalysisPage'
import SetupPage from './pages/SetupPage'
import PlayersPage from './pages/PlayersPage'
import SchedulePage from './pages/SchedulePage'
import BroadcastPage from './pages/BroadcastPage'
import ProfilePage from './pages/ProfilePage'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  const { state } = useSession()
  if (!isAuthenticated) return <AccessPrompt />
  if (state.isLoading || !state.hasLoaded) return <LoadingScreen />
  return children
}

function AccessPrompt() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex min-h-[58vh] max-w-4xl items-center justify-center px-2 py-10 animate-fade-in">
      <div className="w-full overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.2fr]">
          <div className="bg-green-900 px-6 py-8 text-white sm:px-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl" aria-hidden="true">
              🎾
            </div>
            <h1 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">Login required</h1>
            <p className="mt-3 text-sm leading-relaxed text-green-100">
              Sign in or create an organiser account to manage sessions, players, schedules, broadcasts, and fairness analysis.
            </p>
          </div>

          <div className="flex flex-col justify-center px-6 py-8 sm:px-8">
            <p className="text-xs font-black uppercase tracking-widest text-coral-500">Protected area</p>
            <h2 className="mt-2 text-2xl font-black text-green-900">Access more SetMaker tools</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              Your club data is saved to your account, so you need to log in before viewing or changing private session information.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/auth?mode=login')}
                className="inline-flex w-full items-center justify-center rounded-xl bg-coral-500 px-5 py-3 text-sm font-black text-white shadow-sm transition-all hover:bg-coral-600 sm:w-auto"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => navigate('/auth?mode=signup')}
                className="inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-600 transition-all hover:border-coral-200 hover:bg-coral-50 hover:text-coral-700 sm:w-auto"
              >
                Sign up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SiteFooter() {
  const navigate = useNavigate()

  return (
    <footer className="bg-green-900 px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_auto] md:items-start">
          <div className="max-w-md">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1 text-left"
            >
              <span className="text-xl leading-none" aria-hidden="true">🎾</span>
              <span className="text-lg font-black text-white">SetMaker</span>
            </button>
            <p className="mt-3 text-sm leading-relaxed text-green-100">
              A practical social tennis scheduler for organising balanced rounds, sit-outs, and live broadcasts.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end md:text-right">
            <p className="text-sm font-black text-white">Feedback</p>
            <p className="max-w-xs text-sm leading-relaxed text-green-100 md:max-w-64">
              Found an issue or have a suggestion? Let the team know.
            </p>
            <a
              href="mailto:UWA_group07@setmaker.com?subject=SetMaker%20Feedback"
              className="inline-flex w-fit items-center justify-center rounded-lg border border-white/20 px-4 py-2.5 text-xs font-black text-green-100 transition-all hover:bg-white/10 hover:text-white md:self-end"
            >
              Give feedback
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-5 text-sm text-green-100 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold text-white">© 2026 Social Tennis Setmaker</p>
          <div className="flex flex-col gap-2 text-green-100 sm:flex-row sm:items-center sm:gap-4">
            <span>Developed for CITS5206 Project</span>
            <span className="hidden text-green-200 sm:inline">•</span>
            <span>Made in Perth, Australia</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <AuthProvider>
    <SessionProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#faf6f0' }}>
          <Navbar />
          <main className="w-full px-6 sm:px-10 py-8 flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/access-required" element={<AccessPrompt />} />
              <Route path="/fairness-analysis" element={<ProtectedRoute><FairnessAnalysisPage /></ProtectedRoute>} />
              <Route path="/setup" element={<ProtectedRoute><SetupPage /></ProtectedRoute>} />
              <Route path="/players" element={<ProtectedRoute><PlayersPage /></ProtectedRoute>} />
              <Route path="/schedule" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/broadcast" element={<BroadcastPage />} />
            </Routes>
          </main>
          <SiteFooter />
        </div>
      </BrowserRouter>
    </SessionProvider>
    </AuthProvider>
  )
}
