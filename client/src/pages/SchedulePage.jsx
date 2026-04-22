import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useSession } from '../context/SessionContext'
import RoundPanel from '../components/schedule/RoundPanel'
import { formatRoundStartLabel } from '../utils/roundSchedule'

function formatGeneratedAt(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function SchedulePage() {
  const { state, confirmAndGenerateNext, swapPlayers, clearError, clearSchedule, reshuffleRound, undoReshuffleRound } = useSession()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(() => Math.max(0, state.rounds.length - 1))

  useEffect(() => {
    setActiveTab(prev => Math.min(prev, Math.max(0, state.rounds.length - 1)))
  }, [state.rounds.length])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const currentRoundIdx = state.rounds.length - 1
  const isCurrentTab = activeTab === currentRoundIdx
  const currentRound = state.rounds[activeTab]
  const generatedAtLabel = formatGeneratedAt(currentRound?.generatedAt)
  const roundStartLabel = currentRound ? formatRoundStartLabel(state.session, currentRound.roundNumber) : null

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    swapPlayers(activeTab, Number(active.id), Number(over.id))
  }

  function handleGenerateNext() {
    clearError()
    confirmAndGenerateNext()
    setActiveTab(state.rounds.length)
  }

  function showPreviousRound() {
    setActiveTab(prev => Math.max(0, prev - 1))
  }

  function showNextRound() {
    setActiveTab(prev => Math.min(state.rounds.length - 1, prev + 1))
  }

  function handleClearSchedule() {
    if (!window.confirm('Clear all generated rounds and start scheduling again?')) return
    clearSchedule()
    navigate('/players')
  }

  function handleReshuffleCurrentRound() {
    if (!currentRound) return
    reshuffleRound(activeTab)
  }

  function handleUndoReshuffle() {
    if (!currentRound?.reshuffleUndoSnapshot) return
    undoReshuffleRound(activeTab)
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
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-3xl font-black text-green-900">Schedule</h1>
          <p className="text-base text-gray-400 mt-0.5">{state.session?.name} · {state.rounds.length} round{state.rounds.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReshuffleCurrentRound}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:border-coral-400 hover:text-coral-600 bg-white shadow-sm hover:shadow-md transition-all duration-200 font-bold active:scale-[0.97]"
          >
            Reshuffle Current Round
          </button>
          <button
            type="button"
            onClick={handleUndoReshuffle}
            disabled={!currentRound?.reshuffleUndoSnapshot}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 bg-white shadow-sm transition-all duration-200 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:border-gray-300 hover:shadow-md active:scale-[0.97]"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={handleClearSchedule}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-500 hover:border-red-300 hover:text-red-500 bg-white shadow-sm hover:shadow-md transition-all duration-200 font-bold active:scale-[0.97]"
          >
            Clear Schedule
          </button>
          <button onClick={() => navigate('/broadcast')}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:border-coral-400 hover:text-coral-600 bg-white shadow-sm hover:shadow-md transition-all duration-200 font-bold active:scale-[0.97]">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            Broadcast
          </button>
        </div>
      </div>

      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 animate-scale-in">
          {state.error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 animate-slide-up" style={{ animationDelay: '0.05s' }}>
        <button
          type="button"
          onClick={showPreviousRound}
          disabled={activeTab === 0}
          className="inline-flex items-center px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-gray-300 transition-all"
        >
          ← Previous Round
        </button>

        <div className="text-center">
          <p className="text-sm font-black text-green-900">
            Round {activeTab + 1} of {state.rounds.length}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {generatedAtLabel ? `Generated ${generatedAtLabel}` : 'Generation time unavailable'}
          </p>
        </div>

        <button
          type="button"
          onClick={showNextRound}
          disabled={activeTab === state.rounds.length - 1}
          className="inline-flex items-center px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-gray-300 transition-all"
        >
          Next Round →
        </button>
      </div>

      {currentRound && (
        <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 font-bold animate-scale-in">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          Drag players to swap positions in this round
        </div>
      )}

      {currentRound && (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <RoundPanel round={currentRound} isEditable roundStartLabel={roundStartLabel} />
        </DndContext>
      )}

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
