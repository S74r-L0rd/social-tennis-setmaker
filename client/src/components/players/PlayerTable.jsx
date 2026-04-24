import { useSession } from '../../context/SessionContext'
import { RatingBadge, GenderBadge } from '../ui/Badge'

function getScheduledRoundCount(rounds, playerId) {
  return rounds.reduce((count, round) => {
    const appearsInMatch = (round.matches ?? []).some(match =>
      (match.teams ?? []).some(team =>
        (team ?? []).some(player => player.id === playerId)
      )
    )

    const appearsInSitOut = (round.sitOuts ?? []).some(player => player.id === playerId)

    return appearsInMatch || appearsInSitOut ? count + 1 : count
  }, 0)
}

export default function PlayerTable({ players = null, onEditPlayer, editingPlayerId = null, emptyMessage = null }) {
  const { state, removePlayer, togglePlayerStatus } = useSession()
  const visiblePlayers = players ?? state.players

  if (visiblePlayers.length === 0) {
    return (
      <div className="text-center py-14 text-gray-300">
        <div className="text-4xl mb-3">👥</div>
        <p className="text-sm">{emptyMessage ?? 'No players yet — add your first player on the left'}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {visiblePlayers.map((player, idx) => {
        const scheduledRoundCount = getScheduledRoundCount(state.rounds, player.id)
        const quotaReached = Number.isInteger(player.plannedRounds)
          && player.plannedRounds > 0
          && scheduledRoundCount >= player.plannedRounds

        return (
          <div key={player.id} className={idx !== 0 ? 'border-t border-gray-50' : ''}>
            <div className={`flex items-center gap-3 px-6 py-5 transition-all duration-150 hover:bg-gray-50 ${player.status === 'resting' || quotaReached ? 'opacity-60' : ''} ${editingPlayerId === player.id ? 'bg-coral-50/70' : ''}`}>
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
                quotaReached ? 'bg-amber-500' : player.status === 'active' ? 'bg-coral-400' : 'bg-gray-300'
              }`} />

              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-900 text-base">{player.name}</span>
                <GenderBadge gender={player.gender} />
                <RatingBadge rating={player.rating} />
                {quotaReached && (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black uppercase tracking-wide text-amber-800">
                    Quota Reached
                  </span>
                )}
              </div>

              <span className="text-sm text-gray-400 hidden sm:block flex-shrink-0">
                {scheduledRoundCount}R · {player.sitOutCount} out
                {player.plannedRounds > 0 && ` · /${player.plannedRounds}`}
              </span>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => togglePlayerStatus(player.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all duration-150 ${
                    player.status === 'active'
                      ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                      : 'text-coral-600 hover:bg-coral-50'
                  }`}>
                  {player.status === 'active' ? 'Rest' : 'Play'}
                </button>
                <button onClick={() => onEditPlayer?.(player)}
                  className={`p-1.5 transition-colors rounded-lg ${editingPlayerId === player.id ? 'text-coral-600 bg-coral-100' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button onClick={() => { if (window.confirm('Remove this player?')) removePlayer(player.id) }}
                  className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
