import { createContext, useContext, useReducer, useEffect } from 'react'
import { generateSchedule } from '../services/schedulerService'

const SessionContext = createContext(null)

const initialState = {
  sessions: [],
  currentSessionId: null,
  isBroadcasting: false,
  error: null,
}

function buildCourts(courtCount) {
  return Array.from({ length: courtCount }, (_, i) => `Court ${i + 1}`)
}

function getEligiblePlayers(players) {
  return players.filter((p) => {
    if (p.status !== 'active') return false
    if (p.plannedRounds > 0 && p.roundsPlayed >= p.plannedRounds) return false
    return true
  })
}

function getCurrentSession(state) {
  return state.sessions.find((session) => session.id === state.currentSessionId) || null
}

function updateCurrentSession(state, updater) {
  return {
    ...state,
    sessions: state.sessions.map((session) =>
      session.id === state.currentSessionId ? updater(session) : session
    ),
  }
}

function applyRoundToState(round, currentHistory, currentPlayers) {
  const newHistory = {
    partner: { ...currentHistory.partner },
    opponent: { ...currentHistory.opponent },
  }

  for (const match of round.matches) {
    const [team1, team2] = match.teams
    const pairs = [
      [team1[0], team1[1]],
      [team2[0], team2[1]],
    ]

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

  const matchedIds = new Set(round.matches.flatMap((m) => m.teams.flat().map((p) => p.id)))
  const sitOutIds = new Set(round.sitOuts.map((p) => p.id))

  const updatedPlayers = currentPlayers.map((p) => ({
    ...p,
    roundsPlayed: matchedIds.has(p.id) ? p.roundsPlayed + 1 : p.roundsPlayed,
    sitOutCount: sitOutIds.has(p.id) ? p.sitOutCount + 1 : p.sitOutCount,
  }))

  return { newHistory, updatedPlayers }
}

function swapPlayersInRound(round, playerIdA, playerIdB) {
  const newRound = JSON.parse(JSON.stringify(round))
  let posA = null
  let posB = null

  for (let mi = 0; mi < newRound.matches.length; mi++) {
    for (let ti = 0; ti < 2; ti++) {
      for (let pi = 0; pi < 2; pi++) {
        const id = newRound.matches[mi].teams[ti][pi].id
        if (id === playerIdA) posA = { type: 'match', mi, ti, pi }
        if (id === playerIdB) posB = { type: 'match', mi, ti, pi }
      }
    }
  }

  for (let si = 0; si < newRound.sitOuts.length; si++) {
    const id = newRound.sitOuts[si].id
    if (id === playerIdA) posA = { type: 'sitout', si }
    if (id === playerIdB) posB = { type: 'sitout', si }
  }

  if (!posA || !posB) return round

  const getPlayerAtPos = (pos) =>
    pos.type === 'match'
      ? newRound.matches[pos.mi].teams[pos.ti][pos.pi]
      : newRound.sitOuts[pos.si]

  const setPlayerAtPos = (pos, player) => {
    if (pos.type === 'match') {
      newRound.matches[pos.mi].teams[pos.ti][pos.pi] = player
    } else {
      newRound.sitOuts[pos.si] = player
    }
  }

  const playerA = { ...getPlayerAtPos(posA) }
  const playerB = { ...getPlayerAtPos(posB) }

  setPlayerAtPos(posA, playerB)
  setPlayerAtPos(posB, playerA)

  return newRound
}

function reducer(state, action) {
  switch (action.type) {
    case 'CREATE_SESSION': {
      const newSession = {
        id: Date.now(),
        ...action.payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nextPlayerId: 1,
        players: [],
        rounds: [],
        history: { partner: {}, opponent: {} },
      }

      return {
        ...state,
        sessions: [...state.sessions, newSession],
        currentSessionId: newSession.id,
        error: null,
      }
    }

    case 'SELECT_SESSION':
      return {
        ...state,
        currentSessionId: action.payload,
        error: null,
      }

    case 'UPDATE_SESSION':
      return {
        ...state,
        sessions: state.sessions.map((session) =>
          session.id === action.payload.id
            ? {
                ...session,
                ...action.payload.updates,
                updatedAt: new Date().toISOString(),
              }
            : session
        ),
        error: null,
      }

    case 'DELETE_SESSION': {
      const remainingSessions = state.sessions.filter(
        (session) => session.id !== action.payload
      )

      return {
        ...state,
        sessions: remainingSessions,
        currentSessionId:
          state.currentSessionId === action.payload
            ? remainingSessions[0]?.id || null
            : state.currentSessionId,
        error: null,
      }
    }

    case 'ADD_PLAYER':
      return updateCurrentSession(state, (session) => {
        const player = {
          ...action.payload,
          id: session.nextPlayerId,
          sitOutCount: 0,
          roundsPlayed: 0,
          status: 'active',
        }

        return {
          ...session,
          players: [...session.players, player],
          nextPlayerId: session.nextPlayerId + 1,
          updatedAt: new Date().toISOString(),
        }
      })

    case 'UPDATE_PLAYER':
      return updateCurrentSession(state, (session) => ({
        ...session,
        players: session.players.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload.updates } : p
        ),
        updatedAt: new Date().toISOString(),
      }))

    case 'REMOVE_PLAYER':
      return updateCurrentSession(state, (session) => ({
        ...session,
        players: session.players.filter((p) => p.id !== action.payload),
        updatedAt: new Date().toISOString(),
      }))

    case 'TOGGLE_PLAYER_STATUS':
      return updateCurrentSession(state, (session) => ({
        ...session,
        players: session.players.map((p) =>
          p.id === action.payload
            ? { ...p, status: p.status === 'active' ? 'resting' : 'active' }
            : p
        ),
        updatedAt: new Date().toISOString(),
      }))

    case 'SET_FIRST_ROUND':
      return updateCurrentSession(state, (session) => ({
        ...session,
        rounds: [{ ...action.payload, roundNumber: 1, isConfirmed: false }],
        updatedAt: new Date().toISOString(),
      }))

    case 'SET_NEXT_ROUND':
      return updateCurrentSession(state, (session) => {
        const confirmedRounds = session.rounds.map((r, i) =>
          i === session.rounds.length - 1 ? { ...r, isConfirmed: true } : r
        )

        return {
          ...session,
          players: action.payload.updatedPlayers,
          history: action.payload.newHistory,
          rounds: [
            ...confirmedRounds,
            {
              ...action.payload.result,
              roundNumber: session.rounds.length + 1,
              isConfirmed: false,
            },
          ],
          updatedAt: new Date().toISOString(),
        }
      })

    case 'SWAP_PLAYERS':
      return updateCurrentSession(state, (session) => {
        const { roundIdx, playerIdA, playerIdB } = action.payload
        const rounds = [...session.rounds]
        rounds[roundIdx] = swapPlayersInRound(rounds[roundIdx], playerIdA, playerIdB)

        return {
          ...session,
          rounds,
          updatedAt: new Date().toISOString(),
        }
      })

    case 'TOGGLE_BROADCAST':
      return { ...state, isBroadcasting: !state.isBroadcasting }

    case 'SET_ERROR':
      return { ...state, error: action.payload }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

const STORAGE_KEY = 'social-tennis-session'

export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : initialState
    } catch {
      return initialState
    }
  })

  const currentSession = getCurrentSession(state)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  async function generateFirstRound() {
    try {
      if (!currentSession) {
        dispatch({ type: 'SET_ERROR', payload: 'No session selected.' })
        return
      }

      const eligible = getEligiblePlayers(currentSession.players)
      const courts = buildCourts(currentSession.courtCount)
      const algorithmPlayers = eligible.map((p) => ({
        id: p.id,
        rating: p.rating,
        sitOutCount: p.sitOutCount,
      }))

      const result = await generateSchedule(
        algorithmPlayers,
        courts,
        currentSession.history
      )

      dispatch({ type: 'SET_FIRST_ROUND', payload: result })
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e.message })
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

      const { newHistory, updatedPlayers } = applyRoundToState(
        currentRound,
        currentSession.history,
        currentSession.players
      )

      const eligible = getEligiblePlayers(updatedPlayers)
      const courts = buildCourts(currentSession.courtCount)
      const algorithmPlayers = eligible.map((p) => ({
        id: p.id,
        rating: p.rating,
        sitOutCount: p.sitOutCount,
      }))

      const result = await generateSchedule(
        algorithmPlayers,
        courts,
        newHistory
      )

      dispatch({
        type: 'SET_NEXT_ROUND',
        payload: { updatedPlayers, newHistory, result },
      })
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e.message })
    }
  }

  const actions = {
    createSession: (session) =>
      dispatch({ type: 'CREATE_SESSION', payload: session }),
    selectSession: (id) =>
      dispatch({ type: 'SELECT_SESSION', payload: id }),
    updateSession: (id, updates) =>
      dispatch({ type: 'UPDATE_SESSION', payload: { id, updates } }),
    deleteSession: (id) =>
      dispatch({ type: 'DELETE_SESSION', payload: id }),

    addPlayer: (player) =>
      dispatch({ type: 'ADD_PLAYER', payload: player }),
    updatePlayer: (id, updates) =>
      dispatch({ type: 'UPDATE_PLAYER', payload: { id, updates } }),
    removePlayer: (id) =>
      dispatch({ type: 'REMOVE_PLAYER', payload: id }),
    togglePlayerStatus: (id) =>
      dispatch({ type: 'TOGGLE_PLAYER_STATUS', payload: id }),

    generateFirstRound,
    confirmAndGenerateNext,

    swapPlayers: (roundIdx, playerIdA, playerIdB) =>
      dispatch({
        type: 'SWAP_PLAYERS',
        payload: { roundIdx, playerIdA, playerIdB },
      }),

    toggleBroadcast: () =>
      dispatch({ type: 'TOGGLE_BROADCAST' }),
    clearError: () =>
      dispatch({ type: 'CLEAR_ERROR' }),
    reset: () =>
      dispatch({ type: 'RESET' }),
    getPlayerById: (id) =>
      currentSession?.players.find((p) => p.id === id),
  }

  return (
    <SessionContext.Provider value={{ state, currentSession, ...actions }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return ctx
}