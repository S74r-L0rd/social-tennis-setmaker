import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { getSessionScheduleIssue } from '../utils/roundSchedule'
import { useAuth } from './AuthContext'
import { api } from '../services/api'

const SessionContext = createContext(null)

const initialState = {
  sessions: [],
  playerLibrary: [],
  currentSessionId: null,
  nextSessionId: 1,
  nextPlayerId: 1,
  error: null,
}

// ─── Backend → frontend adapters ─────────────────────────────────────────────

function adaptSessionPlayers(sessionPlayers) {
  return (sessionPlayers ?? []).map(sp => ({
    id: sp.playerId,
    name: sp.player.name,
    gender: sp.player.gender,
    rating: Number(sp.player.rating ?? 0),
    plannedRounds: Number(sp.plannedRounds ?? 0),
    roundsPlayed: Number(sp.roundsPlayed ?? 0),
    sitOutCount: Number(sp.sitOutCount ?? 0),
    status: sp.status === 'ACTIVE' ? 'active' : sp.status === 'RESTING' ? 'resting' : 'inactive',
    _sessionPlayerId: sp.id,
  }))
}

function adaptBackendRound(r) {
  const matches = (r.matches ?? []).map(match => {
    const sorted = [...(match.assignments ?? [])].sort((a, b) =>
      a.teamNumber !== b.teamNumber ? a.teamNumber - b.teamNumber : a.positionInTeam - b.positionInTeam
    )
    const team1 = sorted.filter(a => a.teamNumber === 1).map(a => ({
      id: a.playerId, name: a.player.name, gender: a.player.gender,
      rating: Number(a.player.rating ?? 0), sitOutCount: 0,
    }))
    const team2 = sorted.filter(a => a.teamNumber === 2).map(a => ({
      id: a.playerId, name: a.player.name, gender: a.player.gender,
      rating: Number(a.player.rating ?? 0), sitOutCount: 0,
    }))
    return { court: match.courtName || `Court ${match.courtNumber}`, teams: [team1, team2] }
  })

  const sitOuts = (r.sitOuts ?? []).map(so => ({
    id: so.sessionPlayer?.playerId,
    name: so.sessionPlayer?.player?.name ?? '',
    gender: so.sessionPlayer?.player?.gender ?? null,
    rating: Number(so.sessionPlayer?.player?.rating ?? 0),
    sitOutCount: Number(so.sessionPlayer?.sitOutCount ?? 0),
  }))

  return {
    _dbId: r.id,
    roundNumber: r.roundNumber,
    isConfirmed: r.isConfirmed,
    generatedAt: r.generatedAt ?? r.createdAt,
    historySnapshot: null,
    reshuffleUndoSnapshot: null,
    matches,
    sitOuts,
  }
}

function adaptBackendSession(s) {
  const courts = (s.courts ?? [])
    .filter(c => c.isAvailable)
    .sort((a, b) => (a.priorityOrder ?? 999) - (b.priorityOrder ?? 999) || a.courtNumber - b.courtNumber)
    .map(c => c.courtName || `Court ${c.courtNumber}`)

  const rounds = (s.rounds ?? []).map(adaptBackendRound)

  return {
    id: s.id,
    createdAt: s.createdAt,
    session: {
      name: s.name,
      sessionDate: s.sessionDate ? String(s.sessionDate).slice(0, 10) : null,
      sessionPeriod: s.sessionPeriod,
      startDateTime: s.startDateTime,
      matchDurationMinutes: s.matchDurationMinutes,
      breakIntervalMinutes: s.breakIntervalMinutes,
      courtCount: s.courtCount,
      courts: courts.length > 0
        ? courts
        : Array.from({ length: s.courtCount ?? 0 }, (_, i) => `Court ${i + 1}`),
      gameMode: s.gameMode,
    },
    players: adaptSessionPlayers(s.sessionPlayers ?? []),
    rounds,
    history: { partner: {}, opponent: {} },
    isBroadcasting: false,
    selectedBroadcastRoundNumber: rounds.length > 0 ? rounds[rounds.length - 1].roundNumber : null,
  }
}

function createSessionPlayer(player) {
  return {
    ...player,
    rating: Number(player.rating ?? 0),
    plannedRounds: Number(player.plannedRounds ?? 0),
    roundsPlayed: Number(player.roundsPlayed ?? 0),
    sitOutCount: Number(player.sitOutCount ?? 0),
    status: 'active',
  }
}

function syncSessionPlayersWithLibrary(sessionPlayers = [], playerLibrary = []) {
  const existingPlayersById = new Map(sessionPlayers.map(player => [player.id, player]))

  return playerLibrary.map(player => {
    const existingPlayer = existingPlayersById.get(player.id)
    if (!existingPlayer) return createSessionPlayer(player)

    return {
      ...existingPlayer,
      name: player.name,
      gender: player.gender,
      rating: Number(player.rating ?? 0),
      plannedRounds: Number(player.plannedRounds ?? 0),
      roundsPlayed: Number(existingPlayer.roundsPlayed ?? 0),
      sitOutCount: Number(existingPlayer.sitOutCount ?? 0),
    }
  })
}

function createEmptySession(config, id, playerLibrary = []) {
  return {
    id,
    session: { ...config },
    createdAt: new Date().toISOString(),
    players: playerLibrary.map(createSessionPlayer),
    rounds: [],
    selectedBroadcastRoundNumber: null,
    history: { partner: {}, opponent: {} },
    isBroadcasting: false,
  }
}

function getCurrentSessionRecord(state) {
  return state.sessions.find(session => session.id === state.currentSessionId) ?? null
}

function updateCurrentSession(state, updater) {
  if (state.currentSessionId == null) return state

  return {
    ...state,
    sessions: state.sessions.map(session =>
      session.id === state.currentSessionId ? updater(session) : session
    ),
  }
}

function cloneHistory(history) {
  return {
    partner: { ...(history?.partner || {}) },
    opponent: { ...(history?.opponent || {}) },
  }
}

function cloneRoundForUndo(round) {
  return JSON.parse(JSON.stringify({
    matches: round.matches,
    sitOuts: round.sitOuts,
    generatedAt: round.generatedAt ?? null,
    historySnapshot: round.historySnapshot ?? null,
  }))
}

function getSessionCourts(sessionConfig) {
  if (Array.isArray(sessionConfig?.courts) && sessionConfig.courts.length > 0) return sessionConfig.courts
  if (Number.isInteger(sessionConfig?.courtCount) && sessionConfig.courtCount > 0) {
    return Array.from({ length: sessionConfig.courtCount }, (_, i) => `Court ${i + 1}`)
  }
  return []
}

function getEligiblePlayers(players) {
  return players.filter(player => {
    if (player.status !== 'active') return false
    if (!Number.isInteger(player.plannedRounds) || player.plannedRounds <= 0) return true
    return player.roundsPlayed < player.plannedRounds
  })
}

function applyRoundToState(round, currentHistory, currentPlayers) {
  const newHistory = {
    partner: { ...currentHistory.partner },
    opponent: { ...currentHistory.opponent },
  }

  for (const match of round.matches) {
    const [team1, team2] = match.teams
    const pairs = [[team1[0], team1[1]], [team2[0], team2[1]]]

    for (const [p1, p2] of pairs) {
      const key = [p1.id, p2.id].sort((a, b) => a - b).join('-')
      newHistory.partner[key] = (newHistory.partner[key] || 0) + 1
    }

    for (const p1 of team1) {
      for (const p2 of team2) {
        const key = [p1.id, p2.id].sort((a, b) => a - b).join('-')
        newHistory.opponent[key] = (newHistory.opponent[key] || 0) + 1
      }
    }
  }

  const matchedIds = new Set(round.matches.flatMap(match => match.teams.flat().map(player => player.id)))
  const sitOutIds = new Set(round.sitOuts.map(player => player.id))

  const updatedPlayers = currentPlayers.map(player => ({
    ...player,
    roundsPlayed: matchedIds.has(player.id) ? player.roundsPlayed + 1 : player.roundsPlayed,
    sitOutCount: sitOutIds.has(player.id) ? player.sitOutCount + 1 : player.sitOutCount,
  }))

  return { newHistory, updatedPlayers }
}

function getRoundPlayerPool(round) {
  const players = []

  for (const match of round.matches) {
    for (const team of match.teams) {
      for (const player of team) players.push(player)
    }
  }

  for (const player of round.sitOuts) players.push(player)

  return players.map(player => ({
    id: player.id,
    rating: player.rating,
    sitOutCount: player.sitOutCount ?? 0,
  }))
}

function getRoundCourts(round) {
  return round.matches.map(match => match.court)
}

function swapPlayersInRound(round, playerIdA, playerIdB) {
  const newRound = JSON.parse(JSON.stringify(round))
  let posA = null
  let posB = null

  for (let matchIndex = 0; matchIndex < newRound.matches.length; matchIndex++) {
    for (let teamIndex = 0; teamIndex < 2; teamIndex++) {
      for (let playerIndex = 0; playerIndex < 2; playerIndex++) {
        const id = newRound.matches[matchIndex].teams[teamIndex][playerIndex].id
        if (id === playerIdA) posA = { type: 'match', matchIndex, teamIndex, playerIndex }
        if (id === playerIdB) posB = { type: 'match', matchIndex, teamIndex, playerIndex }
      }
    }
  }

  for (let sitOutIndex = 0; sitOutIndex < newRound.sitOuts.length; sitOutIndex++) {
    const id = newRound.sitOuts[sitOutIndex].id
    if (id === playerIdA) posA = { type: 'sitout', sitOutIndex }
    if (id === playerIdB) posB = { type: 'sitout', sitOutIndex }
  }

  if (!posA || !posB) return round

  const getPlayer = (position) => position.type === 'match'
    ? newRound.matches[position.matchIndex].teams[position.teamIndex][position.playerIndex]
    : newRound.sitOuts[position.sitOutIndex]

  const setPlayer = (position, player) => {
    if (position.type === 'match') {
      newRound.matches[position.matchIndex].teams[position.teamIndex][position.playerIndex] = player
    } else {
      newRound.sitOuts[position.sitOutIndex] = player
    }
  }

  const playerA = { ...getPlayer(posA) }
  const playerB = { ...getPlayer(posB) }
  setPlayer(posA, playerB)
  setPlayer(posB, playerA)
  return newRound
}

function buildPlayerDatabase(sessions, playerLibrary) {
  const statsByPlayerId = new Map(
    playerLibrary.map(player => [player.id, {
      id: player.id,
      name: player.name,
      gender: player.gender,
      rating: player.rating,
      plannedRounds: player.plannedRounds ?? 0,
      totalSitOuts: 0,
      totalMatches: 0,
      totalUnbalancedMatches: 0,
      sessionCount: 0,
      partners: new Map(),
    }])
  )

  for (const session of sessions) {
    const seenInSession = new Set()

    for (const player of session.players ?? []) {
      const entry = statsByPlayerId.get(player.id)
      if (!entry) continue
      seenInSession.add(player.id)
    }

    for (const playerId of seenInSession) {
      const entry = statsByPlayerId.get(playerId)
      if (entry) entry.sessionCount += 1
    }

    for (const round of session.rounds ?? []) {
      const countedPlayersInRound = new Set()

      for (const match of round.matches ?? []) {
        const [teamA, teamB] = match.teams ?? []
        const teamARating = (teamA ?? []).reduce((sum, player) => sum + (player.rating ?? 0), 0)
        const teamBRating = (teamB ?? []).reduce((sum, player) => sum + (player.rating ?? 0), 0)
        const isUnbalancedMatch = Math.abs(teamARating - teamBRating) >= 2

        for (const team of match.teams ?? []) {
          if (team.length !== 2) continue
          const [playerA, playerB] = team
          const entryA = statsByPlayerId.get(playerA.id)
          const entryB = statsByPlayerId.get(playerB.id)

          if (entryA && !countedPlayersInRound.has(playerA.id)) {
            entryA.totalMatches += 1
            countedPlayersInRound.add(playerA.id)
          }
          if (entryB && !countedPlayersInRound.has(playerB.id)) {
            entryB.totalMatches += 1
            countedPlayersInRound.add(playerB.id)
          }

          if (entryA) {
            entryA.partners.set(playerB.id, (entryA.partners.get(playerB.id) ?? 0) + 1)
          }
          if (entryB) {
            entryB.partners.set(playerA.id, (entryB.partners.get(playerA.id) ?? 0) + 1)
          }

          if (isUnbalancedMatch) {
            if (entryA) entryA.totalUnbalancedMatches += 1
            if (entryB) entryB.totalUnbalancedMatches += 1
          }
        }
      }

      for (const player of round.sitOuts ?? []) {
        const entry = statsByPlayerId.get(player.id)
        if (!entry || countedPlayersInRound.has(player.id)) continue
        entry.totalSitOuts += 1
        countedPlayersInRound.add(player.id)
      }
    }
  }

  return Array.from(statsByPlayerId.values())
    .map(entry => {
      let commonPartner = null

      for (const [partnerId, count] of entry.partners.entries()) {
        const partner = playerLibrary.find(player => player.id === partnerId)
        if (!partner) continue

        if (!commonPartner || count > commonPartner.count || (count === commonPartner.count && partner.name < commonPartner.name)) {
          commonPartner = { id: partnerId, name: partner.name, count }
        }
      }

      return {
        id: entry.id,
        name: entry.name,
        gender: entry.gender,
        rating: entry.rating,
        plannedRounds: entry.plannedRounds,
        totalSitOuts: entry.totalSitOuts,
        totalMatches: entry.totalMatches,
        totalUnbalancedMatches: entry.totalUnbalancedMatches,
        sessionCount: entry.sessionCount,
        commonPartnerName: commonPartner?.name ?? 'No partner data yet',
        commonPartnerCount: commonPartner?.count ?? 0,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

function normalizeSessionRecord(session, fallbackId) {
  const normalizedSessionConfig = normalizeSessionConfig(session?.session ?? session)

  if (session?.session) {
    return {
      ...session,
      id: session.id ?? fallbackId,
      session: normalizedSessionConfig,
      players: session.players ?? [],
      rounds: session.rounds ?? [],
      selectedBroadcastRoundNumber: session.selectedBroadcastRoundNumber ?? null,
      history: session.history ?? { partner: {}, opponent: {} },
      isBroadcasting: session.isBroadcasting ?? false,
      createdAt: session.createdAt ?? new Date().toISOString(),
    }
  }

  return {
    id: session.id ?? fallbackId,
    session: normalizedSessionConfig,
    createdAt: session.createdAt ?? new Date().toISOString(),
    players: session.players ?? [],
    rounds: session.rounds ?? [],
    selectedBroadcastRoundNumber: session.selectedBroadcastRoundNumber ?? null,
    history: session.history ?? { partner: {}, opponent: {} },
    isBroadcasting: session.isBroadcasting ?? false,
  }
}

function inferStartDateTime(sessionConfig = {}) {
  if (typeof sessionConfig.startDateTime === 'string' && sessionConfig.startDateTime.trim()) {
    return sessionConfig.startDateTime
  }

  if (!sessionConfig.sessionDate) return null

  const fallbackTimeByPeriod = {
    morning: '09:00',
    afternoon: '13:00',
    evening: '18:00',
  }

  const fallbackTime = fallbackTimeByPeriod[sessionConfig.sessionPeriod] ?? '09:00'
  return `${sessionConfig.sessionDate}T${fallbackTime}`
}

function normalizeSessionConfig(sessionConfig = {}) {
  return {
    name: sessionConfig.name ?? 'Untitled Session',
    sessionDate: sessionConfig.sessionDate,
    sessionPeriod: sessionConfig.sessionPeriod,
    courtCount: sessionConfig.courtCount,
    courts: sessionConfig.courts,
    startDateTime: inferStartDateTime(sessionConfig),
    matchDurationMinutes: sessionConfig.matchDurationMinutes,
    breakIntervalMinutes: sessionConfig.breakIntervalMinutes,
    gameMode: sessionConfig.gameMode,
  }
}

function migrateLegacyState(saved) {
  if (!saved || typeof saved !== 'object') return initialState

  if (Array.isArray(saved.sessions)) {
    const normalizedSessions = saved.sessions.map((session, index) => normalizeSessionRecord(session, index + 1))

    const playerMap = new Map()
    for (const session of normalizedSessions) {
      for (const player of session.players ?? []) {
        if (!playerMap.has(player.id)) {
          playerMap.set(player.id, {
            id: player.id,
            name: player.name,
            gender: player.gender,
            rating: Number(player.rating ?? 0),
            plannedRounds: Number(player.plannedRounds ?? 0),
          })
        }
      }
    }

    const playerLibrary = saved.playerLibrary ?? Array.from(playerMap.values())
    const maxPlayerId = Math.max(0, ...playerLibrary.map(player => player.id))
    const maxSessionId = Math.max(0, ...normalizedSessions.map(session => session.id))

    return {
      ...initialState,
      playerLibrary,
      sessions: normalizedSessions.map(session => ({
        ...session,
        players: syncSessionPlayersWithLibrary(session.players, playerLibrary),
      })),
      currentSessionId: saved.currentSessionId ?? normalizedSessions[0]?.id ?? null,
      nextSessionId: saved.nextSessionId ?? maxSessionId + 1,
      nextPlayerId: saved.nextPlayerId ?? maxPlayerId + 1,
      error: saved.error ?? null,
    }
  }

  if (!saved.session) {
    return { ...initialState }
  }

  const legacyPlayers = (saved.players ?? []).map(player => ({
    id: player.id,
    name: player.name,
    gender: player.gender,
    rating: Number(player.rating ?? 0),
    plannedRounds: Number(player.plannedRounds ?? 0),
  }))

  const migratedSession = {
    id: 1,
    session: saved.session,
    createdAt: saved.session.createdAt ?? new Date().toISOString(),
    players: saved.players ?? [],
    rounds: saved.rounds ?? [],
    selectedBroadcastRoundNumber: saved.selectedBroadcastRoundNumber ?? null,
    history: saved.history ?? { partner: {}, opponent: {} },
    isBroadcasting: saved.isBroadcasting ?? false,
  }

  return {
    sessions: [migratedSession],
    playerLibrary: legacyPlayers,
    currentSessionId: 1,
    nextSessionId: 2,
    nextPlayerId: saved.nextPlayerId ?? (legacyPlayers.reduce((maxId, player) => Math.max(maxId, player.id), 0) + 1),
    error: saved.error ?? null,
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload

    case 'SET_SESSION': {
      const sessionRecord = createEmptySession(action.payload, state.nextSessionId, state.playerLibrary)
      return {
        ...state,
        sessions: [...state.sessions, sessionRecord],
        currentSessionId: sessionRecord.id,
        nextSessionId: state.nextSessionId + 1,
        error: null,
      }
    }

    case 'SELECT_SESSION':
      return {
        ...state,
        currentSessionId: action.payload,
        error: null,
      }

    case 'UPDATE_SESSION_CONFIG':
      return {
        ...state,
        sessions: state.sessions.map(session =>
          session.id === action.payload.sessionId
            ? {
                ...session,
                session: {
                  ...session.session,
                  ...action.payload.updates,
                },
              }
            : session
        ),
        error: null,
      }

    case 'DELETE_SESSION': {
      const sessions = state.sessions.filter(session => session.id !== action.payload)
      if (sessions.length === 0) {
        return {
          ...state,
          sessions: [],
          currentSessionId: null,
          error: null,
        }
      }

      const currentSessionId = state.currentSessionId === action.payload
        ? sessions[sessions.length - 1].id
        : state.currentSessionId

      return {
        ...state,
        sessions,
        currentSessionId,
        error: null,
      }
    }

    case 'ADD_PLAYER':
      return {
        ...state,
        playerLibrary: [
          ...state.playerLibrary,
          {
            ...action.payload,
            id: state.nextPlayerId,
          },
        ],
        sessions: state.sessions.map(session => ({
          ...session,
          players: [...session.players, createSessionPlayer({
            ...action.payload,
            id: state.nextPlayerId,
          })],
        })),
        nextPlayerId: state.nextPlayerId + 1,
      }

    case 'UPDATE_PLAYER':
      return {
        ...state,
        playerLibrary: state.playerLibrary.map(player =>
          player.id === action.payload.id ? { ...player, ...action.payload.updates } : player
        ),
        sessions: state.sessions.map(session => ({
          ...session,
          players: session.players.map(player =>
            player.id === action.payload.id ? { ...player, ...action.payload.updates } : player
          ),
        })),
      }

    case 'REMOVE_PLAYER':
      return updateCurrentSession(state, session => ({
        ...session,
        players: session.players.filter(player => player.id !== action.payload),
      }))

    case 'TOGGLE_PLAYER_STATUS':
      return updateCurrentSession(state, session => ({
        ...session,
        players: session.players.map(player =>
          player.id === action.payload
            ? { ...player, status: player.status === 'active' ? 'resting' : 'active' }
            : player
        ),
      }))

    case 'SET_FIRST_ROUND':
      return updateCurrentSession(state, session => {
        const nextRound = action.payload
        return {
          ...session,
          rounds: [nextRound],
          selectedBroadcastRoundNumber: nextRound.roundNumber,
        }
      })

    case 'GENERATE_ROUND_FROM_PLAYERS_RESULT':
      return updateCurrentSession(state, session => {
        const nextRound = action.payload
        const existingRounds = session.rounds.map((round, index) =>
          index === session.rounds.length - 1 ? { ...round, isConfirmed: true } : round
        )

        return {
          ...session,
          rounds: [...existingRounds, nextRound],
          selectedBroadcastRoundNumber: nextRound.roundNumber,
        }
      })

    case 'SET_NEXT_ROUND':
      return updateCurrentSession(state, session => {
        const confirmedRounds = session.rounds.map((round, index) =>
          index === session.rounds.length - 1 ? { ...round, isConfirmed: true } : round
        )

        const rounds = action.payload.result
          ? [...confirmedRounds, action.payload.result]
          : confirmedRounds

        return {
          ...session,
          players: action.payload.updatedPlayers,
          history: action.payload.newHistory,
          rounds,
          selectedBroadcastRoundNumber: rounds[rounds.length - 1]?.roundNumber ?? null,
        }
      })

    case 'SWAP_PLAYERS':
      return updateCurrentSession(state, session => {
        const rounds = [...session.rounds]
        rounds[action.payload.roundIdx] = swapPlayersInRound(
          rounds[action.payload.roundIdx],
          action.payload.playerIdA,
          action.payload.playerIdB
        )
        return { ...session, rounds }
      })

    case 'RESHUFFLE_ROUND_RESULT':
      return updateCurrentSession(state, session => {
        const round = session.rounds[action.payload.roundIdx]
        if (!round) return session

        const rounds = [...session.rounds]
        rounds[action.payload.roundIdx] = {
          ...round,
          ...action.payload.result,
          generatedAt: new Date().toISOString(),
          reshuffleUndoSnapshot: cloneRoundForUndo(round),
        }

        return { ...session, rounds }
      })

    case 'UNDO_RESHUFFLE_ROUND':
      return updateCurrentSession(state, session => {
        const round = session.rounds[action.payload]
        if (!round?.reshuffleUndoSnapshot) return session

        const rounds = [...session.rounds]
        rounds[action.payload] = {
          ...round,
          ...round.reshuffleUndoSnapshot,
          reshuffleUndoSnapshot: null,
        }

        return { ...session, rounds }
      })

    case 'SET_BROADCAST_ROUND':
      return updateCurrentSession(state, session => ({
        ...session,
        selectedBroadcastRoundNumber: action.payload,
      }))

    case 'CLEAR_SCHEDULE':
      return updateCurrentSession(state, session => ({
        ...session,
        players: session.players.map(player => ({
          ...player,
          roundsPlayed: 0,
          sitOutCount: 0,
        })),
        rounds: [],
        selectedBroadcastRoundNumber: null,
        history: { partner: {}, opponent: {} },
      }))

    case 'TOGGLE_BROADCAST':
      return updateCurrentSession(state, session => ({
        ...session,
        isBroadcasting: !session.isBroadcasting,
      }))

    case 'SET_ERROR':
      return { ...state, error: action.payload }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    case 'RESET':
      return initialState

    case 'UPDATE_SESSIONS':
      return { ...state, sessions: action.payload }

    case 'ADD_PLAYER_DIRECT': {
      const player = action.payload
      const inLibrary = state.playerLibrary.some(p => p.id === player.id)
      return {
        ...state,
        playerLibrary: inLibrary
          ? state.playerLibrary
          : [...state.playerLibrary, { id: player.id, name: player.name, gender: player.gender, rating: player.rating, plannedRounds: player.plannedRounds ?? 0 }],
        sessions: state.sessions.map(session =>
          session.id === state.currentSessionId
            ? { ...session, players: [...session.players, player] }
            : session
        ),
      }
    }

    default:
      return state
  }
}

export function SessionProvider({ children }) {
  const { token, isAuthenticated } = useAuth()
  const [state, dispatch] = useReducer(reducer, initialState)

  // Load from backend whenever auth state changes
  useEffect(() => {
    if (!isAuthenticated || !token) {
      dispatch({ type: 'RESET' })
      return
    }
    loadAll()
  }, [isAuthenticated, token])

  async function loadAll() {
    try {
      const [sessions, players] = await Promise.all([
        api.getSessions(token),
        api.getPlayers(token),
      ])
      const adapted = sessions.map(adaptBackendSession)
      const library = players.map(p => ({
        id: p.id, name: p.name, gender: p.gender,
        rating: Number(p.rating ?? 0), plannedRounds: 0,
      }))
      const maxSession = Math.max(0, ...adapted.map(s => s.id))
      const maxPlayer  = Math.max(0, ...players.map(p => p.id))
      dispatch({
        type: 'LOAD_STATE',
        payload: {
          sessions: adapted,
          playerLibrary: library,
          currentSessionId: adapted.length > 0 ? adapted[0].id : null,
          nextSessionId: maxSession + 1,
          nextPlayerId:  maxPlayer  + 1,
          error: null,
        },
      })
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load data from server.' })
    }
  }

  const currentSession = useMemo(() => getCurrentSessionRecord(state), [state])
  const playerDatabase = useMemo(
    () => buildPlayerDatabase(state.sessions, state.playerLibrary),
    [state.sessions, state.playerLibrary]
  )

  async function generateFirstRound() {
    return generateRoundFromPlayers()
  }

  async function generateRoundFromPlayers() {
    try {
      if (!state.currentSessionId) {
        dispatch({ type: 'SET_ERROR', payload: 'No session selected.' })
        return false
      }
      const sessionIssue = getSessionScheduleIssue(currentSession?.session)
      if (sessionIssue) {
        dispatch({ type: 'SET_ERROR', payload: sessionIssue })
        return false
      }
      await api.generateRound(state.currentSessionId, token)
      const sessions = await api.getSessions(token)
      dispatch({ type: 'UPDATE_SESSIONS', payload: sessions.map(adaptBackendSession) })
      return true
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
      return false
    }
  }

  async function confirmAndGenerateNext() {
    try {
      if (!currentSession) {
        dispatch({ type: 'SET_ERROR', payload: 'No session selected.' })
        return
      }
      const lastRound = currentSession.rounds[currentSession.rounds.length - 1]
      if (lastRound?._dbId && !lastRound.isConfirmed) {
        await api.confirmRound(lastRound._dbId, token)
      }
      const eligible = getEligiblePlayers(currentSession.players)
      if (eligible.length >= 4) {
        await api.generateRound(state.currentSessionId, token)
      }
      const sessions = await api.getSessions(token)
      dispatch({ type: 'UPDATE_SESSIONS', payload: sessions.map(adaptBackendSession) })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
    }
  }

  async function reshuffleRound(roundIdx) {
    try {
      if (!currentSession) return
      const round = currentSession.rounds[roundIdx]
      if (!round) return
      // Reshuffle is local-only: re-generate using the old stateless endpoint
      const { generateSchedule } = await import('../services/schedulerService')
      const result = await generateSchedule(
        getRoundPlayerPool(round),
        getRoundCourts(round),
        cloneHistory(round.historySnapshot ?? currentSession.history)
      )
      dispatch({ type: 'RESHUFFLE_ROUND_RESULT', payload: { roundIdx, result } })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
    }
  }

  const publicState = {
    sessions: state.sessions.map(session => ({
      id: session.id,
      createdAt: session.createdAt,
      session: session.session,
      roundsCount: session.rounds.length,
      playersCount: session.players.length,
    })),
    currentSessionId: state.currentSessionId,
    session: currentSession?.session ?? null,
    players: currentSession?.players ?? [],
    rounds: currentSession?.rounds ?? [],
    selectedBroadcastRoundNumber: currentSession?.selectedBroadcastRoundNumber ?? null,
    history: currentSession?.history ?? { partner: {}, opponent: {} },
    isBroadcasting: currentSession?.isBroadcasting ?? false,
    playerLibrary: state.playerLibrary,
    playerDatabase,
    error: state.error,
  }

  async function setSession(config) {
    try {
      const created = await api.createSession({
        name: config.name,
        sessionDate: config.sessionDate || null,
        sessionPeriod: config.sessionPeriod || null,
        startDateTime: config.startDateTime || null,
        matchDurationMinutes: config.matchDurationMinutes ? Number(config.matchDurationMinutes) : null,
        breakIntervalMinutes: config.breakIntervalMinutes ? Number(config.breakIntervalMinutes) : null,
        courtCount: config.courtCount ? Number(config.courtCount) : null,
        gameMode: config.gameMode || null,
      }, token)

      if (Array.isArray(config.courts) && config.courts.length > 0) {
        const courts = config.courts.map((courtName, i) => {
          const match = courtName.match(/(\d+)/)
          const courtNumber = match ? parseInt(match[1]) : i + 1
          return { courtNumber, courtName, isAvailable: true, priorityOrder: i + 1 }
        })
        await api.bulkSetCourts(created.id, courts, token)
      }

      await api.activateSession(created.id, token)
      await loadAll()
      dispatch({ type: 'SELECT_SESSION', payload: created.id })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      throw err
    }
  }

  async function updateSessionConfig(sessionId, updates) {
    try {
      const body = {}
      if (updates.name !== undefined)                 body.name = updates.name
      if (updates.sessionDate !== undefined)          body.sessionDate = updates.sessionDate
      if (updates.sessionPeriod !== undefined)        body.sessionPeriod = updates.sessionPeriod
      if (updates.startDateTime !== undefined)        body.startDateTime = updates.startDateTime
      if (updates.matchDurationMinutes !== undefined) body.matchDurationMinutes = Number(updates.matchDurationMinutes)
      if (updates.breakIntervalMinutes !== undefined) body.breakIntervalMinutes = Number(updates.breakIntervalMinutes)
      if (updates.courtCount !== undefined)           body.courtCount = Number(updates.courtCount)
      if (updates.gameMode !== undefined)             body.gameMode = updates.gameMode

      await api.updateSession(sessionId, body, token)

      if (Array.isArray(updates.courts) && updates.courts.length > 0) {
        const courts = updates.courts.map((courtName, i) => {
          const match = courtName.match(/(\d+)/)
          const courtNumber = match ? parseInt(match[1]) : i + 1
          return { courtNumber, courtName, isAvailable: true, priorityOrder: i + 1 }
        })
        await api.bulkSetCourts(sessionId, courts, token)
      }

      dispatch({ type: 'UPDATE_SESSION_CONFIG', payload: { sessionId, updates } })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      throw err
    }
  }

  async function deleteSession(sessionId) {
    try {
      await api.deleteSession(sessionId, token)
      dispatch({ type: 'DELETE_SESSION', payload: sessionId })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
    }
  }

  async function addPlayer(playerData) {
    try {
      if (!state.currentSessionId) {
        dispatch({ type: 'SET_ERROR', payload: 'No session selected.' })
        return
      }
      const player = await api.createPlayer({
        name: playerData.name,
        gender: playerData.gender || null,
        rating: Number(playerData.rating ?? 0),
      }, token)

      const sp = await api.addPlayerToSession({
        sessionId: state.currentSessionId,
        playerId: player.id,
        plannedRounds: Number(playerData.plannedRounds ?? 0),
      }, token)

      dispatch({
        type: 'ADD_PLAYER_DIRECT',
        payload: {
          id: player.id,
          name: player.name,
          gender: player.gender,
          rating: Number(player.rating ?? 0),
          plannedRounds: Number(playerData.plannedRounds ?? 0),
          roundsPlayed: 0,
          sitOutCount: 0,
          status: 'active',
          _sessionPlayerId: sp.id,
        },
      })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      throw err
    }
  }

  async function updatePlayer(id, updates) {
    try {
      await api.updatePlayer(id, {
        name: updates.name,
        gender: updates.gender,
        rating: updates.rating !== undefined ? Number(updates.rating) : undefined,
      }, token)
      dispatch({ type: 'UPDATE_PLAYER', payload: { id, updates } })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
    }
  }

  async function togglePlayerStatus(playerId) {
    const player = currentSession?.players.find(p => p.id === playerId)
    const newDbStatus = player?.status === 'active' ? 'RESTING' : 'ACTIVE'
    if (player?._sessionPlayerId) {
      try {
        await api.updateSessionPlayer(player._sessionPlayerId, { status: newDbStatus }, token)
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: err.message })
        return
      }
    }
    dispatch({ type: 'TOGGLE_PLAYER_STATUS', payload: playerId })
  }

  async function removePlayer(playerId) {
    const player = currentSession?.players.find(p => p.id === playerId)
    if (player?._sessionPlayerId) {
      try {
        await api.removePlayerFromSession(player._sessionPlayerId, token)
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: err.message })
        return
      }
    }
    dispatch({ type: 'REMOVE_PLAYER', payload: playerId })
  }

  const actions = {
    setSession,
    createSession: setSession,
    selectSession: (sessionId) => dispatch({ type: 'SELECT_SESSION', payload: sessionId }),
    updateSessionConfig,
    updateSession: updateSessionConfig,
    deleteSession,
    addPlayer,
    updatePlayer,
    removePlayer,
    togglePlayerStatus,
    generateFirstRound,
    generateRoundFromPlayers,
    confirmAndGenerateNext,
    clearSchedule: () => dispatch({ type: 'CLEAR_SCHEDULE' }),
    setBroadcastRound: (roundNumber) => dispatch({ type: 'SET_BROADCAST_ROUND', payload: roundNumber }),
    reshuffleRound,
    undoReshuffleRound: (roundIdx) => dispatch({ type: 'UNDO_RESHUFFLE_ROUND', payload: roundIdx }),
    swapPlayers: (roundIdx, playerIdA, playerIdB) =>
      dispatch({ type: 'SWAP_PLAYERS', payload: { roundIdx, playerIdA, playerIdB } }),
    toggleBroadcast: () => dispatch({ type: 'TOGGLE_BROADCAST' }),
    clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
    reset: () => dispatch({ type: 'RESET' }),
    getPlayerById: (id) => currentSession?.players.find(player => player.id === id),
  }

  return (
    <SessionContext.Provider value={{ state: publicState, currentSession, ...actions }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession must be used within SessionProvider')
  return context
}
