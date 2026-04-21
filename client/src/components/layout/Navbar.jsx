import { useNavigate, useLocation } from 'react-router-dom'
import { useSession } from '../../context/SessionContext'

const STEPS = [
  { path: '/setup',     label: 'Setup',     step: 1 },
  { path: '/players',  label: 'Players',   step: 2 },
  { path: '/schedule', label: 'Schedule',  step: 3 },
  { path: '/broadcast',label: 'Broadcast', step: 4 },
]

export default function Navbar() {
  const { state, toggleBroadcast, reset } = useSession()
  const navigate = useNavigate()
  const location = useLocation()

  const currentStep = STEPS.find(s => s.path === location.pathname)?.step ?? 0

  function handleReset() {
    if (window.confirm('End this session and start over?')) {
      reset()
      navigate('/setup')
    }
  }

  return (
    <header className="bg-green-900 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between gap-6">

        {/* Left: Logo + Step nav */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 cursor-pointer flex-shrink-0" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white shadow-sm" style={{ backgroundColor: '#e8503a' }}>
              S
            </div>
            <span className="text-white font-black text-base tracking-tight">SetMaker</span>
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
                      ? 'text-coral-300 hover:text-white hover:bg-white/10'
                      : 'text-green-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {s.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Right: Sign in + Live + End */}
        <div className="flex items-center gap-2">
          {state.session && (
            <button
              onClick={toggleBroadcast}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 ${
                state.isBroadcasting
                  ? 'border-coral-400 bg-coral-400/20 text-coral-300'
                  : 'border-green-700 text-green-500 hover:border-green-500 hover:text-green-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${state.isBroadcasting ? 'bg-coral-400 animate-pulse' : 'bg-green-700'}`} />
              Live
            </button>
          )}

          <button
            onClick={() => {}}
            className="px-4 py-2 rounded-lg text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-all duration-200"
          >
            Sign in
          </button>

          {state.session && (
            <button
              onClick={handleReset}
              className="text-xs text-green-600 hover:text-red-400 transition-colors px-2 py-1 rounded"
            >
              End
            </button>
          )}
        </div>
      </div>

      {/* Mobile step bar */}
      <div className="sm:hidden flex border-t border-green-800">
        {STEPS.map(s => {
          const isActive = s.step === currentStep
          const isDone   = s.step < currentStep
          return (
            <button
              key={s.path}
              onClick={() => navigate(s.path)}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                isActive ? 'text-coral-400 border-b-2 border-coral-500' :
                isDone   ? 'text-coral-600' : 'text-green-600'
              }`}
            >
              {s.label}
            </button>
          )
        })}
      </div>
    </header>
  )
}
