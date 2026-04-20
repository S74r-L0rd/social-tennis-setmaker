import { useState } from 'react'

const EMPTY = { name: '', gender: 'male', rating: 2, plannedRounds: 0 }

export default function PlayerForm({ onSubmit, initialValues = null, onCancel }) {
  const [form, setForm] = useState(initialValues ?? EMPTY)
  const [errors, setErrors] = useState({})
  const isEdit = Boolean(initialValues)

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSubmit({ ...form, name: form.name.trim(), rating: Number(form.rating), plannedRounds: Number(form.plannedRounds) })
    if (!isEdit) setForm(EMPTY)
    setErrors({})
  }

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Name */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Name</label>
        <input
          type="text" placeholder="Player name"
          value={form.name} onChange={e => set('name', e.target.value)}
          className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent transition-all ${errors.name ? 'border-red-400' : 'border-gray-200'} bg-white shadow-sm`}
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
      </div>

      {/* Gender */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Gender</label>
        <div className="flex gap-2.5">
          {[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }].map(opt => (
            <label key={opt.value} onClick={() => set('gender', opt.value)} className={`flex-1 flex items-center justify-center py-3 rounded-xl border cursor-pointer text-sm font-bold transition-all duration-200 ${
              form.gender === opt.value
                ? 'border-green-700 bg-green-50 text-green-800 shadow-sm'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
            }`}>
              <input type="radio" name="gender" value={opt.value} checked={form.gender === opt.value}
                onChange={() => {}} className="sr-only" />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Skill Level */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Skill Level</label>
        <div className="flex gap-2.5">
          {[
            { value: 1, label: 'Lv.1', sub: 'Beginner' },
            { value: 2, label: 'Lv.2', sub: 'Intermediate' },
            { value: 3, label: 'Lv.3', sub: 'Advanced' },
          ].map(opt => (
            <label key={opt.value} onClick={() => set('rating', opt.value)} className={`flex-1 flex flex-col items-center py-3 rounded-xl border cursor-pointer transition-all duration-200 ${
              Number(form.rating) === opt.value
                ? 'border-green-700 bg-green-50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}>
              <input type="radio" name="rating" value={opt.value}
                checked={Number(form.rating) === opt.value}
                onChange={() => {}} className="sr-only" />
              <span className={`text-sm font-black ${Number(form.rating) === opt.value ? 'text-green-800' : 'text-gray-600'}`}>{opt.label}</span>
              <span className="text-xs text-gray-400 mt-0.5">{opt.sub}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Planned rounds */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-black text-gray-500 uppercase tracking-wide">
          Rounds to Play <span className="normal-case font-normal">(0 = all)</span>
        </label>
        <input
          type="number" min={0}
          value={form.plannedRounds} onChange={e => set('plannedRounds', e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-coral-400 focus:border-transparent transition-all bg-white shadow-sm"
        />
      </div>

      <div className="flex gap-3 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all duration-200 active:scale-[0.98]">
            Cancel
          </button>
        )}
        <button type="submit"
          style={{ backgroundColor: '#e8503a' }}
          className={`py-3 rounded-xl text-white text-sm font-black transition-all duration-200 shadow-sm hover:shadow-md hover:brightness-90 active:scale-[0.98] ${onCancel ? 'flex-1' : 'w-full'}`}>
          {isEdit ? 'Save Changes' : '+ Add Player'}
        </button>
      </div>
    </form>
  )
}
