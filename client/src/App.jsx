import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SessionProvider } from './context/SessionContext'
import Navbar from './components/layout/Navbar'
import HomePage from './pages/HomePage'
import AuthPage from './pages/AuthPage'
import FairnessAnalysisPage from './pages/FairnessAnalysisPage'
import SetupPage from './pages/SetupPage'
import PlayersPage from './pages/PlayersPage'
import SchedulePage from './pages/SchedulePage'
import BroadcastPage from './pages/BroadcastPage'

function SiteFooter() {
  return (
    <footer className="bg-green-900 px-8 pt-10 pb-6">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[1.4fr_auto] gap-10 items-start">
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-black text-white">Contact us</h3>
          <p className="text-sm text-green-100 leading-relaxed max-w-md">
            We would like to hear your feedback on Social Tennis Setmaker.
            If you have suggestions or hit any issues, send us a note.
          </p>
          <a
            href="mailto:UWA_group07@setmaker.com"
            className="text-sm font-black text-coral-300 hover:text-coral-200 transition-colors"
          >
            UWA_group07@setmaker.com
          </a>
        </div>

        <div className="flex flex-col gap-6 md:items-end md:text-right">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold text-white">© 2026 Social Tennis Setmaker</p>
            <p className="text-sm text-green-100">Developed for CITS5206 Project</p>
            <p className="text-sm text-green-100">Made in Perth, Australia</p>
          </div>
          <a
            href="mailto:UWA_group07@setmaker.com?subject=SetMaker%20Feedback"
            className="inline-flex w-fit items-center justify-center rounded-xl border border-green-100 px-5 py-3 text-sm font-black text-green-100 hover:bg-white/10 transition-all duration-200"
          >
            Give feedback
          </a>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#faf6f0' }}>
          <Navbar />
          <main className="w-full px-6 sm:px-10 py-8 flex-1">
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
          <SiteFooter />
        </div>
      </BrowserRouter>
    </SessionProvider>
  )
}
