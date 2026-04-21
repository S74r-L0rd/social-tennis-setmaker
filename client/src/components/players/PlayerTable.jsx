import { useState } from 'react'
import { useSession } from '../../context/SessionContext'
import { RatingBadge, GenderBadge } from '../ui/Badge'
import PlayerForm from './PlayerForm'

export default function PlayerTable() {
  const { state, updatePlayer, removePlayer, togglePlayerStatus } = useSession()
  const [editingId, setEditingId] = useState(null)

  if (state.players.length === 0) {
    return (
      <div className="text-center py-14 text-gray-300">
        <div className="text-4xl mb-3">👥</div>
        <p className="text-sm">No players yet — add your first player above</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {state.players.map((player, idx) => (
        <div key={player.id} className={idx !== 0 ? 'border-t border-gray-50' : ''}>
          {editingId === player.id ? (
            <div className="p-5 bg-coral-50 border-l-4 border-coral-400 animate-scale-in">
              <PlayerForm
                initialValues={{ name: player.name, gender: player.gender, rating: player.rating, plannedRounds: player.plannedRounds }}
                onSubmit={updates => { updatePlayer(player.id, updates); setEditingId(null) }}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <div className={`flex items-center gap-3 px-6 py-5 transition-all duration-150 hover:bg-gray-50 ${player.status === 'resting' ? 'opacity-50' : ''}`}>
              {/* Status dot */}
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${player.status === 'active' ? 'bg-coral-400' : 'bg-gray-300'}`} />

              {/* Name + badges */}
              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-900 text-base">{player.name}</span>
                <GenderBadge gender={player.gender} />
                <RatingBadge rating={player.rating} />
              </div>

              {/* Stats */}
              <span className="text-sm text-gray-400 hidden sm:block flex-shrink-0">
                {player.roundsPlayed}R · {player.sitOutCount} out
                {player.plannedRounds > 0 && ` · /${player.plannedRounds}`}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => togglePlayerStatus(player.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all duration-150 ${
                    player.status === 'active'
                      ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                      : 'text-coral-600 hover:bg-coral-50'
                  }`}>
                  {player.status === 'active' ? 'Rest' : 'Play'}
                </button>
                <button onClick={() => setEditingId(player.id)}
                  className="p-1.5 text-gray-300 hover:text-gray-500 transition-colors rounded-lg hover:bg-gray-100">
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
          )}
        </div>
      ))}
    </div>
  )
}
