import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SessionProvider } from './context/SessionContext'
import Navbar from './components/layout/Navbar'
import HomePage from './pages/HomePage'
import AuthPage from './pages/AuthPage'
import FairnessAnalysisPage from './pages/FairnessAnalysisPage'
import SetupPage from './pages/SetupPage'
import PlayersPage from './pages/PlayersPage'
import SchedulePage from './pages/SchedulePage'
import BroadcastPage from './pages/BroadcastPage'

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <div className="min-h-screen" style={{ backgroundColor: '#faf6f0' }}>
          <Navbar />
          <main className="w-full px-6 sm:px-10 py-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/fairness-analysis" element={<FairnessAnalysisPage />} />
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/players" element={<PlayersPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/broadcast" element={<BroadcastPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </SessionProvider>
  )
}
