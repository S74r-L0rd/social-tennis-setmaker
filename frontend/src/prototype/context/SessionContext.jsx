import { createContext, useContext, useReducer, useEffect } from 'react'
import { generateRoundService } from '../services/schedulerService'

const SessionContext = createContext(null)

const initialState = {
  session: null,
  players: [],
  nextPlayerId: 1,
  rounds: [],
  history: { partner: {}, opponent: {} },
  isBroadcasting: false,
  error: null,
}

function buildCourts(courtCount) {
  return Array.from({ length: courtCount }, (_, i) => `Court ${i + 1}`)
}

function getEligiblePlayers(players) {
  return players.filter(p => {
    if (p.status !== 'active') return false
    if (p.plannedRounds > 0 && p.roundsPlayed >= p.plannedRounds) return false
    return true
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

  const matchedIds = new Set(round.matches.flatMap(m => m.teams.flat().map(p => p.id)))
  const sitOutIds = new Set(round.sitOuts.map(p => p.id))

  const updatedPlayers = currentPlayers.map(p => ({
    ...p,
    roundsPlayed: matchedIds.has(p.id) ? p.roundsPlayed + 1 : p.roundsPlayed,
    sitOutCount: sitOutIds.has(p.id) ? p.sitOutCount + 1 : p.sitOutCount,
  }))

  return { newHistory, updatedPlayers }
}

function swapPlayersInRound(round, playerIdA, playerIdB) {
  const newRound = JSON.parse(JSON.stringify(round))
  let posA = null, posB = null

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

  const getP = (pos) => pos.type === 'match'
    ? newRound.matches[pos.mi].teams[pos.ti][pos.pi]
    : newRound.sitOuts[pos.si]

  const setP = (pos, p) => {
    if (pos.type === 'match') newRound.matches[pos.mi].teams[pos.ti][pos.pi] = p
    else newRound.sitOuts[pos.si] = p
  }

  const pA = { ...getP(posA) }
  const pB = { ...getP(posB) }
  setP(posA, pB)
  setP(posB, pA)
  return newRound
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_STATE': return action.payload
    case 'SET_SESSION':
      return { ...state, session: action.payload, rounds: [], history: { partner: {}, opponent: {} }, error: null }

    case 'ADD_PLAYER': {
      const player = { ...action.payload, id: state.nextPlayerId, sitOutCount: 0, roundsPlayed: 0, status: 'active' }
      return { ...state, players: [...state.players, player], nextPlayerId: state.nextPlayerId + 1, error: null }
    }
    case 'UPDATE_PLAYER':
      return { ...state, players: state.players.map(p => p.id === action.payload.id ? { ...p, ...action.payload.updates } : p) }
    case 'REMOVE_PLAYER':
      return { ...state, players: state.players.filter(p => p.id !== action.payload) }
    case 'TOGGLE_PLAYER_STATUS':
      return { ...state, players: state.players.map(p => p.id === action.payload ? { ...p, status: p.status === 'active' ? 'resting' : 'active' } : p) }

    case 'GENERATE_FIRST_ROUND': {
      try {
        const eligible = getEligiblePlayers(state.players)
        const courts = buildCourts(state.session.courtCount)
        const algorithmPlayers = eligible.map(p => ({ id: p.id, rating: p.rating, sitOutCount: p.sitOutCount }))
        const result = generateRoundService(algorithmPlayers, courts, state.history)
        return { ...state, rounds: [{ ...result, roundNumber: 1, isConfirmed: false }], error: null }
      } catch (e) {
        return { ...state, error: e.message }
      }
    }

    case 'CONFIRM_AND_GENERATE_NEXT': {
      try {
        const currentRound = state.rounds[state.rounds.length - 1]
        const { newHistory, updatedPlayers } = applyRoundToState(currentRound, state.history, state.players)
        const confirmedRounds = state.rounds.map((r, i) =>
          i === state.rounds.length - 1 ? { ...r, isConfirmed: true } : r
        )
        const eligible = getEligiblePlayers(updatedPlayers)
        const courts = buildCourts(state.session.courtCount)
        const algorithmPlayers = eligible.map(p => ({ id: p.id, rating: p.rating, sitOutCount: p.sitOutCount }))
        const result = generateRoundService(algorithmPlayers, courts, newHistory)
        return {
          ...state, players: updatedPlayers, history: newHistory,
          rounds: [...confirmedRounds, { ...result, roundNumber: state.rounds.length + 1, isConfirmed: false }],
          error: null,
        }
      } catch (e) {
        return { ...state, error: e.message }
      }
    }

    case 'SWAP_PLAYERS': {
      const { roundIdx, playerIdA, playerIdB } = action.payload
      const rounds = [...state.rounds]
      rounds[roundIdx] = swapPlayersInRound(rounds[roundIdx], playerIdA, playerIdB)
      return { ...state, rounds }
    }

    case 'TOGGLE_BROADCAST': return { ...state, isBroadcasting: !state.isBroadcasting }
    case 'CLEAR_ERROR': return { ...state, error: null }
    case 'RESET': return initialState
    default: return state
  }
}

const STORAGE_KEY = 'social-tennis-session'

export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : initialState
    } catch { return initialState }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const actions = {
    setSession: (session) => dispatch({ type: 'SET_SESSION', payload: session }),
    addPlayer: (player) => dispatch({ type: 'ADD_PLAYER', payload: player }),
    updatePlayer: (id, updates) => dispatch({ type: 'UPDATE_PLAYER', payload: { id, updates } }),
    removePlayer: (id) => dispatch({ type: 'REMOVE_PLAYER', payload: id }),
    togglePlayerStatus: (id) => dispatch({ type: 'TOGGLE_PLAYER_STATUS', payload: id }),
    generateFirstRound: () => dispatch({ type: 'GENERATE_FIRST_ROUND' }),
    confirmAndGenerateNext: () => dispatch({ type: 'CONFIRM_AND_GENERATE_NEXT' }),
    swapPlayers: (roundIdx, playerIdA, playerIdB) =>
      dispatch({ type: 'SWAP_PLAYERS', payload: { roundIdx, playerIdA, playerIdB } }),
    toggleBroadcast: () => dispatch({ type: 'TOGGLE_BROADCAST' }),
    clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
    reset: () => dispatch({ type: 'RESET' }),
    getPlayerById: (id) => state.players.find(p => p.id === id),
  }

  return (
    <SessionContext.Provider value={{ state, ...actions }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
