const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const data = isJson ? await res.json() : null

  if (!isJson) {
    throw new Error(`Expected JSON from API but received ${contentType || 'an unknown response type'}. Check that the backend server is running and VITE_API_URL points to it.`)
  }

  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data.data
}

export const api = {
  // Sessions
  getSessions:     (token)         => request('GET',    '/api/sessions',                    undefined, token),
  createSession:   (body, token)   => request('POST',   '/api/sessions',                    body,      token),
  updateSession:   (id, body, tok) => request('PUT',    `/api/sessions/${id}`,              body,      tok),
  deleteSession:   (id, token)     => request('DELETE', `/api/sessions/${id}`,              undefined, token),
  activateSession: (id, token)     => request('POST',   `/api/sessions/${id}/activate`,     undefined, token),

  // Courts
  bulkSetCourts: (sessionId, courts, token) =>
    request('POST', `/api/courts/session/${sessionId}/bulk`, { courts }, token),

  // Players
  getPlayers:    (token)         => request('GET',    '/api/players',       undefined, token),
  createPlayer:  (body, token)   => request('POST',   '/api/players',       body,      token),
  updatePlayer:  (id, body, tok) => request('PUT',    `/api/players/${id}`, body,      tok),
  deletePlayer:  (id, token)     => request('DELETE', `/api/players/${id}`, undefined, token),

  // Session players
  addPlayerToSession:     (body, token)   => request('POST',   '/api/session-players',       body,      token),
  getSessionPlayers:      (sid, token)    => request('GET',    `/api/session-players/${sid}`, undefined, token),
  updateSessionPlayer:    (id, body, tok) => request('PUT',    `/api/session-players/${id}`, body,      tok),
  removePlayerFromSession:(id, token)     => request('DELETE', `/api/session-players/${id}`, undefined, token),

  // Rounds
  generateRound:  (sessionId, token) => request('POST', '/api/rounds/generate',              { sessionId }, token),
  getRounds:      (sid, token)       => request('GET',  `/api/rounds/session/${sid}`,         undefined,     token),
  clearRounds:    (sid, token)       => request('DELETE', `/api/rounds/session/${sid}`,       undefined,     token),
  confirmRound:   (id, token)        => request('POST', `/api/rounds/${id}/confirm`,          undefined,     token),

  // Profile
  getMe:          (token)       => request('GET',  '/api/auth/me',       undefined, token),
  updateProfile:  (body, token) => request('PUT',  '/api/auth/profile',  body,      token),
  changePassword: (body, token) => request('PUT',  '/api/auth/password', body,      token),
}
