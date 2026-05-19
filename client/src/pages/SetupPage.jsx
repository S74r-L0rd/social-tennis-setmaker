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
const SESSION_TIME_RANGES = {
  morning: { start: 4 * 60, end: 11 * 60 + 45, fallback: '09:00' },
  afternoon: { start: 12 * 60, end: 16 * 60 + 45, fallback: '13:00' },
  evening: { start: 17 * 60, end: 23 * 60 + 45, fallback: '18:00' },
}

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

function getTimeValueFromDateTime(value) {
  if (typeof value !== 'string') return '09:00'
  const match = value.match(/T(\d{2}:\d{2})/)
  return match?.[1] ?? '09:00'
}

function getMinutesFromTimeValue(value) {
  const match = typeof value === 'string' ? value.match(/^(\d{2}):(\d{2})$/) : null
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function getTimeValueFromMinutes(minutes) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0')
  const mins = String(minutes % 60).padStart(2, '0')
  return `${hours}:${mins}`
}

function formatTimeOptionLabel(value) {
  const [hours, minutes] = value.split(':').map(Number)
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getTimeOptionsForPeriod(periodValue) {
  const range = SESSION_TIME_RANGES[periodValue] ?? SESSION_TIME_RANGES.morning
  const options = []
  for (let minutes = range.start; minutes <= range.end; minutes += 15) {
    const value = getTimeValueFromMinutes(minutes)
    options.push({ value, label: formatTimeOptionLabel(value) })
  }
  return options
}

function isTimeInSessionPeriod(timeValue, periodValue) {
  const minutes = getMinutesFromTimeValue(timeValue)
  const range = SESSION_TIME_RANGES[periodValue]
  return minutes != null && range && minutes >= range.start && minutes <= range.end
}

function getDefaultTimeForPeriod(periodValue) {
  return SESSION_TIME_RANGES[periodValue]?.fallback ?? SESSION_TIME_RANGES.morning.fallback
}

function normaliseTimeForPeriod(timeValue, periodValue) {
  return isTimeInSessionPeriod(timeValue, periodValue)
    ? timeValue
    : getDefaultTimeForPeriod(periodValue)
}

function combineDateAndTime(dateValue, timeValue) {
  const date = dateValue || getTodayDateValue()
  const time = timeValue || '09:00'
  return `${date}T${time}`
}

function getDefaultFormState() {
  return {
    sessionDate: getTodayDateValue(),
    sessionPeriod: 'morning',
    startDateTime: combineDateAndTime(getTodayDateValue(), getDefaultTimeForPeriod('morning')),
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
  const sessionDate = getSessionDateFromRecord(sessionConfig)
  const sessionPeriod = getSessionPeriodFromRecord(sessionConfig)
  const startTime = normaliseTimeForPeriod(
    getTimeValueFromDateTime(sessionConfig?.startDateTime ?? getDefaultStartDateTimeValue()),
    sessionPeriod
  )
  return {
    sessionDate,
    sessionPeriod,
    startDateTime: combineDateAndTime(sessionDate, startTime),
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
  const { state, setSession, selectSession, updateSessionConfig, deleteSession, clearError } = useSession()
  const navigate = useNavigate()
  const sessionPickerRef = useRef(null)
  const courtPickerRef = useRef(null)
  const [form, setForm] = useState(getDefaultFormState)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSessionPickerOpen, setIsSessionPickerOpen] = useState(false)
  const [isCourtPickerOpen, setIsCourtPickerOpen] = useState(false)
  const [openSetupDropdown, setOpenSetupDropdown] = useState(null)
  const [editingSessionId, setEditingSessionId] = useState(null)
  const [sessionDeleteDialog, setSessionDeleteDialog] = useState(null)
  const todayDateValue = getTodayDateValue()

  function validate() {
    const e = {}
    if (!form.sessionDate) e.sessionDate = 'Session date is required'
    else if (form.sessionDate < todayDateValue) e.sessionDate = 'Session date cannot be in the past'
    if (!SESSION_PERIODS.some(period => period.value === form.sessionPeriod)) {
      e.sessionPeriod = 'Session period is required'
    }
    if (!isValidDateTimeValue(form.startDateTime)) {
      e.startDateTime = 'Match start time is required'
    } else if (!isTimeInSessionPeriod(getTimeValueFromDateTime(form.startDateTime), form.sessionPeriod)) {
      e.startDateTime = 'Match start time must match the selected session period'
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

  async function handleSubmit(e) {
    e.preventDefault()
    clearError()
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

    setIsSubmitting(true)
    try {
      if (editingSessionId != null) {
        await updateSessionConfig(editingSessionId, sessionConfig)
        selectSession(editingSessionId)
        setEditingSessionId(null)
      } else {
        await setSession(sessionConfig)
      }
      navigate('/players')
    } catch {
      // error is displayed via state.error below
    } finally {
      setIsSubmitting(false)
    }
  }

  const sessions = [...state.sessions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const editingSession = editingSessionId == null
    ? null
    : state.sessions.find(session => session.id === editingSessionId) ?? null
  const sessionName = formatSessionName(form.sessionDate, form.sessionPeriod)
  const startTimeOptions = getTimeOptionsForPeriod(form.sessionPeriod)

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  function setSessionDate(value) {
    setForm(prev => ({
      ...prev,
      sessionDate: value,
      startDateTime: combineDateAndTime(value, getTimeValueFromDateTime(prev.startDateTime)),
    }))
    if (errors.sessionDate) setErrors(prev => ({ ...prev, sessionDate: undefined }))
  }

  function setSessionPeriod(value) {
    setForm(prev => ({
      ...prev,
      sessionPeriod: value,
      startDateTime: combineDateAndTime(
        prev.sessionDate,
        normaliseTimeForPeriod(getTimeValueFromDateTime(prev.startDateTime), value)
      ),
    }))
    if (errors.sessionPeriod) setErrors(prev => ({ ...prev, sessionPeriod: undefined }))
    if (errors.startDateTime) setErrors(prev => ({ ...prev, startDateTime: undefined }))
  }

  function setStartTime(value) {
    setForm(prev => ({
      ...prev,
      startDateTime: combineDateAndTime(prev.sessionDate, value),
    }))
    if (errors.startDateTime) setErrors(prev => ({ ...prev, startDateTime: undefined }))
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

  async function confirmDeleteSession() {
    if (!sessionDeleteDialog) return
    await deleteSession(sessionDeleteDialog.id)
    setSessionDeleteDialog(null)
  }

  const selectedCourtLabels = form.selectedCourts.length > 0
    ? form.selectedCourts.join(', ')
    : 'Select courts'

  function toggleSessionPicker() {
    setIsSessionPickerOpen(open => !open)
    setIsCourtPickerOpen(false)
    setOpenSetupDropdown(null)
  }

  function toggleCourtPicker() {
    setIsCourtPickerOpen(open => !open)
    setIsSessionPickerOpen(false)
    setOpenSetupDropdown(null)
  }

  function toggleSetupDropdown(id) {
    setOpenSetupDropdown(current => current === id ? null : id)
    setIsSessionPickerOpen(false)
    setIsCourtPickerOpen(false)
  }

  function renderSetupDropdown({ id, value, options, onChange }) {
    const selectedOption = options.find(option => String(option.value) === String(value))
    const isOpen = openSetupDropdown === id

    return (
      <div data-setup-dropdown className={`relative ${isOpen ? 'z-50' : 'z-0'}`}>
        <button
          type="button"
          onClick={() => toggleSetupDropdown(id)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 shadow-sm transition-all hover:border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-coral-400 flex items-center justify-between gap-4"
        >
          <span className="truncate">{selectedOption?.label ?? 'Select an option'}</span>
          <svg
            className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
            <div className="max-h-72 overflow-y-auto pr-1">
              {options.map(option => {
                const selected = String(option.value) === String(value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value)
                      setOpenSetupDropdown(null)
                    }}
                    className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-all ${
                      selected
                        ? 'bg-green-50 text-green-800'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  useEffect(() => {
    if (!isCourtPickerOpen && !isSessionPickerOpen && !openSetupDropdown) return

    function handlePointerDown(event) {
      if (sessionPickerRef.current?.contains(event.target)) return
      if (courtPickerRef.current?.contains(event.target)) return
      if (event.target.closest?.('[data-setup-dropdown]')) return

      if (isSessionPickerOpen) setIsSessionPickerOpen(false)
      if (!courtPickerRef.current?.contains(event.target)) {
        setIsCourtPickerOpen(false)
      }
      if (openSetupDropdown) setOpenSetupDropdown(null)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [isCourtPickerOpen, isSessionPickerOpen, openSetupDropdown])

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
                      onClick={toggleSessionPicker}
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
                              min={todayDateValue}
                              value={form.sessionDate}
                              onChange={e => setSessionDate(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent transition-all bg-white shadow-sm text-gray-700"
                            />
                            {errors.sessionDate && <p className="text-xs text-red-500">{errors.sessionDate}</p>}
                          </div>
                          <div className="flex flex-col gap-2">
                            {SESSION_PERIODS.map(period => (
                              <button
                                key={period.value}
                                type="button"
                                onClick={() => setSessionPeriod(period.value)}
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
                      onClick={toggleCourtPicker}
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

              <div
                className={`grid grid-cols-2 gap-4 animate-slide-up relative ${
                  ['start-time', 'match-duration'].includes(openSetupDropdown) ? 'z-40' : 'z-20'
                }`}
                style={{ animationDelay: '0.08s' }}
              >
                <div className="col-span-2 sm:col-span-1 flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Match Start Time</label>
                  {renderSetupDropdown({
                    id: 'start-time',
                    value: getTimeValueFromDateTime(form.startDateTime),
                    options: startTimeOptions,
                    onChange: setStartTime,
                  })}
                  {errors.startDateTime && <p className="text-xs text-red-500">{errors.startDateTime}</p>}
                </div>

                <div className="col-span-2 sm:col-span-1 flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Match Duration</label>
                  {renderSetupDropdown({
                    id: 'match-duration',
                    value: form.matchDurationMinutes,
                    options: MATCH_DURATION_OPTIONS,
                    onChange: value => set('matchDurationMinutes', value),
                  })}
                  {errors.matchDurationMinutes && <p className="text-xs text-red-500">{errors.matchDurationMinutes}</p>}
                </div>
              </div>

              <div
                className={`grid grid-cols-2 gap-4 animate-slide-up relative ${
                  ['break-interval', 'format'].includes(openSetupDropdown) ? 'z-40' : 'z-10'
                }`}
                style={{ animationDelay: '0.1s' }}
              >
                <div className="col-span-2 sm:col-span-1 flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Break Interval</label>
                  {renderSetupDropdown({
                    id: 'break-interval',
                    value: form.breakIntervalMinutes,
                    options: BREAK_INTERVAL_OPTIONS,
                    onChange: value => set('breakIntervalMinutes', value),
                  })}
                  {errors.breakIntervalMinutes && <p className="text-xs text-red-500">{errors.breakIntervalMinutes}</p>}
                </div>

                <div className="col-span-2 sm:col-span-1 flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Format</label>
                  {renderSetupDropdown({
                    id: 'format',
                    value: form.gameMode,
                    options: GAME_MODES,
                    onChange: value => set('gameMode', value),
                  })}
                  {errors.gameMode && <p className="text-xs text-red-500">{errors.gameMode}</p>}
                </div>
              </div>

              {state.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {state.error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{ backgroundColor: editingSessionId != null ? '#166534' : '#e8503a' }}
                className="w-full py-3.5 active:scale-[0.98] text-white font-black rounded-xl transition-all duration-200 text-sm shadow-sm hover:shadow-md hover:brightness-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? (editingSessionId != null ? 'Saving…' : 'Creating…')
                  : (editingSessionId != null ? 'Update Session →' : 'New Session →')
                }
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
                                setSessionDeleteDialog(sessionRecord)
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
      {sessionDeleteDialog && (
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
                  <h2 className="text-lg font-black text-green-900 sm:text-xl">Delete session?</h2>
                  <p className="mt-1 text-sm font-bold text-red-500">
                    {sessionDeleteDialog.session?.name || 'Untitled Session'}
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-y-auto px-5 py-5 sm:px-6">
              <p className="text-sm leading-relaxed text-gray-600">
                This will permanently delete the session from the database, including its courts, players in the session, generated rounds, matches, and sit-out records. This cannot be undone.
              </p>
            </div>
            <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:px-6">
              <button
                type="button"
                onClick={() => setSessionDeleteDialog(null)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSession}
                className="w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-black text-white transition-all hover:bg-red-600"
              >
                Delete Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
