import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import PlayerForm from '../components/players/PlayerForm'
import PlayerTable from '../components/players/PlayerTable'

export default function PlayersPage() {
  const { state, addPlayer, generateFirstRound, clearError } = useSession()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(state.players.length === 0)
  const [generating, setGenerating] = useState(false)

  useEffect(() => { clearError() }, [])

  useEffect(() => {
    if (generating) {
      if (!state.error && state.rounds.length > 0) navigate('/schedule')
      setGenerating(false)
    }
  }, [state.error, state.rounds.length])

  const activePlayers = state.players.filter(p => p.status === 'active')
  const canGenerate = activePlayers.length >= 4

  function handleAddPlayer(data) {
    addPlayer(data)
    setShowForm(false)
  }

  function handleGenerate() {
    clearError()
    setGenerating(true)
    generateFirstRound()
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-3xl font-black text-green-900">Players</h1>
          <p className="text-base text-gray-400 mt-0.5">
            {state.players.length} total · {activePlayers.length} active
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:border-coral-400 hover:text-coral-600 transition-all duration-200 bg-white shadow-sm hover:shadow-md active:scale-[0.97]">
            + Add
          </button>
        )}
      </div>

      {/* Error */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 animate-scale-in">
          {state.error}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">New Player</p>
            {state.players.length > 0 && (
              <button onClick={() => setShowForm(false)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">✕ Close</button>
            )}
          </div>
          <PlayerForm onSubmit={handleAddPlayer} />
        </div>
      )}

      {/* Player list */}
      <div className="animate-slide-up" style={{ animationDelay: '0.05s' }}>
        <PlayerTable />
      </div>

      {/* Generate */}
      <div className="pt-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {!canGenerate && state.players.length > 0 && (
          <p className="text-xs text-center text-gray-400 mb-3">
            Need {4 - activePlayers.length} more active player{4 - activePlayers.length !== 1 ? 's' : ''} to generate
          </p>
        )}
        <button onClick={handleGenerate} disabled={!canGenerate}
          className="w-full py-3.5 bg-coral-500 hover:bg-coral-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all duration-200 text-sm shadow-sm hover:shadow-md active:scale-[0.98]">
          Generate Schedule →
        </button>
      </div>
    </div>
  )
}
