import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { GenderBadge, RatingBadge, StatusBadge } from '../components/ui/Badge'
import { getRoundSessionState } from '../utils/roundSchedule'

const EMPTY_EDIT = { name: '', gender: 'male', rating: 2 }
const ROUND_OPTIONS = Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))

function getPlayerStats(playerDatabase, playerId) {
  return playerDatabase.find(player => player.id === playerId) ?? {
    sessionCount: 0,
    totalMatches: 0,
    totalSitOuts: 0,
    commonPartnerName: 'No partner data yet',
  }
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

function getMatchedRoundCount(rounds = [], playerId) {
  return (rounds ?? []).filter(round => playerIsInRoundMatch(round, playerId)).length
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

function EditPlayerDialog({ player, sessionPlayer, currentSessionName, matchedRoundCount = 0, onClose, onSave }) {
  const [form, setForm] = useState(() => player ? {
    name: player.name ?? '',
    gender: player.gender ?? 'male',
    rating: Number(player.rating ?? 2),
    plannedRounds: Number(sessionPlayer?.plannedRounds ?? 0) > 0 ? Number(sessionPlayer.plannedRounds) : '',
  } : EMPTY_EDIT)
  const [error, setError] = useState(null)
  const [quotaWarningAccepted, setQuotaWarningAccepted] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!player) return
    setForm({
      name: player.name ?? '',
      gender: player.gender ?? 'male',
      rating: Number(player.rating ?? 2),
      plannedRounds: Number(sessionPlayer?.plannedRounds ?? 0) > 0 ? Number(sessionPlayer.plannedRounds) : '',
    })
    setError(null)
    setQuotaWarningAccepted(false)
  }, [player, sessionPlayer])

  if (!player) return null

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('Player name is required.')
      return
    }
    if (sessionPlayer) {
      const plannedRounds = Number(form.plannedRounds)
      if (!Number.isInteger(plannedRounds) || plannedRounds < 1) {
        setError('Select at least 1 round to play for the current session.')
        return
      }
      if (plannedRounds < matchedRoundCount && !quotaWarningAccepted) {
        setQuotaWarningAccepted(true)
        return
      }
    }

    setSaving(true)
    setError(null)
    try {
      await onSave(player.id, {
        name: form.name.trim(),
        gender: form.gender,
        rating: Number(form.rating),
        ...(sessionPlayer ? { plannedRounds: Number(form.plannedRounds) } : {}),
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-green-950/45 px-4 py-6 backdrop-blur-sm sm:px-6">
      <form onSubmit={handleSubmit} className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-green-100 bg-white shadow-2xl">
        <div className="border-b border-green-100 bg-green-50 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-black text-green-900 sm:text-xl">Edit {player.name}</h2>
          <p className="mt-1 text-sm font-bold text-green-700">
            Account details update everywhere{sessionPlayer ? '; rounds to play updates the current session' : ''}
          </p>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-5 py-5 sm:px-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {sessionPlayer && quotaWarningAccepted && Number(form.plannedRounds) < matchedRoundCount && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
              This player is already scheduled in {matchedRoundCount} match round{matchedRoundCount === 1 ? '' : 's'}. Saving {form.plannedRounds} round{Number(form.plannedRounds) === 1 ? '' : 's'} to play will leave the existing schedule above their new target. Clear or regenerate the schedule if you want the quota to match future rounds.
            </div>
          )}

          <label className="flex flex-col gap-2">
            <span className="text-xs font-black uppercase tracking-wide text-gray-500">Name</span>
            <input
              type="text"
              value={form.name}
              onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-coral-400"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-black uppercase tracking-wide text-gray-500">Gender</span>
            <div className="grid grid-cols-2 gap-2.5">
              {[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, gender: option.value }))}
                  className={`rounded-xl border py-3 text-sm font-bold transition-all ${
                    form.gender === option.value
                      ? 'border-green-700 bg-green-50 text-green-800 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-black uppercase tracking-wide text-gray-500">Skill Level</span>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { value: 1, label: 'Lv.1' },
                { value: 2, label: 'Lv.2' },
                { value: 3, label: 'Lv.3' },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, rating: option.value }))}
                  className={`rounded-xl border py-3 text-sm font-black transition-all ${
                    Number(form.rating) === option.value
                      ? 'border-green-700 bg-green-50 text-green-800 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {sessionPlayer ? (
            <label className="flex flex-col gap-2">
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">Rounds to Play</span>
              <select
                value={form.plannedRounds}
                onChange={event => setForm(prev => ({ ...prev, plannedRounds: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-coral-400"
              >
                <option value="" disabled>Select rounds</option>
                {ROUND_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <span className="text-xs leading-relaxed text-gray-400">
                Applies to {currentSessionName ?? 'the current session'} only.
              </span>
            </label>
          ) : (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
              Rounds to Play is set per session. Add this player to the current session before editing their round target.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-coral-500 px-4 py-3 text-sm font-black text-white transition-all hover:bg-coral-600 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

function StatusDialog({ dialog, onClose, onConfirm }) {
  if (!dialog) return null

  const isPlay = dialog.mode === 'play'
  const canConfirm = isPlay || !dialog.roundNumber || Boolean(dialog.replacement)
  const title = isPlay
    ? `Set ${dialog.player.name ?? 'this player'} to Play?`
    : `Rest ${dialog.player.name ?? 'this player'}?`
  const subtitle = isPlay
    ? 'Player will be available'
    : dialog.replacement
    ? 'Replace in current round'
    : dialog.roundNumber && dialog.canEditRound === false
    ? 'Round cannot be changed now'
    : dialog.roundNumber && dialog.restingSitOuts?.length > 0
    ? 'Sitting-out player is resting'
    : dialog.roundNumber
    ? 'No automatic replacement available'
    : 'Player will rest'

  let message = ''
  if (isPlay) {
    message = `${dialog.player.name ?? 'This player'} will be marked as available to play in future generated rounds for the current session.`
  } else if (dialog.replacement) {
    message = `${dialog.player.name ?? 'This player'} is scheduled in upcoming Round ${dialog.roundNumber}. Resting them now will swap ${dialog.replacement.name ?? 'the sitting-out player'} into their match position, move ${dialog.player.name ?? 'this player'} to Sitting Out, and mark ${dialog.player.name ?? 'this player'} as resting for future rounds.`
  } else if (dialog.roundNumber && dialog.canEditRound === false) {
    const roundStateLabel = dialog.roundState === 'completed' ? 'completed' : 'in progress'
    message = `${dialog.player.name ?? 'This player'} is scheduled in Round ${dialog.roundNumber}, but that round is already ${roundStateLabel}. In-progress and completed rounds cannot be changed from player management.`
  } else if (dialog.roundNumber && dialog.restingSitOuts?.length > 0) {
    const restingNames = dialog.restingSitOuts.map(player => player.name).filter(Boolean).join(', ')
    const restingLabel = restingNames || 'the sitting-out player'
    message = `${dialog.player.name ?? 'This player'} is scheduled in upcoming Round ${dialog.roundNumber}, but ${restingLabel} ${dialog.restingSitOuts.length === 1 ? 'is' : 'are'} already resting. Resting players cannot be swapped into a match automatically.`
  } else if (dialog.roundNumber) {
    message = `${dialog.player.name ?? 'This player'} is scheduled in upcoming Round ${dialog.roundNumber}, but there is no sitting-out player in that round to replace them. This match cannot be changed automatically.`
  } else {
    message = `${dialog.player.name ?? 'This player'} is not currently scheduled in a match. Resting them will make them unavailable for future generated rounds in the current session.`
  }

  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-green-950/45 px-4 py-6 backdrop-blur-sm sm:px-6">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-2xl">
        <div className="border-b border-amber-100 bg-amber-50 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-black text-green-900 sm:text-xl">{title}</h2>
          <p className="mt-1 text-sm font-bold text-amber-600">{subtitle}</p>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <p className="text-sm leading-relaxed text-gray-600">{message}</p>
        </div>
        <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50"
          >
            {canConfirm ? 'Cancel' : 'Close'}
          </button>
          {canConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              className="w-full rounded-xl bg-coral-500 px-4 py-3 text-sm font-black text-white transition-all hover:bg-coral-600"
            >
              {isPlay ? 'Set to Play' : dialog.replacement ? 'Rest & Replace' : 'Rest Player'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function DeletePlayerDialog({ player, stats, onClose, onConfirm }) {
  if (!player) return null
  const hasScheduledMatches = Number(stats?.totalMatches ?? 0) > 0

  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-green-950/45 px-4 py-6 backdrop-blur-sm sm:px-6">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-red-100 bg-white shadow-2xl">
        <div className="border-b border-red-100 bg-red-50 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-black text-green-900 sm:text-xl">Delete {player.name}?</h2>
          <p className="mt-1 text-sm font-bold text-red-500">
            {hasScheduledMatches ? 'Scheduled match found' : 'Permanent database delete'}
          </p>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <p className="text-sm leading-relaxed text-gray-600">
            {hasScheduledMatches
              ? `This player appears in ${stats.totalMatches} scheduled match${stats.totalMatches === 1 ? '' : 'es'}. Clear the affected schedules before deleting them.`
              : 'This removes the player from your account and any sessions they are attached to. This cannot be undone.'}
          </p>
        </div>
        <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50"
          >
            {hasScheduledMatches ? 'Close' : 'Cancel'}
          </button>
          {!hasScheduledMatches && (
            <button
              type="button"
              onClick={() => onConfirm(player.id)}
              className="w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-black text-white transition-all hover:bg-red-600"
            >
              Delete Player
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ManagePlayersPage() {
  const navigate = useNavigate()
  const { state, updatePlayer, removePlayer, togglePlayerStatus, restPlayerWithReplacement, clearError } = useSession()
  const [query, setQuery] = useState('')
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [deletePlayer, setDeletePlayer] = useState(null)
  const [statusDialog, setStatusDialog] = useState(null)

  useEffect(() => { clearError() }, [])

  const currentSessionPlayersById = useMemo(
    () => new Map((state.players ?? []).map(player => [player.id, player])),
    [state.players]
  )

  const filteredPlayers = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const players = [...(state.playerLibrary ?? [])].sort((a, b) =>
      (a.name ?? '').localeCompare(b.name ?? '')
    )

    if (!normalized) return players
    return players.filter(player => (player.name ?? '').toLowerCase().includes(normalized))
  }, [state.playerLibrary, query])

  async function confirmDelete(playerId) {
    await removePlayer(playerId)
    setDeletePlayer(null)
  }

  async function handleToggleCurrentSessionStatus(playerId) {
    const player = currentSessionPlayersById.get(playerId)
    if (!player) return

    if (player.status !== 'active') {
      setStatusDialog({ mode: 'play', player })
      return
    }

    const scheduledRoundEntry = getLatestMatchRoundEntry(state.rounds, player.id)
    if (!scheduledRoundEntry) {
      setStatusDialog({ mode: 'rest', player })
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

  return (
    <>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-coral-500">Player Library</p>
            <h1 className="mt-2 text-3xl font-black text-green-900">Manage Players</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500">
              View and manage every player saved to your organiser account. Session-specific Rest and Play actions are available for players in your currently selected session.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/players')}
            className="inline-flex w-full items-center justify-center rounded-xl bg-coral-500 px-5 py-3 text-sm font-black text-white shadow-sm transition-all hover:bg-coral-600 sm:w-auto"
          >
            Add to Current Session
          </button>
        </div>

        {state.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {state.error}
          </div>
        )}

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-green-900">{state.playerLibrary.length} saved player{state.playerLibrary.length === 1 ? '' : 's'}</p>
              <p className="mt-1 text-xs text-gray-400">Current session: {state.session?.name ?? 'No session selected'}</p>
            </div>
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search players"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-coral-400 sm:max-w-xs"
            />
          </div>
        </div>

        {filteredPlayers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
            <h2 className="text-xl font-black text-green-900">No players found</h2>
            <p className="mt-2 text-sm text-gray-400">
              {query ? 'Try a different search.' : 'Add players from a session to build your player library.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredPlayers.map(player => {
              const stats = getPlayerStats(state.playerDatabase, player.id)
              const currentSessionPlayer = currentSessionPlayersById.get(player.id)
              const status = currentSessionPlayer?.status

              return (
                <article key={player.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="break-words text-lg font-black text-green-900">{player.name}</h2>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <GenderBadge gender={player.gender} />
                          <RatingBadge rating={player.rating} />
                          {status ? <StatusBadge status={status} /> : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Not in current session</span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingPlayer(player)}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-600 transition-all hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletePlayer(player)}
                          className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-500 transition-all hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-xl bg-stone-50 px-3 py-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">Rounds</p>
                        <p className="mt-1 text-lg font-black text-green-900">
                          {currentSessionPlayer ? `${currentSessionPlayer.roundsPlayed}/${currentSessionPlayer.plannedRounds}` : '-'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-stone-50 px-3 py-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">Sessions</p>
                        <p className="mt-1 text-lg font-black text-green-900">{stats.sessionCount}</p>
                      </div>
                      <div className="rounded-xl bg-stone-50 px-3 py-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">Matches</p>
                        <p className="mt-1 text-lg font-black text-green-900">{stats.totalMatches}</p>
                      </div>
                      <div className="rounded-xl bg-stone-50 px-3 py-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">Sit-outs</p>
                        <p className="mt-1 text-lg font-black text-green-900">{stats.totalSitOuts}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm leading-relaxed text-gray-500">
                        {currentSessionPlayer
                          ? `Available controls apply to ${state.session?.name ?? 'the current session'} only.`
                          : 'This player is saved to your account but is not attached to the current session.'}
                      </p>
                      {currentSessionPlayer && (
                        <button
                          type="button"
                          onClick={() => handleToggleCurrentSessionStatus(player.id)}
                          className="inline-flex w-full shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-black text-green-900 transition-all hover:bg-green-50 sm:w-auto"
                        >
                          {status === 'active' ? 'Rest' : 'Play'}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {editingPlayer ? createPortal(
        <EditPlayerDialog
          player={editingPlayer}
          sessionPlayer={currentSessionPlayersById.get(editingPlayer.id)}
          currentSessionName={state.session?.name}
          matchedRoundCount={getMatchedRoundCount(state.rounds, editingPlayer.id)}
          onClose={() => setEditingPlayer(null)}
          onSave={updatePlayer}
        />,
        document.body
      ) : null}

      {deletePlayer ? createPortal(
        <DeletePlayerDialog
          player={deletePlayer}
          stats={getPlayerStats(state.playerDatabase, deletePlayer.id)}
          onClose={() => setDeletePlayer(null)}
          onConfirm={confirmDelete}
        />,
        document.body
      ) : null}

      {statusDialog ? createPortal(
        <StatusDialog
          dialog={statusDialog}
          onClose={() => setStatusDialog(null)}
          onConfirm={confirmStatusChange}
        />,
        document.body
      ) : null}
    </>
  )
}
