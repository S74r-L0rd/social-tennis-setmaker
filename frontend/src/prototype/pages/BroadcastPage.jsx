import { useSession } from '../context/SessionContext'
import { QRCodeSVG } from 'qrcode.react'
import { RatingBadge, GenderBadge } from '../components/ui/Badge'

function PlayerChip({ player }) {
  if (!player) return null
  return (
    <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-gray-100 shadow-sm text-base font-bold text-gray-800">
      {player.name}
      <GenderBadge gender={player.gender} />
      <RatingBadge rating={player.rating} />
    </span>
  )
}

function BroadcastRound({ round, getPlayerById }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h3 className="text-xl font-black text-green-900">Round {round.roundNumber}</h3>
        {round.isConfirmed && <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-bold">Confirmed</span>}
      </div>

      {round.matches.map((match, i) => {
        const [team1, team2] = match.teams
        return (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-green-900">
              <span className="text-xs font-black text-white uppercase tracking-widest">{match.court}</span>
            </div>
            <div className="p-5 flex items-start gap-4">
              <div className="flex flex-col gap-2.5 flex-1">
                {team1.map(p => <PlayerChip key={p.id} player={getPlayerById(p.id)} />)}
              </div>
              <div className="text-sm font-black text-gray-200 pt-2 flex-shrink-0">VS</div>
              <div className="flex flex-col gap-2.5 flex-1">
                {team2.map(p => <PlayerChip key={p.id} player={getPlayerById(p.id)} />)}
              </div>
            </div>
          </div>
        )
      })}

      {round.sitOuts.length > 0 && (
        <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 px-5 py-4">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Sitting Out</p>
          <div className="flex flex-wrap gap-2.5">
            {round.sitOuts.map(p => <PlayerChip key={p.id} player={getPlayerById(p.id)} />)}
          </div>
        </div>
      )}
    </div>
  )
}

export default function BroadcastPage() {
  const { state, toggleBroadcast, getPlayerById } = useSession()
  const broadcastUrl = window.location.origin + '/broadcast'

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

      {/* Header */}
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

      {/* QR Card */}
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
        </div>
      </div>

      {/* Schedule */}
      {state.rounds.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">No schedule yet</p>
      ) : (
        <div className="flex flex-col gap-8">
          {state.rounds.map((round, idx) => (
            <BroadcastRound key={idx} round={round} getPlayerById={getPlayerById} />
          ))}
        </div>
      )}
    </div>
  )
}
