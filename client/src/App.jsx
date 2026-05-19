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
  if (!isAuthenticated) return <Navigate to="/auth" replace />
  if (state.isLoading || !state.hasLoaded) return <LoadingScreen />
  return children
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
