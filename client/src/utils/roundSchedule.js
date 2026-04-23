export const DEFAULT_MATCH_DURATION_MINUTES = 90

export function getRoundStartDate(sessionConfig, roundNumber) {
  if (!sessionConfig?.startDateTime || !Number.isInteger(roundNumber) || roundNumber < 1) return null

  const startDate = new Date(sessionConfig.startDateTime)
  if (Number.isNaN(startDate.getTime())) return null

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
