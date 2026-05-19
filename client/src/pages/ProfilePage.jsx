import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'

function InfoItem({ label, value }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-500">{label}</span>
      <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold text-green-950 break-words">
        {value || <span className="text-stone-400 font-normal">Not set</span>}
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

function InlineHistoryLoader() {
  return (
    <div className="rounded-2xl border border-green-100 bg-green-50/70 px-5 py-6 text-center animate-fade-in">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
        <div className="setmaker-loader scale-75" aria-hidden="true">
          <span className="setmaker-loader__ball" />
          <span className="setmaker-loader__shadow" />
        </div>
      </div>
      <p className="mt-4 text-sm font-black text-green-900">Loading session history</p>
      <p className="mt-1 text-xs leading-relaxed text-stone-500">Fetching your saved sessions from the server.</p>
      <div className="mt-4 flex items-center justify-center gap-2" aria-label="Loading">
        <span className="h-2 w-2 rounded-full bg-coral-500 setmaker-loader__dot" />
        <span className="h-2 w-2 rounded-full bg-green-700 setmaker-loader__dot setmaker-loader__dot--delay-1" />
        <span className="h-2 w-2 rounded-full bg-amber-400 setmaker-loader__dot setmaker-loader__dot--delay-2" />
      </div>
    </div>
  )
}

function PasswordInputField({ label, value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-500">{label}</span>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 pr-10 text-sm text-green-950 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-coral-400"
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
        >
          {visible ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
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

function buildDraft(user) {
  return {
    name:        user?.name        || '',
    email:       user?.email       || '',
    clubName:    user?.clubName    || '',
    clubCountry: user?.clubCountry || '',
    clubSuburb:  user?.clubSuburb  || '',
  }
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, token, updateProfile, changePassword } = useAuth()

  const [draft, setDraft]         = useState(() => buildDraft(user))
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [profileError, setProfileError] = useState(null)

  const [pwForm, setPwForm]       = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving]   = useState(false)
  const [pwError, setPwError]     = useState(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  const [sessions, setSessions]   = useState([])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(false)

  useEffect(() => {
    setDraft(buildDraft(user))
  }, [user])

  function updateDraft(field, value) {
    setDraft(prev => ({ ...prev, [field]: value }))
  }

  function handleStartEdit() {
    setDraft(buildDraft(user))
    setProfileError(null)
    setIsEditing(true)
  }

  function handleCancelEdit() {
    setDraft(buildDraft(user))
    setProfileError(null)
    setIsEditing(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setProfileError(null)
    try {
      await updateProfile({
        name:        draft.name,
        email:       draft.email,
        clubName:    draft.clubName,
        clubCountry: draft.clubCountry,
        clubSuburb:  draft.clubSuburb,
      })
      setIsEditing(false)
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)
    if (pwForm.next !== pwForm.confirm) {
      setPwError('New passwords do not match.')
      return
    }
    if (pwForm.next.length < 6) {
      setPwError('New password must be at least 6 characters.')
      return
    }
    setPwSaving(true)
    try {
      await changePassword(pwForm.current, pwForm.next)
      setPwForm({ current: '', next: '', confirm: '' })
      setPwSuccess(true)
    } catch (err) {
      setPwError(err.message)
    } finally {
      setPwSaving(false)
    }
  }

  async function handleToggleHistory() {
    const nextIsOpen = !isHistoryOpen
    setIsHistoryOpen(nextIsOpen)

    if (nextIsOpen && sessions.length === 0) {
      setSessionsLoading(true)
      try {
        const data = await api.getSessions(token)
        setSessions(Array.isArray(data) ? data : [])
      } catch {
        setSessions([])
      } finally {
        setSessionsLoading(false)
      }
    }
  }

  const initials = (user?.name || 'ST')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('')

  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-8 animate-fade-in">
      <section className="grid gap-6 md:grid-cols-2 md:items-start">

        {/* Left column: profile card + password card */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-6">

          {/* Profile card */}
          <div className="rounded-[28px] border border-stone-200 bg-white shadow-sm overflow-hidden animate-slide-up">
            <div className="px-8 pt-10 pb-8 sm:px-10 sm:pt-12 sm:pb-10">
              <div className="flex flex-col gap-5 sm:gap-6">
                <div className="flex min-w-0 w-full items-center gap-5 sm:gap-6">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-green-900 text-2xl font-black text-white shadow-sm">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-black text-green-950 sm:text-3xl">{user?.name}</h1>
                    <p className="mt-1 text-sm text-stone-500 break-all sm:break-normal">{user?.email}</p>
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-start">
                    <button type="submit" form="profile-form" disabled={saving}
                      className="w-full rounded-lg bg-coral-500 px-3 py-2 text-xs font-black text-white shadow-sm transition-all duration-200 hover:bg-coral-600 disabled:opacity-50 sm:w-auto">
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" onClick={handleCancelEdit} disabled={saving}
                      className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-black text-green-900 shadow-sm transition-all duration-200 hover:bg-stone-100 sm:w-auto">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={handleStartEdit}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-black text-green-900 shadow-sm transition-all duration-200 hover:bg-stone-100 sm:w-auto">
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            <div className="px-8 pb-6 sm:px-10 sm:pb-8">
              <div>
                <h2 className="text-xl font-black text-green-950">Basic Information</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                  Your account and club details.
                </p>
              </div>

              {profileError && (
                <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {profileError}
                </div>
              )}

              {isEditing ? (
                <form id="profile-form" onSubmit={handleSave} className="mt-6 grid gap-5 sm:grid-cols-2">
                  <InputField label="Your Name"    value={draft.name}        onChange={e => updateDraft('name', e.target.value)} />
                  <InputField label="Email"        type="email" value={draft.email} onChange={e => updateDraft('email', e.target.value)} />
                  <InputField label="Club Name"    value={draft.clubName}    onChange={e => updateDraft('clubName', e.target.value)} />
                  <InputField label="Club Country" value={draft.clubCountry} onChange={e => updateDraft('clubCountry', e.target.value)} />
                  <InputField label="Club Suburb"  value={draft.clubSuburb}  onChange={e => updateDraft('clubSuburb', e.target.value)} />
                </form>
              ) : (
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <InfoItem label="Your Name"    value={user?.name} />
                  <InfoItem label="Email"        value={user?.email} />
                  <InfoItem label="Club Name"    value={user?.clubName} />
                  <InfoItem label="Club Country" value={user?.clubCountry} />
                  <InfoItem label="Club Suburb"  value={user?.clubSuburb} />
                </div>
              )}
            </div>
          </div>

          {/* Password card */}
          <div className="rounded-[28px] border border-stone-200 bg-white shadow-sm overflow-hidden animate-slide-up">
            <div className="px-8 pt-8 pb-8 sm:px-10">
              <h2 className="text-xl font-black text-green-950">Change Password</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">
                Enter your current password to set a new one.
              </p>

              {pwError && (
                <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {pwError}
                </div>
              )}
              {pwSuccess && (
                <div className="mt-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-bold">
                  Password updated successfully.
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="mt-6 flex flex-col gap-4">
                <PasswordInputField label="Current Password" value={pwForm.current}
                  onChange={e => { setPwForm(p => ({ ...p, current: e.target.value })); setPwError(null); setPwSuccess(false) }} />
                <PasswordInputField label="New Password" value={pwForm.next}
                  placeholder="Min. 6 characters"
                  onChange={e => { setPwForm(p => ({ ...p, next: e.target.value })); setPwError(null); setPwSuccess(false) }} />
                <PasswordInputField label="Confirm New Password" value={pwForm.confirm}
                  onChange={e => { setPwForm(p => ({ ...p, confirm: e.target.value })); setPwError(null); setPwSuccess(false) }} />
                <button type="submit" disabled={pwSaving}
                  className="w-full rounded-xl bg-coral-500 py-3 text-sm font-black text-white shadow-sm transition-all duration-200 hover:bg-coral-600 disabled:opacity-50 sm:w-auto sm:px-6">
                  {pwSaving ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right column: action cards + session history */}
        <div className="flex flex-col gap-4 animate-scale-in">
          <aside className="rounded-[28px] border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-500">Action</p>
                <h2 className="mt-2 text-lg font-black text-green-950">Start setup your session</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">Create a new session and continue into the setup flow.</p>
              </div>
              <button type="button" onClick={() => navigate('/setup')}
                className="shrink-0 self-start rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-black text-green-900 shadow-sm transition-all duration-200 hover:bg-stone-100">
                Start Setup
              </button>
            </div>
          </aside>

          <aside className="rounded-[28px] border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-500">Action</p>
                <h2 className="mt-2 text-lg font-black text-green-950">Manage players</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">View and manage the players in your club.</p>
              </div>
              <button type="button" onClick={() => navigate('/manage-players')}
                className="shrink-0 self-start rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-black text-green-900 shadow-sm transition-all duration-200 hover:bg-stone-100">
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
              <button type="button" onClick={handleToggleHistory}
                className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-black text-green-900 shadow-sm transition-all duration-200 hover:bg-stone-100">
                {isHistoryOpen ? 'Hide' : 'Show History'}
              </button>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-stone-500">
              Expand to review previously created session summaries.
            </p>

            {isHistoryOpen && (
              <div className="mt-5 flex flex-col gap-4">
                {sessionsLoading ? (
                  <InlineHistoryLoader />
                ) : sessions.length === 0 ? (
                  <p className="text-sm text-stone-400">No sessions found.</p>
                ) : (
                  sessions.map(session => (
                    <div key={session.id} className="rounded-xl border border-stone-200 bg-white px-5 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-green-950">{session.name}</p>
                          <p className="mt-1 text-xs text-stone-500">
                            {session.sessionDate
                              ? new Date(session.sessionDate).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
                              : 'No date set'}
                          </p>
                        </div>
                        <div className="sm:shrink-0">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
                            session.status === 'COMPLETED' ? 'bg-green-100 text-green-700'
                            : session.status === 'ACTIVE'  ? 'bg-blue-100 text-blue-700'
                            : session.status === 'CANCELLED' ? 'bg-red-100 text-red-500'
                            : 'bg-amber-100 text-amber-700'
                          }`}>
                            {session.status}
                          </span>
                        </div>
                      </div>
                      {session.gameMode && (
                        <p className="mt-2 text-xs text-stone-500">{session.gameMode} · {session.courtCount} court{session.courtCount !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  )
}
