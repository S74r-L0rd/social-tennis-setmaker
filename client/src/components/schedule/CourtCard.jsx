import PlayerToken from './PlayerToken'
import { useSession } from '../../context/SessionContext'

function teamRating(team, getPlayerById) {
  return team.reduce((sum, p) => sum + (getPlayerById(p.id)?.rating ?? p.rating ?? 0), 0)
}

export default function CourtCard({ match, isEditable }) {
  const { getPlayerById } = useSession()
  const [team1, team2] = match.teams
  const r1 = teamRating(team1, getPlayerById)
  const r2 = teamRating(team2, getPlayerById)
  const imbalanced = Math.abs(r1 - r2) >= 2

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      {/* Court label bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-green-900">
        <span className="text-sm font-black text-white uppercase tracking-widest">{match.court}</span>
        {imbalanced ? (
          <span className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Skill gap
          </span>
        ) : (
          <span className="text-xs text-emerald-400 font-semibold">Balanced ✓</span>
        )}
      </div>

      {/* Teams */}
      <div className="flex items-stretch divide-x divide-stone-100">
        {/* Team 1 */}
        <div className="flex-1 p-5 flex flex-col gap-3">
          {team1.map(p => <PlayerToken key={p.id} playerId={p.id} disabled={!isEditable} />)}
          <div className="text-sm text-gray-400 text-right font-bold mt-1">Rating {r1}</div>
        </div>

        {/* VS divider */}
        <div className="flex items-center justify-center px-4">
          <span className="text-base font-black text-gray-200">VS</span>
        </div>

        {/* Team 2 */}
        <div className="flex-1 p-5 flex flex-col gap-3">
          {team2.map(p => <PlayerToken key={p.id} playerId={p.id} disabled={!isEditable} />)}
          <div className="text-sm text-gray-400 font-bold mt-1">Rating {r2}</div>
        </div>
      </div>
    </div>
  )
}
