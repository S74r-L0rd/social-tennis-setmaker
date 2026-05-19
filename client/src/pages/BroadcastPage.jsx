import { useEffect, useState } from 'react'
import { useSession } from '../context/SessionContext'
import { QRCodeSVG } from 'qrcode.react'
import { RatingBadge, GenderBadge } from '../components/ui/Badge'
import { formatBroadcastRoundStatusLabel, getRoundSessionState } from '../utils/roundSchedule'

const SESSION_STATES = [
  { key: 'all', label: 'All Rounds' },
  { key: 'upcoming', label: 'Upcoming Session' },
  { key: 'in_progress', label: 'In Progress Session' },
  { key: 'completed', label: 'Completed Session' },
]

function getOrderedRoundEntries(rounds) {
  return rounds
    .map((round, originalIndex) => ({ round, originalIndex }))
    .sort((a, b) => {
      const aNumber = Number(a.round.roundNumber ?? 0)
      const bNumber = Number(b.round.roundNumber ?? 0)
      if (aNumber !== bNumber) return aNumber - bNumber
      return a.originalIndex - b.originalIndex
    })
    .map((entry, index) => ({
      ...entry,
      displayRoundNumber: index + 1,
      key: `${entry.round._dbId ?? entry.round.roundNumber ?? 'round'}-${entry.originalIndex}`,
    }))
}

function PlayerChip({ player, showRatings }) {
  if (!player) return null
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm text-sm font-bold text-gray-800 sm:px-4 sm:py-2.5 sm:text-base">
      <span className="break-words">{player.name}</span>
      <GenderBadge gender={player.gender} />
      {showRatings && <RatingBadge rating={player.rating} />}
    </span>
  )
}

function BroadcastRound({ round, displayRoundNumber, session, getPlayerById, showRatings, currentTime }) {
  const roundStatusLabel = formatBroadcastRoundStatusLabel(session, displayRoundNumber, currentTime)
  const sitOuts = round.sitOuts ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div>
          <h3 className="text-xl font-black text-green-900">Round {displayRoundNumber}</h3>
        </div>
      </div>

      {round.matches.map((match, i) => {
        const [team1, team2] = match.teams
        return (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex flex-col items-start gap-2 px-4 py-4 bg-green-900 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6">
              <span className="text-xs font-black text-white uppercase tracking-widest">{match.court}</span>
              <span className="text-[11px] font-black tracking-wide text-white sm:text-xs">
                {roundStatusLabel}
              </span>
            </div>
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-5">
              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                {team1.map(p => <PlayerChip key={p.id} player={getPlayerById(p.id)} showRatings={showRatings} />)}
              </div>
              <div className="flex items-center justify-center text-xs font-black uppercase tracking-[0.2em] text-gray-300 sm:pt-2 sm:text-sm sm:tracking-normal">
                VS
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                {team2.map(p => <PlayerChip key={p.id} player={getPlayerById(p.id)} showRatings={showRatings} />)}
              </div>
            </div>
          </div>
        )
      })}

      {sitOuts.length > 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <p className="mb-4 text-xs font-black uppercase tracking-widest text-gray-400 sm:text-sm">Sitting Out</p>
          <div className="flex flex-wrap gap-2.5 sm:gap-3">
            {sitOuts.map(player => (
              <PlayerChip key={player.id} player={getPlayerById(player.id)} showRatings={showRatings} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function BroadcastPage() {
  const { state, toggleBroadcast, setBroadcastRound, getPlayerById } = useSession()
  const [showRatings, setShowRatings] = useState(true)
  const [selectedRoundKey, setSelectedRoundKey] = useState(null)
  const [selectedSessionState, setSelectedSessionState] = useState('all')
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const broadcastUrl = window.location.origin + '/broadcast'
  const roundEntries = getOrderedRoundEntries(state.rounds)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date())
    }, 30000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (roundEntries.length === 0) {
      setSelectedRoundKey(null)
      return
    }

    const preferredEntry = roundEntries.find(entry =>
      entry.round.roundNumber === state.selectedBroadcastRoundNumber
      || entry.displayRoundNumber === state.selectedBroadcastRoundNumber
    ) ?? roundEntries[0]

    if (selectedRoundKey == null) {
      setSelectedRoundKey(preferredEntry.key)
      return
    }

    const hasSelectedRound = roundEntries.some(entry => entry.key === selectedRoundKey)
    if (!hasSelectedRound) {
      setSelectedRoundKey(preferredEntry.key)
    }
  }, [roundEntries, state.selectedBroadcastRoundNumber, selectedRoundKey])

  const roundsWithState = roundEntries.map(entry => ({
    ...entry,
    sessionState: getRoundSessionState(state.session, entry.displayRoundNumber, currentTime),
  }))

  const visibleRounds = selectedSessionState === 'all'
    ? roundsWithState
    : roundsWithState.filter(round => round.sessionState === selectedSessionState)

  useEffect(() => {
    if (visibleRounds.length === 0) return
    if (visibleRounds.some(entry => entry.key === selectedRoundKey)) return
    setSelectedRoundKey(visibleRounds[0].key)
  }, [visibleRounds, selectedRoundKey])

  const broadcastEntry = visibleRounds.find(entry => entry.key === selectedRoundKey) ?? null

  function handleSelectRound(entry) {
    setSelectedRoundKey(entry.key)
    setBroadcastRound(entry.round.roundNumber ?? entry.displayRoundNumber)
  }

  function handleSelectSessionState(sessionState) {
    setSelectedSessionState(sessionState)
  }

  if (!state.isBroadcasting) {
    return (
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center py-24 gap-6 text-center animate-fade-in">
        <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center text-4xl">📡</div>
        <div>
          <h2 className="text-3xl font-black text-green-900">Broadcast is off</h2>
          <p className="text-base text-gray-400 mt-1.5">Turn on broadcast so players can view the schedule</p>
        </div>
        {state.error && (
          <div className="max-w-lg rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {state.error}
          </div>
        )}
        <button onClick={toggleBroadcast}
          className="px-8 py-3.5 bg-coral-500 hover:bg-coral-600 text-white rounded-xl font-black text-sm transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]">
          Start Broadcasting
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 sm:gap-8 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-slide-up">
        <div className="flex min-w-0 items-center gap-3">
          <div className="w-3 h-3 bg-coral-500 rounded-full animate-pulse" />
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-green-900 tracking-tight sm:text-3xl">Live</h1>
            <p className="text-sm text-gray-400 break-words sm:text-base">{state.session?.name}</p>
          </div>
        </div>
        <button onClick={toggleBroadcast}
          className="text-xs px-4 py-2 border border-gray-200 rounded-full text-gray-500 hover:border-red-300 hover:text-red-500 transition-all duration-200 font-bold">
          Stop
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 animate-slide-up" style={{ animationDelay: '0.05s' }}>
        <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm flex-shrink-0">
          <QRCodeSVG value={broadcastUrl} size={112} className="sm:w-[130px] sm:h-[130px]" />
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <p className="text-sm font-black text-gray-800 mb-1.5">Scan to view schedule</p>
          <p className="text-xs text-gray-400 break-all font-mono">{broadcastUrl}</p>
          <p className="text-xs text-amber-700 mt-3 bg-amber-50 rounded-xl px-4 py-2.5 leading-relaxed border border-amber-100">
            Local mode — QR code works on the same network.<br />
            Connect a backend to sync across all devices.
          </p>
          <label className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-gray-600">
            <input
              type="checkbox"
              checked={showRatings}
              onChange={e => setShowRatings(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-coral-500 focus:ring-coral-400"
            />
            Show ratings
          </label>
        </div>
      </div>

      {roundEntries.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">No schedule yet</p>
      ) : (
        <div className="flex flex-col gap-6 sm:gap-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 w-full text-xs font-black uppercase tracking-wide text-gray-400 sm:w-auto">Rounds</span>
            {visibleRounds.map(entry => {
              const isSelected = entry.key === selectedRoundKey
              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => handleSelectRound(entry)}
                  className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-black transition-all ${
                    isSelected
                      ? 'bg-coral-500 text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-600 hover:border-coral-300 hover:text-coral-600'
                  }`}
                >
                  {entry.displayRoundNumber}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {SESSION_STATES.map(sessionState => {
              const isActive = sessionState.key === selectedSessionState
              return (
                <button
                  key={sessionState.key}
                  type="button"
                  onClick={() => handleSelectSessionState(sessionState.key)}
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all ${
                    isActive
                      ? 'bg-coral-500 text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-500 hover:border-coral-300 hover:text-coral-600'
                  }`}
                >
                  {sessionState.label}
                </button>
              )
            })}
          </div>

          {!broadcastEntry && (
            <p className="text-center text-sm text-gray-400 py-8">
              No rounds match this session state.
            </p>
          )}

          {broadcastEntry && (
            <BroadcastRound
              key={broadcastEntry.key}
              round={broadcastEntry.round}
              displayRoundNumber={broadcastEntry.displayRoundNumber}
              session={state.session}
              getPlayerById={getPlayerById}
              showRatings={showRatings}
              currentTime={currentTime}
            />
          )}
        </div>
      )}
    </div>
  )
}
