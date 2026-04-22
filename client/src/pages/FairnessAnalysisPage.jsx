import { useEffect, useMemo, useState } from 'react'
import { useSession } from '../context/SessionContext'

const GENDER_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
]

const GROUP_OPTIONS = [
  { value: 'none', label: 'No Grouping' },
  { value: 'skill', label: 'Group by Skill' },
  { value: 'alpha', label: 'Group by Name' },
]

const PAGE_SIZE_OPTIONS = [10, 20, 50]

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'gender', label: 'Gender' },
  { key: 'rating', label: 'Skill Level' },
  { key: 'totalSitOuts', label: 'Sit Out' },
  { key: 'totalUnbalancedMatches', label: 'Unbalanced Matches' },
  { key: 'totalMatches', label: 'Total Matches' },
  { key: 'sessionCount', label: 'Sessions' },
  { key: 'commonPartnerName', label: 'Common Partner' },
]

function getSkillLabel(rating) {
  return `Lv.${rating}`
}

function getGroupLabel(player, groupMode) {
  if (groupMode === 'skill') return getSkillLabel(player.rating)
  if (groupMode === 'alpha') {
    const letter = player.name?.[0]?.toUpperCase() ?? '#'
    return /[A-Z]/.test(letter) ? letter : '#'
  }
  return 'All Players'
}

function compareValues(a, b, direction = 'asc') {
  const multiplier = direction === 'asc' ? 1 : -1

  if (typeof a === 'number' && typeof b === 'number') {
    return (a - b) * multiplier
  }

  return String(a).localeCompare(String(b)) * multiplier
}

function getSitOutRatio(player) {
  const totalRoundsSeen = player.totalMatches + player.totalSitOuts
  if (totalRoundsSeen === 0) return 0
  return player.totalSitOuts / totalRoundsSeen
}

function formatRatio(value) {
  return `${Math.round(value * 100)}%`
}

function getSitOutStatus(sitOutRatio) {
  if (sitOutRatio < 0.2) return { dotClassName: 'bg-emerald-500' }
  if (sitOutRatio < 0.4) return { dotClassName: 'bg-amber-400' }
  return { dotClassName: 'bg-red-500' }
}

function formatDecimal(value, digits = 2) {
  return value.toFixed(digits)
}

function calculateStandardDeviation(values) {
  if (values.length === 0) return 0
  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.reduce((sum, value) => sum + ((value - average) ** 2), 0) / values.length
  return Math.sqrt(variance)
}

function getSkillImbalanceRate(sessions, includedPlayerIds) {
  let totalRelevantMatches = 0
  let imbalancedMatches = 0

  for (const session of sessions) {
    for (const round of session.rounds ?? []) {
      for (const match of round.matches ?? []) {
        const allPlayers = match.teams.flat()
        const includesTrackedPlayer = allPlayers.some(player => includedPlayerIds.has(player.id))
        if (!includesTrackedPlayer) continue

        totalRelevantMatches += 1

        const [teamA, teamB] = match.teams
        const teamARating = teamA.reduce((sum, player) => sum + (player.rating ?? 0), 0)
        const teamBRating = teamB.reduce((sum, player) => sum + (player.rating ?? 0), 0)

        if (Math.abs(teamARating - teamBRating) >= 2) {
          imbalancedMatches += 1
        }
      }
    }
  }

  if (totalRelevantMatches === 0) return 0
  return imbalancedMatches / totalRelevantMatches
}

function getFairnessScore({ avgRatio, maxRatio, stdDevRatio, rangeRatio, skillImbalanceRate }) {
  const sitOutWeight = 1
  const skillImbalanceWeight = 0.5

  const normalizedScore = 100
    - (avgRatio * 30 * sitOutWeight)
    - (maxRatio * 25 * sitOutWeight)
    - (stdDevRatio * 20 * sitOutWeight)
    - (rangeRatio * 15 * sitOutWeight)
    - (skillImbalanceRate * 10 * skillImbalanceWeight)

  const score = Math.max(0, Math.min(100, Math.round(normalizedScore)))

  if (score >= 80) return { label: 'High', value: score }
  if (score >= 55) return { label: 'Medium', value: score }
  return { label: 'Low', value: score }
}

function SortButton({ active, direction, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-left text-xs font-black uppercase tracking-wide transition-colors ${
        active ? 'text-green-900' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      <span>{label}</span>
      <span className={`text-[10px] ${active ? 'text-coral-500' : 'text-gray-300'}`}>
        {active ? (direction === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  )
}

function InfoTooltip({ label, content }) {
  return (
    <span className="group relative inline-flex items-center gap-1">
      <span>{label}</span>
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[10px] font-black text-gray-500">
        !
      </span>
      <span className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-72 whitespace-pre-line rounded-xl bg-green-900 px-3 py-2 text-[11px] font-bold leading-5 text-white shadow-xl group-hover:block">
        {content}
      </span>
    </span>
  )
}

export default function FairnessAnalysisPage() {
  const { state } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState('all')
  const [groupMode, setGroupMode] = useState('none')
  const [sortBy, setSortBy] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return state.playerDatabase.filter(player => {
      if (genderFilter !== 'all' && player.gender !== genderFilter) return false
      if (!normalizedQuery) return true

      return (
        player.name.toLowerCase().includes(normalizedQuery) ||
        player.commonPartnerName.toLowerCase().includes(normalizedQuery)
      )
    }).map(player => ({
      ...player,
      sitOutRatio: getSitOutRatio(player),
    }))
  }, [state.playerDatabase, searchQuery, genderFilter])

  const sortedPlayers = useMemo(() => {
    const players = [...filteredPlayers]

    players.sort((a, b) => {
      if (groupMode !== 'none') {
        const groupComparison = compareValues(getGroupLabel(a, groupMode), getGroupLabel(b, groupMode), 'asc')
        if (groupComparison !== 0) return groupComparison
      }

      const primaryComparison = compareValues(a[sortBy], b[sortBy], sortDirection)
      if (primaryComparison !== 0) return primaryComparison

      return a.name.localeCompare(b.name)
    })

    return players
  }, [filteredPlayers, groupMode, sortBy, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sortedPlayers.length / pageSize))
  const paginatedPlayers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return sortedPlayers.slice(startIndex, startIndex + pageSize)
  }, [sortedPlayers, currentPage, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, genderFilter, groupMode, sortBy, sortDirection, pageSize])

  useEffect(() => {
    setCurrentPage(prev => Math.min(prev, totalPages))
  }, [totalPages])

  const fairnessSummary = useMemo(() => {
    if (filteredPlayers.length === 0) {
      return {
        avgSitOuts: 0,
        maxSitOuts: 0,
        avgRatio: 0,
        maxRatio: 0,
        stdDevRatio: 0,
        rangeRatio: 0,
        skillImbalanceRate: 0,
        fairnessScore: { label: 'High', value: 100 },
      }
    }

    const totalSitOuts = filteredPlayers.reduce((sum, player) => sum + player.totalSitOuts, 0)
    const avgSitOuts = totalSitOuts / filteredPlayers.length
    const maxSitOuts = Math.max(...filteredPlayers.map(player => player.totalSitOuts))
    const ratios = filteredPlayers.map(player => player.sitOutRatio)
    const avgRatio = ratios.reduce((sum, value) => sum + value, 0) / ratios.length
    const maxRatio = Math.max(...ratios)
    const minRatio = Math.min(...ratios)
    const stdDevRatio = calculateStandardDeviation(ratios)
    const rangeRatio = maxRatio - minRatio
    const includedPlayerIds = new Set(filteredPlayers.map(player => player.id))
    const skillImbalanceRate = getSkillImbalanceRate(state.sessions, includedPlayerIds)

    return {
      avgSitOuts,
      maxSitOuts,
      avgRatio,
      maxRatio,
      stdDevRatio,
      rangeRatio,
      skillImbalanceRate,
      fairnessScore: getFairnessScore({ avgRatio, maxRatio, stdDevRatio, rangeRatio, skillImbalanceRate }),
    }
  }, [filteredPlayers, state.sessions])

  function handleSort(columnKey) {
    if (sortBy === columnKey) {
      setSortDirection(current => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortBy(columnKey)
    setSortDirection(columnKey === 'name' || columnKey === 'commonPartnerName' ? 'asc' : 'desc')
  }

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-coral-500">Player History</p>
          <h1 className="mt-2 text-3xl font-black text-green-900">Fairness Dashboard</h1>
          <p className="mt-2 text-sm text-gray-500">
            Cross-session player records with search, filters, grouping, sorting, and pagination.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(280px,1fr)_180px_180px] lg:min-w-[740px]">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search by player or common partner"
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-coral-400"
            />
          </div>

          <div className="relative">
            <select
              value={groupMode}
              onChange={event => setGroupMode(event.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 text-sm text-gray-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-coral-400"
            >
              {GROUP_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
            </svg>
          </div>

          <div className="relative">
            <select
              value={pageSize}
              onChange={event => setPageSize(Number(event.target.value))}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 text-sm text-gray-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-coral-400"
            >
              {PAGE_SIZE_OPTIONS.map(option => (
                <option key={option} value={option}>
                  {option} per page
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
            </svg>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {GENDER_FILTERS.map(filter => {
          const isActive = genderFilter === filter.id
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setGenderFilter(filter.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
                isActive
                  ? 'bg-green-900 text-white'
                  : 'bg-white text-gray-500 shadow-sm hover:text-gray-700'
              }`}
            >
              {filter.label}
            </button>
          )
        })}

        <div className="ml-auto flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-gray-400">
          <span>{filteredPlayers.length} players</span>
          <span>Page {currentPage} / {totalPages}</span>
        </div>
      </div>

      <section className="mb-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm text-center">
          <p className="flex justify-center text-[11px] font-black uppercase tracking-wide text-gray-400">
            <InfoTooltip
              label="Avg sit-outs"
              content={`Average sit-outs per player: ${formatDecimal(fairnessSummary.avgSitOuts, 1)}. Sit-out ratio reference: ${formatRatio(fairnessSummary.avgRatio)}.`}
            />
          </p>
          <p className="mt-2 text-2xl font-black text-green-900">{formatDecimal(fairnessSummary.avgSitOuts, 1)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm text-center">
          <p className="flex justify-center text-[11px] font-black uppercase tracking-wide text-gray-400">
            <InfoTooltip
              label="Max sit-outs"
              content={`Highest sit-out count for any player: ${fairnessSummary.maxSitOuts}. Max sit-out ratio reference: ${formatRatio(fairnessSummary.maxRatio)}.`}
            />
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <p className="text-2xl font-black text-green-900">{fairnessSummary.maxSitOuts}</p>
            <span className={`inline-flex h-3 w-3 rounded-full ${getSitOutStatus(fairnessSummary.maxRatio).dotClassName}`} />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm text-center">
          <p className="flex justify-center text-[11px] font-black uppercase tracking-wide text-gray-400">
            <InfoTooltip
              label="Fairness score"
              content="formula: (avg sit-out ratio + max sit-out ratio + std dev + range) × 1 + skill imbalance rate × 0.5"
            />
          </p>
          <div className="mt-2 flex items-end justify-center gap-2">
            <p className="text-2xl font-black text-green-900">{fairnessSummary.fairnessScore.label}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm text-center">
          <p className="flex justify-center text-[11px] font-black uppercase tracking-wide text-gray-400">
            <InfoTooltip
              label="unbalanced matches"
              content="formula: matches with team rating gap ≥ 2 / total matches"
            />
          </p>
          <p className="mt-2 text-2xl font-black text-green-900">{formatRatio(fairnessSummary.skillImbalanceRate)}</p>
        </div>
      </section>

      {filteredPlayers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white/70 px-6 py-14 text-center text-sm text-gray-500">
          No players match your current search or filters.
        </div>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-[#f6f1ea]">
                <tr>
                  {groupMode !== 'none' && (
                    <th className="border-b border-gray-200 px-4 py-4 text-left whitespace-nowrap">
                      <span className="text-xs font-black uppercase tracking-wide text-gray-400">Group</span>
                    </th>
                  )}
                  {COLUMNS.map(column => (
                    <th key={column.key} className="border-b border-gray-200 px-4 py-4 text-left whitespace-nowrap">
                      {column.key === 'totalSitOuts' ? (
                        <div className="flex items-center gap-2">
                          <SortButton
                            label={column.label}
                            active={sortBy === column.key}
                            direction={sortDirection}
                            onClick={() => handleSort(column.key)}
                          />
                          <InfoTooltip
                            label=""
                            content={`below 20% = green
20% to below 40% = yellow
40% or above = red`}
                          />
                        </div>
                      ) : (
                        <SortButton
                          label={column.label}
                          active={sortBy === column.key}
                          direction={sortDirection}
                          onClick={() => handleSort(column.key)}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {paginatedPlayers.map((player, index) => {
                  const hasHigherThanAverageSitOuts = player.totalSitOuts > fairnessSummary.avgSitOuts
                  const sitOutStatus = getSitOutStatus(player.sitOutRatio)

                  return (
                    <tr
                      key={player.id}
                      className={
                        hasHigherThanAverageSitOuts
                          ? 'bg-red-50/70'
                          : index % 2 === 0
                          ? 'bg-white'
                          : 'bg-[#fcfaf7]'
                      }
                    >
                      {groupMode !== 'none' && (
                        <td className="border-b border-gray-100 px-4 py-4 text-sm font-bold text-coral-600 whitespace-nowrap">
                          {getGroupLabel(player, groupMode)}
                        </td>
                      )}
                      <td className="border-b border-gray-100 px-4 py-4">
                        <div className="min-w-[150px]">
                          <p className="whitespace-nowrap text-[13px] font-black text-gray-900">{player.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {hasHigherThanAverageSitOuts && (
                              <span className="text-[11px] font-black uppercase tracking-wide text-red-500">
                                Higher than average
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-4 text-[13px] font-bold capitalize text-gray-700 whitespace-nowrap">
                        {player.gender}
                      </td>
                      <td className="border-b border-gray-100 px-4 py-4 text-[13px] font-black text-green-900 whitespace-nowrap">
                        {getSkillLabel(player.rating)}
                      </td>
                      <td className="border-b border-gray-100 px-4 py-4">
                        <div className="min-w-[190px]">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex h-3 w-3 rounded-full ${sitOutStatus.dotClassName}`} />
                            <span className="text-[13px] font-bold text-gray-700 whitespace-nowrap">
                              {player.totalSitOuts} sit-out{player.totalSitOuts === 1 ? '' : 's'} ({formatRatio(player.sitOutRatio)})
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-4 text-[13px] font-bold text-gray-700 whitespace-nowrap">
                        {player.totalUnbalancedMatches}
                      </td>
                      <td className="border-b border-gray-100 px-4 py-4 text-[13px] font-bold text-gray-700 whitespace-nowrap">
                        {player.totalMatches}
                      </td>
                      <td className="border-b border-gray-100 px-4 py-4 text-[13px] font-bold text-gray-700 whitespace-nowrap">
                        {player.sessionCount}
                      </td>
                      <td className="border-b border-gray-100 px-4 py-4">
                        <div className="min-w-[170px]">
                          <p className="whitespace-nowrap text-[13px] font-bold text-gray-800">{player.commonPartnerName}</p>
                          <p className="mt-1 whitespace-nowrap text-[11px] text-gray-400">
                            {player.commonPartnerCount > 0
                              ? `${player.commonPartnerCount} rounds together`
                              : 'No partner history yet'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-200 bg-[#faf6f0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredPlayers.length)} of {filteredPlayers.length}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-all hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, index) => index + 1).slice(
                  Math.max(0, currentPage - 3),
                  Math.max(5, currentPage + 2)
                ).map(page => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`h-9 min-w-9 rounded-lg px-3 text-sm font-black transition-all ${
                      currentPage === page
                        ? 'bg-coral-500 text-white'
                        : 'bg-white text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-all hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
