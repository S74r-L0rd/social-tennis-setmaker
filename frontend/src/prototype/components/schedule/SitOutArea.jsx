import PlayerToken from './PlayerToken'

export default function SitOutArea({ sitOuts, isEditable }) {
  if (sitOuts.length === 0) return null
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6">
      <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Sitting Out</p>
      <div className="flex flex-wrap gap-3">
        {sitOuts.map(p => <PlayerToken key={p.id} playerId={p.id} disabled={!isEditable} />)}
      </div>
    </div>
  )
}
