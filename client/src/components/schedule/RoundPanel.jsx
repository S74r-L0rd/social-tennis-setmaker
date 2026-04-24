import CourtCard from './CourtCard'
import SitOutArea from './SitOutArea'

export default function RoundPanel({ round, isEditable, roundStartLabel = null }) {
  return (
    <div className="flex flex-col gap-4">
      {/* 對陣卡片 */}
      {round.matches.map((match, i) => (
        <CourtCard key={i} match={match} isEditable={isEditable} roundStartLabel={roundStartLabel} showRoundStart />
      ))}

      {/* 輪空區 */}
      <SitOutArea sitOuts={round.sitOuts} isEditable={isEditable} />
    </div>
  )
}
