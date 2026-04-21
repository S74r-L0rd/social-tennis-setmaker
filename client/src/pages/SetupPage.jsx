import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'

const GAME_MODES = [
  { value: 'same_gender', label: 'Same Gender Doubles', desc: "Men's or women's pairs only" },
  { value: 'mixed',       label: 'Mixed Doubles',       desc: 'One man and one woman per team' },
  { value: 'flexible',    label: 'Flexible',            desc: 'Any gender combination' },
]

export default function SetupPage() {
  const { setSession } = useSession()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', courtCount: '', gameMode: 'flexible' })
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Session name is required'
    const n = Number(form.courtCount)
    if (!form.courtCount || isNaN(n) || n < 1 || !Number.isInteger(n))
      e.courtCount = 'Enter a valid number (min 1)'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSession({ name: form.name.trim(), courtCount: Number(form.courtCount), gameMode: form.gameMode })
    navigate('/players')
  }

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Hero header */}
      <div className="mb-8 pb-6 border-b border-gray-200 animate-slide-up">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 bg-coral-500 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white text-xs font-black">S</span>
          </div>
          <span className="text-xs font-black text-coral-500 uppercase tracking-widest">New Session</span>
        </div>
        <h1 className="text-3xl font-black text-green-900">Set up your session</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Name + Courts row */}
        <div className="grid grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="col-span-2 sm:col-span-1 flex flex-col gap-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Session Name</label>
            <input
              type="text" placeholder="e.g. Saturday Morning"
              value={form.name} onChange={e => set('name', e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent transition-all ${errors.name ? 'border-red-400' : 'border-gray-200'} bg-white shadow-sm`}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>
          <div className="col-span-2 sm:col-span-1 flex flex-col gap-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Number of Courts</label>
            <input
              type="number" min={1} placeholder="e.g. 2"
              value={form.courtCount} onChange={e => set('courtCount', e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent transition-all ${errors.courtCount ? 'border-red-400' : 'border-gray-200'} bg-white shadow-sm`}
            />
            {errors.courtCount && <p className="text-xs text-red-500">{errors.courtCount}</p>}
          </div>
        </div>

        {/* Format */}
        <div className="flex flex-col gap-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Format</label>
          <div className="flex flex-col gap-2.5">
            {GAME_MODES.map(mode => (
              <label key={mode.value}
                onClick={() => set('gameMode', mode.value)}
                className={`flex items-center gap-4 px-5 py-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                  form.gameMode === mode.value
                    ? 'border-green-700 bg-green-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}>
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  form.gameMode === mode.value ? 'border-green-700' : 'border-gray-300'
                }`}>
                  {form.gameMode === mode.value && <div className="w-2.5 h-2.5 rounded-full bg-green-700" />}
                </div>
                <input type="radio" name="gameMode" value={mode.value}
                  checked={form.gameMode === mode.value}
                  onChange={() => {}} className="sr-only" />
                <div className="flex-1 flex items-center justify-between gap-3">
                  <span className={`text-sm font-bold ${form.gameMode === mode.value ? 'text-green-800' : 'text-gray-700'}`}>
                    {mode.label}
                  </span>
                  <span className="text-xs text-gray-400">{mode.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button type="submit"
          style={{ backgroundColor: '#e8503a' }}
          className="w-full py-3.5 active:scale-[0.98] text-white font-black rounded-xl transition-all duration-200 text-sm shadow-sm hover:shadow-md hover:brightness-90">
          Start Session →
        </button>
      </form>
    </div>
  )
}
