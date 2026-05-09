import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const MOCK_PROFILE = {
  name: 'Club Organizer',
  clubName: 'UWA Social Tennis',
  clubCountry: 'Australia',
  clubSuburb: 'Nedlands',
  email: 'organiser@setmaker.com',
}

const MOCK_SESSIONS = [
  { id: 1, name: 'Wednesday Night Social', date: '07 May 2026', status: 'Completed', summary: '24 players across 6 courts with mixed doubles rotation.' },
  { id: 2, name: 'Saturday Morning Hit', date: '03 May 2026', status: 'Completed', summary: '16 players with shorter rounds and quick broadcast updates.' },
  { id: 3, name: 'Club Welcome Mixer', date: '28 Apr 2026', status: 'Draft', summary: 'Intro session draft prepared for new members and casual pairings.' },
]

function buildInitialProfile(user) {
  return {
    ...MOCK_PROFILE,
    name: user?.name || MOCK_PROFILE.name,
    email: user?.email || MOCK_PROFILE.email,
    password: '',
  }
}

function InfoItem({ label, value }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-500">{label}</span>
      <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold text-green-950 break-words">
        {value}
      </div>
    </div>
  )
}

function PasswordInfoItem({ label, value }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-500">{label}</span>
      <div className="relative flex items-center rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
        <span className="flex-1 text-sm font-bold text-green-950">
          {visible && value ? value : '••••••••'}
        </span>
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="ml-2 shrink-0 text-stone-400 hover:text-stone-600"
        >
          {visible ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

function InputField({ label, value, onChange, type = 'text' }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-green-950 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-coral-400"
      />
    </label>
  )
}

function PasswordInputField({ label, value, onChange }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-500">{label}</span>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 pr-10 text-sm text-green-950 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-coral-400"
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
        >
          {visible ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const [profile, setProfile] = useState(() => buildInitialProfile(user))
  const [draft, setDraft] = useState(() => buildInitialProfile(user))
  const [isEditing, setIsEditing] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  function updateDraft(field, value) {
    setDraft(prev => ({ ...prev, [field]: value }))
  }

  function handleStartEdit() {
    setDraft(profile)
    setIsEditing(true)
  }

  function handleCancelEdit() {
    setDraft(profile)
    setIsEditing(false)
  }

  function handleSave(e) {
    e.preventDefault()
    setProfile(draft)
    updateUser({ ...user, name: draft.name })
    setIsEditing(false)
  }

  const initials = profile.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'ST'

  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-8 animate-fade-in">
      <section className="grid gap-6 md:grid-cols-2 md:items-start">
        <div className="rounded-[28px] border border-stone-200 bg-white shadow-sm overflow-hidden animate-slide-up lg:sticky lg:top-6">
          <div className="px-8 pt-10 pb-8 sm:px-10 sm:pt-12 sm:pb-10">
            <div className="flex min-w-0 flex-col items-start gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 w-full items-center gap-5 sm:gap-6 md:w-auto">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-green-900 text-2xl font-black text-white shadow-sm">
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-black text-green-950 sm:text-3xl">{profile.name}</h1>
                  <p className="mt-1 text-sm text-stone-500 break-all sm:break-normal">{profile.email}</p>
                </div>
              </div>

              {isEditing ? (
                <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:shrink-0 md:justify-end">
                  <button
                    type="submit"
                    form="profile-form"
                    className="rounded-lg bg-coral-500 px-3 py-2 text-xs font-black text-white shadow-sm transition-all duration-200 hover:bg-coral-600"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-black text-green-900 shadow-sm transition-all duration-200 hover:bg-stone-100"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-black text-green-900 shadow-sm transition-all duration-200 hover:bg-stone-100 md:shrink-0"
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          <div className="px-8 pb-6 sm:px-10 sm:pb-8">
            <div>
              <h2 className="text-xl font-black text-green-950">Basic Information</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">
                Core account details from the organiser registration profile.
              </p>
            </div>

            {isEditing ? (
              <form id="profile-form" onSubmit={handleSave} className="mt-12 grid gap-5 sm:grid-cols-2">
                <InputField
                  label="Your Name"
                  value={draft.name}
                  onChange={e => updateDraft('name', e.target.value)}
                />
                <InputField
                  label="Club Name"
                  value={draft.clubName}
                  onChange={e => updateDraft('clubName', e.target.value)}
                />
                <InputField
                  label="Club Country"
                  value={draft.clubCountry}
                  onChange={e => updateDraft('clubCountry', e.target.value)}
                />
                <InputField
                  label="Club Suburb"
                  value={draft.clubSuburb}
                  onChange={e => updateDraft('clubSuburb', e.target.value)}
                />
                <InputField
                  label="Email"
                  type="email"
                  value={draft.email}
                  onChange={e => updateDraft('email', e.target.value)}
                />
                <PasswordInputField
                  label="Password"
                  value={draft.password}
                  onChange={e => updateDraft('password', e.target.value)}
                />
              </form>
            ) : (
              <div className="mt-12 grid gap-5 sm:grid-cols-2">
                <InfoItem label="Your Name" value={profile.name} />
                <InfoItem label="Club Name" value={profile.clubName} />
                <InfoItem label="Club Country" value={profile.clubCountry} />
                <InfoItem label="Club Suburb" value={profile.clubSuburb} />
                <InfoItem label="Email" value={profile.email} />
                <PasswordInfoItem label="Password" value={profile.password} />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 animate-scale-in">
          <aside className="rounded-[28px] border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-500">Action</p>
                <h2 className="mt-2 text-lg font-black text-green-950">Start setup your session</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                  Create a new session and continue into the setup flow.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/setup')}
                className="shrink-0 self-start rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-black text-green-900 shadow-sm transition-all duration-200 hover:bg-stone-100"
              >
                Start Setup
              </button>
            </div>
          </aside>

          <aside className="rounded-[28px] border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-500">Action</p>
                <h2 className="mt-2 text-lg font-black text-green-950">Manage players</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                  View and manage the players in your club.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/players')}
                className="shrink-0 self-start rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-black text-green-900 shadow-sm transition-all duration-200 hover:bg-stone-100"
              >
                Manage Players
              </button>
            </div>
          </aside>

          <aside className="rounded-[28px] border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-start justify-between gap-3 sm:items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-500">Action</p>
                <h2 className="mt-2 text-lg font-black text-green-950">See session history</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(open => !open)}
                className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-black text-green-900 shadow-sm transition-all duration-200 hover:bg-stone-100"
              >
                {isHistoryOpen ? 'Hide' : 'Show History'}
              </button>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-stone-500">
              Expand to review previously created session summaries.
            </p>

            {isHistoryOpen && (
              <div className="mt-5 flex flex-col gap-4">
                {MOCK_SESSIONS.map(session => (
                  <div
                    key={session.id}
                    className="rounded-xl border border-stone-200 bg-white px-5 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-green-950">{session.name}</p>
                        <p className="mt-1 text-xs text-stone-500">{session.date}</p>
                      </div>
                      <div className="sm:shrink-0">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
                          session.status === 'Completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-stone-600">
                      {session.summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  )
}
