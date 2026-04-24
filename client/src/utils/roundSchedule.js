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
