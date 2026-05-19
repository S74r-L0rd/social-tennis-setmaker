import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from '../../context/SessionContext'
import { RatingBadge, GenderBadge } from '../ui/Badge'
import { getRoundSessionState } from '../../utils/roundSchedule'

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

function getOrderedRoundEntries(rounds = []) {
  return rounds
    .map((round, index) => ({
      round,
      index,
      displayRoundNumber: Number.isInteger(round.roundNumber) ? round.roundNumber : index + 1,
    }))
    .sort((a, b) => a.displayRoundNumber - b.displayRoundNumber || a.index - b.index)
}

function playerIsInRoundMatch(round, playerId) {
  return (round?.matches ?? []).some(match =>
    (match.teams ?? []).some(team =>
      (team ?? []).some(player => player.id === playerId)
    )
  )
}

function getLatestMatchRoundEntry(rounds = [], playerId) {
  const matchingRounds = getOrderedRoundEntries(rounds).filter(entry =>
    playerIsInRoundMatch(entry.round, playerId)
  )
  return matchingRounds[matchingRounds.length - 1] ?? null
}

function getFirstSitOutReplacement(round, playerId, sessionPlayers = []) {
  const playersById = new Map(sessionPlayers.map(player => [player.id, player]))

  return (round?.sitOuts ?? []).find(player => {
    if (player.id === playerId) return false
    const sessionPlayer = playersById.get(player.id)
    return sessionPlayer?.status === 'active'
  }) ?? null
}

function getRestingSitOuts(round, playerId, sessionPlayers = []) {
  const playersById = new Map(sessionPlayers.map(player => [player.id, player]))

  return (round?.sitOuts ?? []).filter(player => {
    if (player.id === playerId) return false
    const sessionPlayer = playersById.get(player.id)
    return sessionPlayer?.status === 'resting'
  })
}

export default function PlayerTable({ players = null, onEditPlayer, editingPlayerId = null, emptyMessage = null }) {
  const { state, removePlayer, togglePlayerStatus, restPlayerWithReplacement } = useSession()
  const [deleteDialog, setDeleteDialog] = useState(null)
  const [statusDialog, setStatusDialog] = useState(null)
  const visiblePlayers = players ?? state.players

  useEffect(() => {
    setDeleteDialog(null)
    setStatusDialog(null)
  }, [state.currentSessionId])

  function openDeleteDialog(player, usage) {
    setDeleteDialog({ player, ...usage })
  }

  async function confirmDeletePlayer() {
    if (!deleteDialog?.player) return
    await removePlayer(deleteDialog.player.id)
    setDeleteDialog(null)
  }

  async function handleStatusClick(player) {
    if (player.status !== 'active') {
      setStatusDialog({
        mode: 'play',
        player,
      })
      return
    }

    const scheduledRoundEntry = getLatestMatchRoundEntry(state.rounds, player.id)

    if (!scheduledRoundEntry) {
      setStatusDialog({
        mode: 'rest',
        player,
      })
      return
    }

    const roundState = getRoundSessionState(
      state.session,
      scheduledRoundEntry.displayRoundNumber,
      new Date()
    )
    const canEditRound = roundState === 'upcoming'
    const replacement = canEditRound
      ? getFirstSitOutReplacement(scheduledRoundEntry.round, player.id, state.players)
      : null
    const restingSitOuts = canEditRound && !replacement
      ? getRestingSitOuts(scheduledRoundEntry.round, player.id, state.players)
      : []

    setStatusDialog({
      mode: 'rest',
      player,
      roundIdx: scheduledRoundEntry.index,
      roundNumber: scheduledRoundEntry.displayRoundNumber,
      roundState,
      canEditRound,
      replacement,
      restingSitOuts,
    })
  }

  async function confirmStatusChange() {
    if (!statusDialog?.player) return

    const success = statusDialog.mode === 'rest' && statusDialog.replacement
      ? await restPlayerWithReplacement(
          statusDialog.player.id,
          statusDialog.roundIdx,
          statusDialog.replacement.id
        )
      : await togglePlayerStatus(statusDialog.player.id)

    if (success) setStatusDialog(null)
  }

  function getStatusDialogSubtitle() {
    if (!statusDialog) return ''
    if (statusDialog.mode === 'play') return 'Player will be available'
    if (statusDialog.replacement) return 'Replace in current round'
    if (statusDialog.roundNumber && statusDialog.canEditRound === false) return 'Round cannot be changed now'
    if (statusDialog.roundNumber && statusDialog.restingSitOuts?.length > 0) return 'Sitting-out player is resting'
    if (statusDialog.roundNumber) return 'No automatic replacement available'
    return 'Player will rest'
  }

  function canConfirmStatusDialog() {
    if (!statusDialog) return false
    if (statusDialog.mode === 'play') return true
    if (!statusDialog.roundNumber) return true
    return Boolean(statusDialog.replacement)
  }

  function getStatusConfirmLabel() {
    if (statusDialog?.mode === 'play') return 'Set to Play'
    if (statusDialog?.replacement) return 'Rest & Replace'
    return 'Rest Player'
  }

  function getStatusCancelLabel() {
    if (!statusDialog) return 'Cancel'
    if (statusDialog.mode === 'play' || !statusDialog.roundNumber || statusDialog.replacement) return 'Cancel'
    return 'Close'
  }

  function getStatusDialogMessage() {
    if (!statusDialog) return null

    if (statusDialog.mode === 'play') {
      return `${statusDialog.player.name ?? 'This player'} will be marked as available to play in future generated rounds. This does not change any existing scheduled round.`
    }

    if (statusDialog.replacement) {
      return `${statusDialog.player.name ?? 'This player'} is scheduled in upcoming Round ${statusDialog.roundNumber}. Resting them now will swap ${statusDialog.replacement.name ?? 'the sitting-out player'} from Sitting Out into their match position, move ${statusDialog.player.name ?? 'this player'} to Sitting Out, update both players' round counts, and mark ${statusDialog.player.name ?? 'this player'} as resting for future rounds.`
    }

    if (statusDialog.roundNumber && statusDialog.canEditRound === false) {
      const roundStateLabel = statusDialog.roundState === 'completed' ? 'completed' : 'in progress'
      return `${statusDialog.player.name ?? 'This player'} is scheduled in Round ${statusDialog.roundNumber}, but that round is already ${roundStateLabel}. In-progress and completed rounds cannot be changed from the player list because it would make the saved schedule and broadcast history unreliable.`
    }

    if (statusDialog.roundNumber) {
      if (statusDialog.restingSitOuts?.length > 0) {
        const restingNames = statusDialog.restingSitOuts
          .map(player => player.name)
          .filter(Boolean)
          .join(', ')
        const restingLabel = restingNames || 'the sitting-out player'
        return `${statusDialog.player.name ?? 'This player'} is scheduled in upcoming Round ${statusDialog.roundNumber}, but ${restingLabel} ${statusDialog.restingSitOuts.length === 1 ? 'is' : 'are'} already resting. Resting players cannot be swapped into a match, so this replacement cannot be done automatically.`
      }

      return `${statusDialog.player.name ?? 'This player'} is scheduled in upcoming Round ${statusDialog.roundNumber}, but there is no sitting-out player in that round to replace them. This match cannot be changed automatically.`
    }

    return `${statusDialog.player.name ?? 'This player'} is not currently scheduled in a match. Resting them will make them unavailable for future generated rounds.`
  }

  if (visiblePlayers.length === 0) {
    return (
      <div className="text-center py-14 text-gray-300">
        <div className="text-4xl mb-3">👥</div>
        <p className="text-sm">{emptyMessage ?? 'No players yet — add your first player on the left'}</p>
      </div>
    )
  }

  const deleteDialogElement = deleteDialog ? (
    <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-green-950/45 px-4 py-6 backdrop-blur-sm sm:px-6">
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
  ) : null

  const statusDialogElement = statusDialog ? (
    <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-green-950/45 px-4 py-6 backdrop-blur-sm sm:px-6">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-2xl">
        <div className="border-b border-amber-100 bg-amber-50 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-amber-500 shadow-sm">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-green-900 sm:text-xl">
                {statusDialog.mode === 'play' ? `Set ${statusDialog.player.name ?? 'this player'} to Play?` : `Rest ${statusDialog.player.name ?? 'this player'}?`}
              </h2>
              <p className="mt-1 text-sm font-bold text-amber-600">
                {getStatusDialogSubtitle()}
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <p className="text-sm leading-relaxed text-gray-600">{getStatusDialogMessage()}</p>
        </div>
        <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:px-6">
          <button
            type="button"
            onClick={() => setStatusDialog(null)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50"
          >
            {getStatusCancelLabel()}
          </button>
          {canConfirmStatusDialog() && (
            <button
              type="button"
              onClick={confirmStatusChange}
              className="w-full rounded-xl bg-coral-500 px-4 py-3 text-sm font-black text-white transition-all hover:bg-coral-600"
            >
              {getStatusConfirmLabel()}
            </button>
          )}
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {visiblePlayers.map((player, idx) => {
          const usage = getPlayerRoundUsage(state.rounds, player.id)
          const { matchedRoundCount } = usage
          const quotaReached = Number.isInteger(player.plannedRounds)
            && player.plannedRounds > 0
            && matchedRoundCount >= player.plannedRounds

          return (
            <div key={player.id} className={idx !== 0 ? 'border-t border-gray-50' : ''}>
              <div className={`flex items-center gap-3 px-6 py-5 transition-all duration-150 hover:bg-gray-50 ${player.status === 'resting' || quotaReached ? 'opacity-60' : ''} ${editingPlayerId === player.id ? 'bg-coral-50/70' : ''}`}>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
                  quotaReached ? 'bg-amber-500' : player.status === 'active' ? 'bg-coral-400' : 'bg-gray-300'
                }`} />

                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900 text-base">{player.name ?? 'Unnamed player'}</span>
                  <GenderBadge gender={player.gender} />
                  <RatingBadge rating={player.rating} />
                  {quotaReached && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black uppercase tracking-wide text-amber-800">
                      Quota Reached
                    </span>
                  )}
                </div>

                <span className="text-sm text-gray-400 hidden sm:block flex-shrink-0">
                  {matchedRoundCount}R · {player.sitOutCount} out
                  {player.plannedRounds > 0 && ` · /${player.plannedRounds}`}
                </span>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStatusClick(player)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all duration-150 ${
                      player.status === 'active'
                        ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                        : 'text-coral-600 hover:bg-coral-50'
                    }`}>
                    {player.status === 'active' ? 'Rest' : 'Play'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditPlayer?.(player)}
                    className={`p-1.5 transition-colors rounded-lg ${editingPlayerId === player.id ? 'text-coral-600 bg-coral-100' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteDialog(player, usage)}
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
      {deleteDialogElement ? createPortal(deleteDialogElement, document.body) : null}
      {statusDialogElement ? createPortal(statusDialogElement, document.body) : null}
    </>
  )
}
