import { useState } from 'react'
import { useSession } from '../../context/SessionContext'
import { RatingBadge, GenderBadge } from '../ui/Badge'

function getPlayerRoundUsage(rounds, playerId) {
  let scheduledRoundCount = 0
  let matchedRoundCount = 0
  let sitOutRoundCount = 0

  for (const round of rounds) {
    const appearsInMatch = (round.matches ?? []).some(match =>
      (match.teams ?? []).some(team =>
        (team ?? []).some(player => player.id === playerId)
      )
    )

    const appearsInSitOut = (round.sitOuts ?? []).some(player => player.id === playerId)

    if (appearsInMatch || appearsInSitOut) scheduledRoundCount += 1
    if (appearsInMatch) matchedRoundCount += 1
    if (appearsInSitOut) sitOutRoundCount += 1
  }

  return { scheduledRoundCount, matchedRoundCount, sitOutRoundCount }
}

export default function PlayerTable({ players = null, onEditPlayer, editingPlayerId = null, emptyMessage = null }) {
  const { state, removePlayer, togglePlayerStatus } = useSession()
  const [deleteDialog, setDeleteDialog] = useState(null)
  const visiblePlayers = players ?? state.players

  function openDeleteDialog(player, usage) {
    setDeleteDialog({ player, ...usage })
  }

  async function confirmDeletePlayer() {
    if (!deleteDialog?.player) return
    await removePlayer(deleteDialog.player.id)
    setDeleteDialog(null)
  }

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
        const usage = getPlayerRoundUsage(state.rounds, player.id)
        const { scheduledRoundCount } = usage
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
                <button onClick={() => openDeleteDialog(player, usage)}
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
      {deleteDialog && (
        <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-green-950/45 px-4 py-6 backdrop-blur-sm sm:px-6">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-red-100 bg-white shadow-2xl">
            <div className="border-b border-red-100 bg-red-50 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-red-500 shadow-sm">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-green-900 sm:text-xl">Delete {deleteDialog.player.name}?</h2>
                  <p className="mt-1 text-sm font-bold text-red-500">
                    {deleteDialog.matchedRoundCount > 0 ? 'Scheduled match found' : 'Permanent database delete'}
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-y-auto px-5 py-5 sm:px-6">
              {deleteDialog.matchedRoundCount > 0 ? (
                <p className="text-sm leading-relaxed text-gray-600">
                  This player is already scheduled in {deleteDialog.matchedRoundCount} match{deleteDialog.matchedRoundCount !== 1 ? 'es' : ''}. Clear the schedule before deleting them so existing matches do not become incomplete.
                </p>
              ) : (
                <p className="text-sm leading-relaxed text-gray-600">
                  This will permanently delete the player from the database. {deleteDialog.sitOutRoundCount > 0 ? 'They only appear as sitting out, so no match will be abandoned.' : 'This cannot be undone.'}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:px-6">
              <button
                type="button"
                onClick={() => setDeleteDialog(null)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50"
              >
                Cancel
              </button>
              {deleteDialog.matchedRoundCount === 0 && (
                <button
                  type="button"
                  onClick={confirmDeletePlayer}
                  className="w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-black text-white transition-all hover:bg-red-600"
                >
                  Delete Player
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
