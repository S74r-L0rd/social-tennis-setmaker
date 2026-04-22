import { useEffect, useState } from 'react'
import { useSession } from '../context/SessionContext'
import { QRCodeSVG } from 'qrcode.react'
import { RatingBadge, GenderBadge } from '../components/ui/Badge'
import { DEFAULT_MATCH_DURATION_MINUTES, formatRoundStartLabel, getRoundStartDate } from '../utils/roundSchedule'

const SESSION_STATES = [
  { key: 'upcoming', label: 'Upcoming Session' },
  { key: 'in_progress', label: 'In Progress Session' },
  { key: 'completed', label: 'Completed Session' },
]

function getRoundSessionState(sessionConfig, round) {
  if (!round) return null

  const roundStartDate = getRoundStartDate(sessionConfig, round.roundNumber)
  if (!roundStartDate) return null

  const now = new Date()
  const matchDurationMinutes = Number(sessionConfig?.matchDurationMinutes ?? DEFAULT_MATCH_DURATION_MINUTES)
  const roundEndDate = new Date(roundStartDate.getTime() + matchDurationMinutes * 60 * 1000)

  if (now < roundStartDate) return 'upcoming'
  if (now >= roundEndDate) return 'completed'
  return 'in_progress'
}

function PlayerChip({ player, showRatings }) {
  if (!player) return null
  return (
    <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-gray-100 shadow-sm text-base font-bold text-gray-800">
      {player.name}
      <GenderBadge gender={player.gender} />
      {showRatings && <RatingBadge rating={player.rating} />}
    </span>
  )
}

function BroadcastRound({ round, session, getPlayerById, showRatings }) {
  const roundStartLabel = formatRoundStartLabel(session, round.roundNumber)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div>
          <h3 className="text-xl font-black text-green-900">Round {round.roundNumber}</h3>
        </div>
        {round.isConfirmed && <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-bold">Confirmed</span>}
      </div>

      {round.matches.map((match, i) => {
        const [team1, team2] = match.teams
        return (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-6 py-4 bg-green-900">
              <span className="text-xs font-black text-white uppercase tracking-widest">{match.court}</span>
              {roundStartLabel && (
                <span className="text-xs font-black tracking-wide text-white">
                  Starts {roundStartLabel}
                </span>
              )}
            </div>
            <div className="p-5 flex items-start gap-4">
              <div className="flex flex-col gap-2.5 flex-1">
                {team1.map(p => <PlayerChip key={p.id} player={getPlayerById(p.id)} showRatings={showRatings} />)}
              </div>
              <div className="text-sm font-black text-gray-200 pt-2 flex-shrink-0">VS</div>
              <div className="flex flex-col gap-2.5 flex-1">
                {team2.map(p => <PlayerChip key={p.id} player={getPlayerById(p.id)} showRatings={showRatings} />)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function BroadcastPage() {
  const { state, toggleBroadcast, setBroadcastRound, getPlayerById } = useSession()
  const [showRatings, setShowRatings] = useState(true)
  const [selectedRoundNumber, setSelectedRoundNumber] = useState(null)
  const broadcastUrl = window.location.origin + '/broadcast'

  useEffect(() => {
    if (state.rounds.length === 0) {
      setSelectedRoundNumber(null)
      return
    }

    const hasSelectedRound = state.rounds.some(round => round.roundNumber === selectedRoundNumber)
    if (hasSelectedRound) return

    const preferredRoundNumber = state.selectedBroadcastRoundNumber ?? state.rounds[state.rounds.length - 1].roundNumber
    setSelectedRoundNumber(preferredRoundNumber)
  }, [state.rounds, state.selectedBroadcastRoundNumber, selectedRoundNumber])

  const broadcastRound = state.rounds.find(round => round.roundNumber === selectedRoundNumber)
    ?? state.rounds[state.rounds.length - 1]
  const currentSessionState = getRoundSessionState(state.session, broadcastRound)

  function handleSelectRound(roundNumber) {
    setSelectedRoundNumber(roundNumber)
    setBroadcastRound(roundNumber)
  }

  if (!state.isBroadcasting) {
    return (
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center py-24 gap-6 text-center animate-fade-in">
        <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center text-4xl">📡</div>
        <div>
          <h2 className="text-3xl font-black text-green-900">Broadcast is off</h2>
          <p className="text-base text-gray-400 mt-1.5">Turn on broadcast so players can view the schedule</p>
        </div>
        <button onClick={toggleBroadcast}
          className="px-8 py-3.5 bg-coral-500 hover:bg-coral-600 text-white rounded-xl font-black text-sm transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]">
          Start Broadcasting
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8 animate-fade-in">
      <div className="flex items-center justify-between animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-coral-500 rounded-full animate-pulse" />
          <div>
            <h1 className="text-3xl font-black text-green-900 tracking-tight">Live</h1>
            <p className="text-base text-gray-400">{state.session?.name}</p>
          </div>
        </div>
        <button onClick={toggleBroadcast}
          className="text-xs px-4 py-2 border border-gray-200 rounded-full text-gray-500 hover:border-red-300 hover:text-red-500 transition-all duration-200 font-bold">
          Stop
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row items-center gap-6 animate-slide-up" style={{ animationDelay: '0.05s' }}>
        <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm flex-shrink-0">
          <QRCodeSVG value={broadcastUrl} size={130} />
        </div>
        <div className="text-center sm:text-left">
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

      {state.rounds.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">No schedule yet</p>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-black uppercase tracking-wide text-gray-400">Rounds</span>
            {state.rounds.map(round => {
              const isSelected = round.roundNumber === broadcastRound?.roundNumber
              return (
                <button
                  key={round.roundNumber}
                  type="button"
                  onClick={() => handleSelectRound(round.roundNumber)}
                  className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-black transition-all ${
                    isSelected
                      ? 'bg-coral-500 text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-600 hover:border-coral-300 hover:text-coral-600'
                  }`}
                >
                  {round.roundNumber}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {SESSION_STATES.map(sessionState => {
              const isActive = sessionState.key === currentSessionState
              return (
                <span
                  key={sessionState.key}
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all ${
                    isActive
                      ? 'bg-coral-500 text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-400'
                  }`}
                >
                  {sessionState.label}
                </span>
              )
            })}
          </div>

          {broadcastRound && (
            <BroadcastRound round={broadcastRound} session={state.session} getPlayerById={getPlayerById} showRatings={showRatings} />
          )}
        </div>
      )}
    </div>
  )
}
