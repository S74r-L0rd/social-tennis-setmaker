export const DEFAULT_MATCH_DURATION_MINUTES = 90

export function getSessionScheduleIssue(sessionConfig) {
  if (!sessionConfig) return 'No session selected. Return to Setup and create a session.'
  if (!sessionConfig.sessionDate) return 'Session date is missing. Return to Setup and update this session.'
  if (!sessionConfig.sessionPeriod) return 'Session period is missing. Return to Setup and update this session.'
  if (typeof sessionConfig.startDateTime !== 'string' || !sessionConfig.startDateTime.trim()) {
    return 'Match start time is missing. Return to Setup and update this session.'
  }

  const startDate = new Date(sessionConfig.startDateTime)
  if (Number.isNaN(startDate.getTime())) {
    return 'Match start time is invalid. Return to Setup and update this session.'
  }

  const matchDurationMinutes = Number(sessionConfig.matchDurationMinutes)
  if (!Number.isFinite(matchDurationMinutes) || matchDurationMinutes <= 0) {
    return 'Match duration is invalid. Return to Setup and update this session.'
  }

  const breakIntervalMinutes = Number(sessionConfig.breakIntervalMinutes)
  if (!Number.isFinite(breakIntervalMinutes) || breakIntervalMinutes < 0) {
    return 'Break interval is invalid. Return to Setup and update this session.'
  }

  const hasSelectedCourts = Array.isArray(sessionConfig.courts) && sessionConfig.courts.length > 0
  const hasCourtCount = Number.isInteger(sessionConfig.courtCount) && sessionConfig.courtCount > 0
  if (!hasSelectedCourts && !hasCourtCount) {
    return 'No courts selected. Return to Setup and update this session.'
  }

  return null
}

export function getRoundStartDate(sessionConfig, roundNumber) {
  if (!Number.isInteger(roundNumber) || roundNumber < 1) return null
  if (getSessionScheduleIssue(sessionConfig)) return null

  const startDate = new Date(sessionConfig.startDateTime)

  const matchDurationMinutes = Number(sessionConfig.matchDurationMinutes ?? DEFAULT_MATCH_DURATION_MINUTES)
  const breakIntervalMinutes = Number(sessionConfig.breakIntervalMinutes ?? 0)
  const roundOffsetMinutes = (roundNumber - 1) * (matchDurationMinutes + breakIntervalMinutes)

  return new Date(startDate.getTime() + roundOffsetMinutes * 60 * 1000)
}

export function getRoundSessionState(sessionConfig, roundNumber, now = new Date()) {
  const roundStartDate = getRoundStartDate(sessionConfig, roundNumber)
  if (!roundStartDate) return null

  const matchDurationMinutes = Number(sessionConfig?.matchDurationMinutes ?? DEFAULT_MATCH_DURATION_MINUTES)
  const roundEndDate = new Date(roundStartDate.getTime() + matchDurationMinutes * 60 * 1000)

  if (now < roundStartDate) return 'upcoming'
  if (now >= roundEndDate) return 'completed'
  return 'in_progress'
}

export function formatRoundStartLabel(sessionConfig, roundNumber) {
  const roundStartDate = getRoundStartDate(sessionConfig, roundNumber)
  if (!roundStartDate) return null

  return roundStartDate.toLocaleString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatRoundStatusLabel(sessionConfig, roundNumber, now = new Date()) {
  const sessionState = getRoundSessionState(sessionConfig, roundNumber, now)
  if (sessionState === 'completed') return 'Completed'
  if (sessionState === 'in_progress') return 'In Progress'

  const startLabel = formatRoundStartLabel(sessionConfig, roundNumber)
  return startLabel ? `Starts at ${startLabel}` : 'Start time unavailable'
}

export function formatBroadcastRoundStatusLabel(sessionConfig, roundNumber, now = new Date()) {
  const sessionState = getRoundSessionState(sessionConfig, roundNumber, now)
  const startLabel = formatRoundStartLabel(sessionConfig, roundNumber)

  if (!startLabel) return 'Start time unavailable'
  if (sessionState === 'completed') return `Completed · Started at ${startLabel}`
  if (sessionState === 'in_progress') return `In Progress · Started at ${startLabel}`
  return `Upcoming · Starts at ${startLabel}`
}
