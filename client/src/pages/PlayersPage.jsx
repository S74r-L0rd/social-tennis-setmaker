import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { getSessionScheduleIssue } from '../utils/roundSchedule'
import PlayerForm from '../components/players/PlayerForm'
import PlayerTable from '../components/players/PlayerTable'

export default function PlayersPage() {
  const { state, addPlayer, updatePlayer, generateRoundFromPlayers, clearError } = useSession()
  const navigate = useNavigate()
  const [showAddedNotice, setShowAddedNotice] = useState(false)
  const [editingPlayerId, setEditingPlayerId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [generating, setGenerating] = useState(false)

  useEffect(() => { clearError() }, [])

  useEffect(() => {
    if (!showAddedNotice) return
    const timeoutId = window.setTimeout(() => setShowAddedNotice(false), 1800)
    return () => window.clearTimeout(timeoutId)
  }, [showAddedNotice])

  const activePlayers = state.players.filter(p => p.status === 'active')
  const sessionScheduleIssue = getSessionScheduleIssue(state.session)
  const recentPlayers = [...state.players].sort((a, b) => b.id - a.id).slice(0, 5)
  const canGenerate = activePlayers.length >= 4 && !sessionScheduleIssue
  const editingPlayer = state.players.find(player => player.id === editingPlayerId) ?? null
  const selectedCourtCount = Array.isArray(state.session?.courts)
    ? state.session.courts.length
    : Number.isInteger(state.session?.courtCount)
    ? state.session.courtCount
    : 0
  const maxPlayersThisRound = selectedCourtCount * 4
  const sitOutCountThisRound = Math.max(0, activePlayers.length - maxPlayersThisRound)
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const basePlayers = activeFilter === 'playing'
    ? activePlayers
    : activeFilter === 'recent'
    ? recentPlayers
    : state.players
  const filteredPlayers = normalizedQuery
    ? basePlayers.filter(player => player.name.toLowerCase().includes(normalizedQuery))
    : basePlayers
  const filterTabs = [
    { id: 'playing', label: 'Playing', count: activePlayers.length },
    { id: 'recent', label: 'Recent', count: recentPlayers.length },
    { id: 'all', label: 'All', count: state.players.length },
  ]

  function handleAddPlayer(data) {
    addPlayer(data)
    setShowAddedNotice(true)
  }

  function handleSubmitPlayer(data) {
    if (editingPlayer) {
      updatePlayer(editingPlayer.id, data)
      setEditingPlayerId(null)
      return
    }
    handleAddPlayer(data)
  }

  async function handleGenerate() {
    clearError()
    setGenerating(true)
    const didGenerate = await generateRoundFromPlayers()
    setGenerating(false)
    if (didGenerate) navigate('/schedule')
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-3xl font-black text-green-900">Players</h1>
          <p className="text-base text-gray-400 mt-0.5">
            {state.players.length} total · {activePlayers.length} active
          </p>
        </div>
      </div>

      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 animate-scale-in">
          {state.error}
        </div>
      )}

      {showAddedNotice && (
        <div className="fixed top-20 right-6 sm:right-10 z-50 bg-green-700 text-white rounded-xl px-4 py-3 shadow-lg animate-slide-in-right">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none" aria-hidden="true">✓</span>
            <span className="text-sm font-black tracking-wide">Player Added</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-6 items-start">
        <div className={`bg-white rounded-2xl shadow-sm p-6 animate-scale-in lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto transition-all duration-200 ${
          editingPlayer
            ? 'border-2 border-coral-500 shadow-[0_0_0_4px_rgba(232,80,58,0.12)]'
            : 'border border-gray-100'
        }`}>
          <div className="mb-4">
            <p className={`text-xs font-black uppercase tracking-widest ${
              editingPlayer ? 'text-coral-500' : 'text-gray-400'
            }`}>
              {editingPlayer ? 'Edit Player' : 'New Player'}
            </p>
            {editingPlayer && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-coral-200 bg-coral-50 px-3 py-2 text-sm font-bold text-coral-700 animate-scale-in">
                <span className="text-base leading-none" aria-hidden="true">✎</span>
                <span>Editing {editingPlayer.name}</span>
              </div>
            )}
          </div>
          <PlayerForm
            initialValues={editingPlayer ? {
              name: editingPlayer.name,
              gender: editingPlayer.gender,
              rating: editingPlayer.rating,
              plannedRounds: editingPlayer.plannedRounds,
            } : null}
            onSubmit={handleSubmitPlayer}
            onCancel={editingPlayer ? () => setEditingPlayerId(null) : null}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="animate-slide-up" style={{ animationDelay: '0.03s' }}>
            <div className="flex flex-col items-start gap-2">
              {sessionScheduleIssue && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {sessionScheduleIssue}
                  <button
                    type="button"
                    onClick={() => navigate('/setup')}
                    className="ml-2 font-black text-coral-600 hover:text-coral-700"
                  >
                    Go to Setup
                  </button>
                </div>
              )}
              {selectedCourtCount > 0 && (
                <p className="text-xs text-gray-400">
                  {selectedCourtCount} court{selectedCourtCount !== 1 ? 's' : ''} selected · up to {maxPlayersThisRound} player{maxPlayersThisRound !== 1 ? 's' : ''} this round
                </p>
              )}
              {sitOutCountThisRound > 0 && (
                <p className="text-xs text-amber-700">
                  {sitOutCountThisRound} player{sitOutCountThisRound !== 1 ? 's' : ''} will sit out this round
                </p>
              )}
              {!canGenerate && state.players.length > 0 && (
                <p className="text-xs text-gray-400">
                  Need {4 - activePlayers.length} more active player{4 - activePlayers.length !== 1 ? 's' : ''} to generate
                </p>
              )}
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className="inline-flex px-5 py-3 bg-coral-500 hover:bg-coral-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all duration-200 text-sm shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                {generating ? 'Generating…' : 'Generate Schedule →'}
              </button>
            </div>
          </div>

          <div className="animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative sm:max-w-sm sm:flex-1">
                <svg
                  className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search players by name"
                  className="w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 py-3 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                {filterTabs.map(tab => {
                  const isActive = activeFilter === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveFilter(tab.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold transition-all ${
                        isActive
                          ? 'text-green-900 bg-green-50'
                          : 'text-gray-400 hover:text-gray-700 hover:bg-white'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`inline-flex min-w-5 justify-center text-xs ${
                        isActive ? 'text-green-700' : 'text-gray-400'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <PlayerTable
              players={filteredPlayers}
              onEditPlayer={player => setEditingPlayerId(player.id)}
              editingPlayerId={editingPlayerId}
              emptyMessage={state.players.length === 0 ? 'No players yet — add your first player on the left' : 'No players match this search'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
