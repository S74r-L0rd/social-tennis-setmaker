import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useSession } from '../context/SessionContext'
import RoundPanel from '../components/schedule/RoundPanel'

export default function SchedulePage() {
  const { state, confirmAndGenerateNext, swapPlayers, clearError } = useSession()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(() => Math.max(0, state.rounds.length - 1))

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const currentRoundIdx = state.rounds.length - 1
  const isCurrentTab = activeTab === currentRoundIdx
  const currentRound = state.rounds[activeTab]

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    swapPlayers(currentRoundIdx, Number(active.id), Number(over.id))
  }

  function handleGenerateNext() {
    clearError()
    confirmAndGenerateNext()
    setActiveTab(state.rounds.length)
  }

  if (state.rounds.length === 0) {
    return (
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center py-24 text-center gap-4 animate-fade-in">
        <div className="text-4xl">📋</div>
        <p className="text-sm text-gray-400">No schedule generated yet</p>
        <button onClick={() => navigate('/players')}
          className="text-sm text-coral-500 hover:text-coral-600 font-bold transition-colors">
          ← Back to Players
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-3xl font-black text-green-900">Schedule</h1>
          <p className="text-base text-gray-400 mt-0.5">{state.session?.name} · {state.rounds.length} round{state.rounds.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => navigate('/broadcast')}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:border-coral-400 hover:text-coral-600 bg-white shadow-sm hover:shadow-md transition-all duration-200 font-bold active:scale-[0.97]">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          Broadcast
        </button>
      </div>

      {/* Error */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 animate-scale-in">
          {state.error}
        </div>
      )}

      {/* Round tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 animate-slide-up" style={{ animationDelay: '0.05s' }}>
        {state.rounds.map((round, idx) => (
          <button key={idx} onClick={() => setActiveTab(idx)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-black transition-all duration-200 ${
              activeTab === idx
                ? 'bg-green-900 text-white shadow-sm'
                : round.isConfirmed
                ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                : 'bg-coral-100 text-coral-700 border border-coral-200 hover:bg-coral-200'
            }`}>
            R{round.roundNumber}
            {round.isConfirmed && ' ✓'}
          </button>
        ))}
      </div>

      {/* Drag hint */}
      {isCurrentTab && !currentRound?.isConfirmed && (
        <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 font-bold animate-scale-in">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          Drag players to swap positions
        </div>
      )}

      {/* Round content */}
      {currentRound && (
        isCurrentTab && !currentRound.isConfirmed
          ? <DndContext sensors={sensors} onDragEnd={handleDragEnd}><RoundPanel round={currentRound} isEditable /></DndContext>
          : <RoundPanel round={currentRound} isEditable={false} />
      )}

      {/* Confirm button */}
      {isCurrentTab && !currentRound?.isConfirmed && (
        <div className="border-t border-gray-100 pt-4 animate-slide-up">
          <button onClick={handleGenerateNext}
            className="w-full py-3.5 bg-coral-500 hover:bg-coral-600 text-white font-black rounded-xl transition-all duration-200 text-sm shadow-sm hover:shadow-md active:scale-[0.98]">
            Confirm & Generate Next Round →
          </button>
          <p className="text-xs text-center text-gray-400 mt-2">
            Results are used to optimise the next matchup
          </p>
        </div>
      )}
    </div>
  )
}
