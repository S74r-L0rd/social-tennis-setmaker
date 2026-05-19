import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useSession } from '../context/SessionContext'
import RoundPanel from '../components/schedule/RoundPanel'
import { formatRoundStartLabel, getSessionScheduleIssue } from '../utils/roundSchedule'

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
  const [showClearDialog, setShowClearDialog] = useState(false)

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
  const sessionScheduleIssue = getSessionScheduleIssue(state.session)
  const generatedAtLabel = formatGeneratedAt(currentRound?.generatedAt)
  const roundStartLabel = currentRound ? formatRoundStartLabel(state.session, currentRound.roundNumber) : null

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    swapPlayers(activeTab, Number(active.id), Number(over.id))
  }

  function handleGenerateNext() {
    if (sessionScheduleIssue) return
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

  async function handleClearSchedule() {
    setShowClearDialog(false)
    const didClear = await clearSchedule()
    if (didClear) navigate('/players')
  }

  function handleReshuffleCurrentRound() {
    if (!currentRound || sessionScheduleIssue) return
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

  if (sessionScheduleIssue) {
    return (
      <div className="max-w-5xl mx-auto flex flex-col gap-6 animate-fade-in">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900">
          <h1 className="text-2xl font-black">Session configuration required</h1>
          <p className="mt-2 text-sm">{sessionScheduleIssue}</p>
          <p className="mt-1 text-sm">Scheduling is blocked until the session is corrected in Setup.</p>
          <button
            type="button"
            onClick={() => navigate('/setup')}
            className="mt-4 inline-flex rounded-xl bg-coral-500 px-4 py-2.5 text-sm font-black text-white transition-all hover:bg-coral-600"
          >
            Go to Setup
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between animate-slide-up">
        <div>
          <h1 className="text-3xl font-black text-green-900">Schedule</h1>
          <p className="text-base text-gray-400 mt-0.5">{state.session?.name} · {state.rounds.length} round{state.rounds.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
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
            onClick={() => setShowClearDialog(true)}
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

      {showClearDialog && (
        <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-green-950/45 px-4 py-6 backdrop-blur-sm sm:px-6">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-red-100 bg-white shadow-2xl">
            <div className="border-b border-red-100 bg-red-50 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-red-500 shadow-sm">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-green-900 sm:text-xl">Clear schedule?</h2>
                  <p className="mt-1 text-sm font-bold text-red-500">{state.rounds.length} generated round{state.rounds.length !== 1 ? 's' : ''} will be removed.</p>
                </div>
              </div>
            </div>
            <div className="overflow-y-auto px-5 py-5 sm:px-6">
              <p className="text-sm leading-relaxed text-gray-600">
                This will delete the persisted rounds from the database and reset player round counts and sit-out counts for this session. You can generate a new schedule afterwards.
              </p>
            </div>
            <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:px-6">
              <button
                type="button"
                onClick={() => setShowClearDialog(false)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearSchedule}
                className="w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-black text-white transition-all hover:bg-red-600"
              >
                Clear Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
