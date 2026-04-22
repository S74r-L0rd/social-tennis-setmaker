import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { generateSchedule } from '../services/schedulerService'

const SessionContext = createContext(null)

const initialState = {
  sessions: [],
  playerLibrary: [],
  currentSessionId: null,
  nextSessionId: 1,
  nextPlayerId: 1,
  error: null,
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
  if (session?.session) {
    return {
      ...session,
      id: session.id ?? fallbackId,
      session: { ...session.session },
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
    session: {
      name: session.name ?? 'Untitled Session',
      sessionDate: session.sessionDate,
      sessionPeriod: session.sessionPeriod,
      courtCount: session.courtCount,
      courts: session.courts,
      startDateTime: session.startDateTime,
      matchDurationMinutes: session.matchDurationMinutes,
      breakIntervalMinutes: session.breakIntervalMinutes,
      gameMode: session.gameMode,
    },
    createdAt: session.createdAt ?? new Date().toISOString(),
    players: session.players ?? [],
    rounds: session.rounds ?? [],
    selectedBroadcastRoundNumber: session.selectedBroadcastRoundNumber ?? null,
    history: session.history ?? { partner: {}, opponent: {} },
    isBroadcasting: session.isBroadcasting ?? false,
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
      return {
        ...state,
        currentSessionId: null,
        error: null,
      }

    default:
      return state
  }
}

const STORAGE_KEY = 'social-tennis-session'

async function generateRoundForSession(sessionRecord, historyOverride = null) {
  const eligible = getEligiblePlayers(sessionRecord.players)
  const courts = getSessionCourts(sessionRecord.session)
  const history = historyOverride ?? sessionRecord.history
  const algorithmPlayers = eligible.map(player => ({
    id: player.id,
    rating: player.rating,
    sitOutCount: player.sitOutCount,
  }))

  const result = await generateSchedule(algorithmPlayers, courts, history)

  return {
    ...result,
    roundNumber: sessionRecord.rounds.length + 1,
    isConfirmed: false,
    generatedAt: new Date().toISOString(),
    historySnapshot: cloneHistory(history),
    reshuffleUndoSnapshot: null,
  }
}

export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? migrateLegacyState(JSON.parse(saved)) : initialState
    } catch {
      return initialState
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const currentSession = useMemo(() => getCurrentSessionRecord(state), [state])
  const playerDatabase = useMemo(
    () => buildPlayerDatabase(state.sessions, state.playerLibrary),
    [state.sessions, state.playerLibrary]
  )

  async function generateFirstRound() {
    try {
      if (!currentSession) {
        dispatch({ type: 'SET_ERROR', payload: 'No session selected.' })
        return
      }

      const nextRound = await generateRoundForSession(currentSession)
      dispatch({ type: 'SET_FIRST_ROUND', payload: nextRound })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
    }
  }

  async function generateRoundFromPlayers() {
    try {
      if (!currentSession) {
        dispatch({ type: 'SET_ERROR', payload: 'No session selected.' })
        return false
      }

      const roundSeedSession = currentSession.rounds.length === 0
        ? currentSession
        : {
            ...currentSession,
            rounds: currentSession.rounds.map((round, index) =>
              index === currentSession.rounds.length - 1 ? { ...round, isConfirmed: true } : round
            ),
          }

      const nextRound = await generateRoundForSession(roundSeedSession)
      dispatch({ type: 'GENERATE_ROUND_FROM_PLAYERS_RESULT', payload: nextRound })
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

      const currentRound = currentSession.rounds[currentSession.rounds.length - 1]
      if (!currentRound) {
        dispatch({ type: 'SET_ERROR', payload: 'No current round available.' })
        return
      }

      const { newHistory, updatedPlayers } = applyRoundToState(currentRound, currentSession.history, currentSession.players)
      const eligible = getEligiblePlayers(updatedPlayers)

      if (eligible.length < 4) {
        dispatch({
          type: 'SET_NEXT_ROUND',
          payload: { updatedPlayers, newHistory, result: null },
        })
        return
      }

      const nextRound = await generateRoundForSession(
        { ...currentSession, players: updatedPlayers, history: newHistory, rounds: currentSession.rounds },
        newHistory
      )

      dispatch({
        type: 'SET_NEXT_ROUND',
        payload: { updatedPlayers, newHistory, result: nextRound },
      })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
    }
  }

  async function reshuffleRound(roundIdx) {
    try {
      if (!currentSession) {
        dispatch({ type: 'SET_ERROR', payload: 'No session selected.' })
        return
      }

      const round = currentSession.rounds[roundIdx]
      if (!round) return

      const result = await generateSchedule(
        getRoundPlayerPool(round),
        getRoundCourts(round),
        cloneHistory(round.historySnapshot ?? currentSession.history)
      )

      dispatch({
        type: 'RESHUFFLE_ROUND_RESULT',
        payload: { roundIdx, result },
      })
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

  const actions = {
    setSession: (session) => dispatch({ type: 'SET_SESSION', payload: session }),
    createSession: (session) => dispatch({ type: 'SET_SESSION', payload: session }),
    selectSession: (sessionId) => dispatch({ type: 'SELECT_SESSION', payload: sessionId }),
    updateSessionConfig: (sessionId, updates) =>
      dispatch({ type: 'UPDATE_SESSION_CONFIG', payload: { sessionId, updates } }),
    updateSession: (sessionId, updates) =>
      dispatch({ type: 'UPDATE_SESSION_CONFIG', payload: { sessionId, updates } }),
    deleteSession: (sessionId) => dispatch({ type: 'DELETE_SESSION', payload: sessionId }),
    addPlayer: (player) => dispatch({ type: 'ADD_PLAYER', payload: player }),
    updatePlayer: (id, updates) => dispatch({ type: 'UPDATE_PLAYER', payload: { id, updates } }),
    removePlayer: (id) => dispatch({ type: 'REMOVE_PLAYER', payload: id }),
    togglePlayerStatus: (id) => dispatch({ type: 'TOGGLE_PLAYER_STATUS', payload: id }),
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
