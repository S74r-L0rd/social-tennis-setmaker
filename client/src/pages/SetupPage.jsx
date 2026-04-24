import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'

const GAME_MODES = [
  { value: 'same_gender', label: 'Same Gender Doubles', desc: "Men's or women's pairs only" },
  { value: 'mixed', label: 'Mixed Doubles', desc: 'One man and one woman per team' },
  { value: 'flexible', label: 'Flexible', desc: 'Any gender combination' },
]

const SESSION_PERIODS = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
]

const AVAILABLE_COURTS = Array.from({ length: 30 }, (_, i) => `Court ${i + 1}`)
const BREAK_INTERVAL_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 20, label: '20 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 Hour' },
]
const MATCH_DURATION_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '60 minutes' },
  { value: 75, label: '75 minutes' },
  { value: 90, label: '90 minutes' },
  { value: 105, label: '105 minutes' },
  { value: 120, label: '120 minutes' },
]

function getTodayDateValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDefaultStartDateTimeValue() {
  const now = new Date()
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0)
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function getDefaultFormState() {
  return {
    sessionDate: getTodayDateValue(),
    sessionPeriod: 'morning',
    startDateTime: getDefaultStartDateTimeValue(),
    matchDurationMinutes: 90,
    breakIntervalMinutes: 10,
    selectedCourts: ['Court 1'],
    gameMode: 'flexible',
  }
}

function formatSessionName(dateValue, periodValue) {
  const [year, month, day] = dateValue.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const periodLabel = SESSION_PERIODS.find(period => period.value === periodValue)?.label ?? 'Morning'
  return `${date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })} ${periodLabel}`
}

function formatDateTimeLabel(value) {
  if (!value) return 'Creation time unavailable'

  return new Date(value).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getSessionPeriodFromRecord(sessionConfig) {
  if (SESSION_PERIODS.some(period => period.value === sessionConfig?.sessionPeriod)) {
    return sessionConfig.sessionPeriod
  }

  const sessionName = sessionConfig?.name ?? ''
  const matchedPeriod = SESSION_PERIODS.find(period =>
    sessionName.toLowerCase().includes(period.label.toLowerCase())
  )
  if (matchedPeriod) return matchedPeriod.value

  if (sessionConfig?.startDateTime) {
    const hour = new Date(sessionConfig.startDateTime).getHours()
    if (hour < 12) return 'morning'
    if (hour < 17) return 'afternoon'
  }

  return 'evening'
}

function getSessionDateFromRecord(sessionConfig) {
  if (sessionConfig?.sessionDate) return sessionConfig.sessionDate
  if (sessionConfig?.startDateTime) return sessionConfig.startDateTime.slice(0, 10)
  return getTodayDateValue()
}

function createFormStateFromSession(sessionConfig) {
  return {
    sessionDate: getSessionDateFromRecord(sessionConfig),
    sessionPeriod: getSessionPeriodFromRecord(sessionConfig),
    startDateTime: sessionConfig?.startDateTime ?? getDefaultStartDateTimeValue(),
    matchDurationMinutes: Number(sessionConfig?.matchDurationMinutes ?? 90),
    breakIntervalMinutes: Number(sessionConfig?.breakIntervalMinutes ?? 10),
    selectedCourts: Array.isArray(sessionConfig?.courts) && sessionConfig.courts.length > 0
      ? sessionConfig.courts
      : ['Court 1'],
    gameMode: sessionConfig?.gameMode ?? 'flexible',
  }
}

function isValidDateTimeValue(value) {
  if (typeof value !== 'string' || !value.trim()) return false

  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}

export default function SetupPage() {
  const { state, setSession, selectSession, updateSessionConfig, deleteSession } = useSession()
  const navigate = useNavigate()
  const sessionPickerRef = useRef(null)
  const startDateTimeInputRef = useRef(null)
  const courtPickerRef = useRef(null)
  const [form, setForm] = useState(getDefaultFormState)
  const [errors, setErrors] = useState({})
  const [isSessionPickerOpen, setIsSessionPickerOpen] = useState(false)
  const [isCourtPickerOpen, setIsCourtPickerOpen] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState(null)

  function validate() {
    const e = {}
    if (!form.sessionDate) e.sessionDate = 'Session date is required'
    if (!SESSION_PERIODS.some(period => period.value === form.sessionPeriod)) {
      e.sessionPeriod = 'Session period is required'
    }
    if (!isValidDateTimeValue(form.startDateTime)) {
      e.startDateTime = 'Match start time is required'
    }
    if (!MATCH_DURATION_OPTIONS.some(option => Number(option.value) === Number(form.matchDurationMinutes))) {
      e.matchDurationMinutes = 'Match duration is required'
    }
    if (!BREAK_INTERVAL_OPTIONS.some(option => Number(option.value) === Number(form.breakIntervalMinutes))) {
      e.breakIntervalMinutes = 'Break interval is required'
    }
    if (form.selectedCourts.length === 0) e.selectedCourts = 'Select at least one court'
    if (!GAME_MODES.some(mode => mode.value === form.gameMode)) {
      e.gameMode = 'Format is required'
    }
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    const sessionConfig = {
      name: formatSessionName(form.sessionDate, form.sessionPeriod),
      sessionDate: form.sessionDate,
      sessionPeriod: form.sessionPeriod,
      startDateTime: form.startDateTime,
      matchDurationMinutes: Number(form.matchDurationMinutes),
      breakIntervalMinutes: Number(form.breakIntervalMinutes),
      courtCount: form.selectedCourts.length,
      courts: form.selectedCourts,
      gameMode: form.gameMode,
    }

    if (editingSessionId != null) {
      updateSessionConfig(editingSessionId, sessionConfig)
      selectSession(editingSessionId)
      setEditingSessionId(null)
    } else {
      setSession(sessionConfig)
    }

    navigate('/players')
  }

  const sessions = [...state.sessions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const editingSession = editingSessionId == null
    ? null
    : state.sessions.find(session => session.id === editingSessionId) ?? null
  const sessionName = formatSessionName(form.sessionDate, form.sessionPeriod)

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  function toggleCourt(court) {
    setForm(prev => {
      const isSelected = prev.selectedCourts.includes(court)
      const selectedCourts = isSelected
        ? prev.selectedCourts.filter(value => value !== court)
        : [...prev.selectedCourts, court].sort((a, b) => {
            const aNumber = Number(a.replace('Court ', ''))
            const bNumber = Number(b.replace('Court ', ''))
            return aNumber - bNumber
          })

      return { ...prev, selectedCourts }
    })
    if (errors.selectedCourts) setErrors(prev => ({ ...prev, selectedCourts: undefined }))
  }

  function selectAllCourts() {
    setForm(prev => ({ ...prev, selectedCourts: AVAILABLE_COURTS }))
    if (errors.selectedCourts) setErrors(prev => ({ ...prev, selectedCourts: undefined }))
  }

  function clearAllCourts() {
    setForm(prev => ({ ...prev, selectedCourts: [] }))
  }

  const selectedCourtLabels = form.selectedCourts.length > 0
    ? form.selectedCourts.join(', ')
    : 'Select courts'

  function openStartDateTimePicker() {
    const input = startDateTimeInputRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') {
      input.showPicker()
      return
    }
    input.focus()
    input.click()
  }

  useEffect(() => {
    if (!isCourtPickerOpen && !isSessionPickerOpen) return

    function handlePointerDown(event) {
      if (sessionPickerRef.current?.contains(event.target)) return
      if (courtPickerRef.current?.contains(event.target)) return

      if (isSessionPickerOpen) setIsSessionPickerOpen(false)
      if (!courtPickerRef.current?.contains(event.target)) {
        setIsCourtPickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [isCourtPickerOpen, isSessionPickerOpen])

  useEffect(() => {
    if (editingSessionId == null) return
    if (!editingSession) {
      setEditingSessionId(null)
      setForm(getDefaultFormState())
      return
    }

    setForm(createFormStateFromSession(editingSession.session))
    setErrors({})
  }, [editingSessionId, editingSession])

  function startEditingSession(sessionRecord) {
    setEditingSessionId(sessionRecord.id)
    selectSession(sessionRecord.id)
    setForm(createFormStateFromSession(sessionRecord.session))
    setErrors({})
  }

  function stopEditingSession() {
    setEditingSessionId(null)
    setForm(getDefaultFormState())
    setErrors({})
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,760px)_340px] xl:justify-center xl:gap-8">
        <section className="min-w-0 xl:max-w-[760px]">
          <div className="xl:sticky xl:top-8">
            <div className="mb-8 pb-6 border-b border-gray-200 animate-slide-up">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 flex items-center justify-center text-lg leading-none" aria-hidden="true">🎾</div>
                <span className={`text-xs font-black uppercase tracking-widest ${
                  editingSessionId != null ? 'text-green-700' : 'text-coral-500'
                }`}>
                  {editingSessionId != null ? 'Editing Session' : 'New Session'}
                </span>
              </div>
              <h1 className="text-3xl font-black text-green-900">
                {editingSessionId != null ? 'Update your session' : 'Set up your session'}
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {editingSessionId != null && (
                <div className="animate-slide-up rounded-2xl border border-green-200 bg-green-50 px-5 py-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700">Edit Mode</p>
                      <p className="mt-1 text-sm font-bold text-green-900">
                        You are editing {editingSession?.session?.name || 'this session'}.
                      </p>
                      <p className="mt-1 text-sm text-green-800">
                        Update the fields below, then click “Update Session” to save your changes.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={stopEditingSession}
                      className="rounded-full border border-green-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wide text-green-700 transition-colors hover:border-green-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 animate-slide-up relative z-10" style={{ animationDelay: '0.05s' }}>
                <div className={`col-span-2 sm:col-span-1 flex flex-col gap-2 ${isSessionPickerOpen ? 'relative z-40' : ''}`}>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Session Name</label>
                  <div ref={sessionPickerRef} className="relative">
                    <input
                      type="text"
                      value={sessionName}
                      readOnly
                      className="w-full px-4 pr-12 py-3 rounded-xl border text-sm border-gray-200 bg-white shadow-sm text-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => setIsSessionPickerOpen(open => !open)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-coral-600 transition-colors"
                      aria-label="Choose session date"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v4m8-4v4M3 10h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                      </svg>
                    </button>
                    {isSessionPickerOpen && (
                      <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
                        <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-4 items-start">
                          <div className="flex flex-col gap-2">
                            <input
                              type="date"
                              lang="en-AU"
                              value={form.sessionDate}
                              onChange={e => set('sessionDate', e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent transition-all bg-white shadow-sm text-gray-700"
                            />
                            {errors.sessionDate && <p className="text-xs text-red-500">{errors.sessionDate}</p>}
                          </div>
                          <div className="flex flex-col gap-2">
                            {SESSION_PERIODS.map(period => (
                              <button
                                key={period.value}
                                type="button"
                                onClick={() => set('sessionPeriod', period.value)}
                                className={`py-2.5 rounded-xl border text-sm font-bold transition-all ${
                                  form.sessionPeriod === period.value
                                    ? 'border-green-700 bg-green-50 text-green-800 shadow-sm'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                }`}
                              >
                                {period.label}
                              </button>
                            ))}
                            {errors.sessionPeriod && <p className="text-xs text-red-500">{errors.sessionPeriod}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Which courts are you using?</label>
                  <div ref={courtPickerRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCourtPickerOpen(open => !open)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm text-left text-sm text-gray-700 flex items-center justify-between gap-4 hover:border-gray-300 transition-all"
                    >
                      <span className="truncate">{selectedCourtLabels}</span>
                      <svg
                        className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${isCourtPickerOpen ? 'rotate-180' : ''}`}
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
                      </svg>
                    </button>

                    {isCourtPickerOpen && (
                      <div className="absolute left-0 top-full z-30 mt-2 w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <button
                            type="button"
                            onClick={selectAllCourts}
                            className="text-xs font-black text-coral-600 hover:text-coral-700 transition-colors"
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            onClick={clearAllCourts}
                            className="text-xs font-black text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            Clear all
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
                          {AVAILABLE_COURTS.map(court => {
                            const isSelected = form.selectedCourts.includes(court)
                            return (
                              <button
                                key={court}
                                type="button"
                                onClick={() => toggleCourt(court)}
                                className={`py-3 rounded-xl border text-sm font-black transition-all ${
                                  isSelected
                                    ? 'border-green-700 bg-green-50 text-green-800 shadow-sm'
                                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                }`}
                              >
                                {court.replace('Court ', '')}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  {errors.selectedCourts && <p className="text-xs text-red-500">{errors.selectedCourts}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '0.08s' }}>
                <div className="col-span-2 sm:col-span-1 flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Match Start Time</label>
                  <div className="relative">
                    <input
                      ref={startDateTimeInputRef}
                      type="datetime-local"
                      lang="en-AU"
                      value={form.startDateTime}
                      onChange={e => set('startDateTime', e.target.value)}
                      className="w-full px-4 pr-12 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent transition-all bg-white shadow-sm text-gray-700"
                    />
                    <button
                      type="button"
                      onClick={openStartDateTimePicker}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-coral-600 transition-colors"
                      aria-label="Choose match start time"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v4m8-4v4M3 10h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                      </svg>
                    </button>
                  </div>
                  {errors.startDateTime && <p className="text-xs text-red-500">{errors.startDateTime}</p>}
                </div>

                <div className="col-span-2 sm:col-span-1 flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Match Duration</label>
                  <div className="relative">
                    <select
                      value={form.matchDurationMinutes}
                      onChange={e => set('matchDurationMinutes', e.target.value)}
                      className="w-full appearance-none px-4 pr-12 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent transition-all bg-white shadow-sm text-gray-700"
                    >
                      {MATCH_DURATION_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <svg
                      className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
                    </svg>
                  </div>
                  {errors.matchDurationMinutes && <p className="text-xs text-red-500">{errors.matchDurationMinutes}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="col-span-2 sm:col-span-1 flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Break Interval</label>
                  <div className="relative">
                    <select
                      value={form.breakIntervalMinutes}
                      onChange={e => set('breakIntervalMinutes', e.target.value)}
                      className="w-full appearance-none px-4 pr-12 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent transition-all bg-white shadow-sm text-gray-700"
                    >
                      {BREAK_INTERVAL_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <svg
                      className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
                    </svg>
                  </div>
                  {errors.breakIntervalMinutes && <p className="text-xs text-red-500">{errors.breakIntervalMinutes}</p>}
                </div>

                <div className="col-span-2 sm:col-span-1 flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Format</label>
                  <div className="relative">
                    <select
                      value={form.gameMode}
                      onChange={e => set('gameMode', e.target.value)}
                      className="w-full appearance-none px-4 pr-12 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent transition-all bg-white shadow-sm text-gray-700"
                    >
                      {GAME_MODES.map(mode => (
                        <option key={mode.value} value={mode.value}>
                          {mode.label}
                        </option>
                      ))}
                    </select>
                    <svg
                      className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
                    </svg>
                  </div>
                  {errors.gameMode && <p className="text-xs text-red-500">{errors.gameMode}</p>}
                </div>
              </div>

              <button
                type="submit"
                style={{ backgroundColor: editingSessionId != null ? '#166534' : '#e8503a' }}
                className="w-full py-3.5 active:scale-[0.98] text-white font-black rounded-xl transition-all duration-200 text-sm shadow-sm hover:shadow-md hover:brightness-90"
              >
                {editingSessionId != null ? 'Update Session →' : 'New Session →'}
              </button>
            </form>
          </div>
        </section>

        <aside className="min-w-0 animate-slide-up" style={{ animationDelay: '0.12s' }}>
          <div className="xl:sticky xl:top-8 flex flex-col gap-5">
            <section className="rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm">
              <p className="text-xs font-black text-coral-500 uppercase tracking-widest">Generated Sessions</p>
              <h2 className="mt-2 text-2xl font-black text-green-900">Session management</h2>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm">
              <div className="flex items-end justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-black text-green-900 mt-1">Open an existing session</h3>
                </div>
                <span className="text-xs font-bold text-gray-400">
                  {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
                </span>
              </div>

              {sessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-6 text-sm text-gray-500">
                  No sessions yet. Create a new session and it will appear here.
                </div>
              ) : (
                <div className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto pr-1">
                  {sessions.map(sessionRecord => {
                    const isCurrent = sessionRecord.id === state.currentSessionId
                    const isEditingSession = sessionRecord.id === editingSessionId

                    return (
                      <button
                        key={sessionRecord.id}
                        type="button"
                        onClick={() => {
                          selectSession(sessionRecord.id)
                          navigate('/players')
                        }}
                        className={`relative w-full rounded-2xl border px-5 py-4 text-left transition-all ${
                          isEditingSession
                            ? 'border-coral-400 bg-orange-50 shadow-sm ring-2 ring-coral-200'
                            : isCurrent
                            ? 'border-green-700 bg-green-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4 pr-24">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`relative inline-flex h-3 w-3 flex-shrink-0 rounded-full ${
                                  isCurrent ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                                aria-hidden="true"
                              >
                                {isCurrent && (
                                  <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                                )}
                              </span>
                              <p className={`min-w-0 truncate whitespace-nowrap text-[12px] font-black tracking-[-0.015em] ${isCurrent ? 'text-green-900' : 'text-gray-800'}`}>
                                {sessionRecord.session?.name || 'Untitled Session'}
                              </p>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                              Created {formatDateTimeLabel(sessionRecord.createdAt)}
                            </p>
                          </div>

                          <div className="absolute right-5 top-4 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                startEditingSession(sessionRecord)
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600"
                              aria-label={`Edit ${sessionRecord.session?.name || 'session'}`}
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h4l10.5-10.5a2.12 2.12 0 10-3-3L5.5 17v3z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6.5l4 4" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                if (window.confirm('Delete this session from history?')) {
                                  deleteSession(sessionRecord.id)
                                }
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                              aria-label={`Delete ${sessionRecord.session?.name || 'session'}`}
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7l.8 11.2A2 2 0 009.79 20h4.42a2 2 0 001.99-1.8L17 7" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v5M14 11v5" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-2 text-xs font-bold text-gray-500">
                            <span className="rounded-full bg-gray-100 px-2.5 py-1">
                              {sessionRecord.playersCount} players
                            </span>
                            <span className="rounded-full bg-gray-100 px-2.5 py-1">
                              {sessionRecord.roundsCount} rounds
                            </span>
                          </div>

                          {(isEditingSession || isCurrent) && (
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide whitespace-nowrap ${
                                isEditingSession
                                  ? 'bg-coral-500 text-white'
                                  : 'bg-green-700 text-white'
                              }`}
                            >
                              {isEditingSession ? 'Editing' : 'Active'}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        </aside>
      </div>
    </div>
  )
}
