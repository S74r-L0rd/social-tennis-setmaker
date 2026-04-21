import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useSession } from '../../context/SessionContext'

export default function PlayerToken({ playerId, disabled = false }) {
  const { getPlayerById } = useSession()
  const player = getPlayerById(playerId)
  const id = String(playerId)

  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id, disabled })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id, disabled })

  function setRef(el) { setDragRef(el); setDropRef(el) }

  if (!player) return null

  const RATING_COLOR = { 1: 'text-sky-600', 2: 'text-emerald-600', 3: 'text-amber-600' }
  const GENDER_COLOR = { male: 'text-blue-400', female: 'text-pink-400' }

  return (
    <div
      ref={setRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`
        flex items-center gap-3 px-5 py-3 rounded-xl bg-white border select-none
        transition-all duration-150
        ${disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
        ${isDragging ? 'opacity-40 shadow-xl z-50 scale-105' : ''}
        ${isOver && !disabled ? 'ring-2 ring-coral-400 border-coral-300 bg-coral-50' : 'border-gray-200 shadow-sm'}
      `}
      {...attributes}
      {...(disabled ? {} : listeners)}
    >
      <span className={`text-sm font-black ${GENDER_COLOR[player.gender] ?? 'text-gray-400'}`}>
        {player.gender === 'male' ? 'M' : 'F'}
      </span>
      <span className="text-base font-bold text-gray-800 truncate">{player.name}</span>
      <span className={`text-sm font-black ml-auto ${RATING_COLOR[player.rating] ?? 'text-gray-400'}`}>
        {player.rating}
      </span>
    </div>
  )
}
