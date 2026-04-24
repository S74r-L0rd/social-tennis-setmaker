const variants = {
  rating1: 'bg-sky-100 text-sky-700',
  rating2: 'bg-emerald-100 text-emerald-700',
  rating3: 'bg-amber-100 text-amber-700',
  male:    'bg-blue-100 text-blue-700',
  female:  'bg-pink-100 text-pink-700',
  active:  'bg-coral-100 text-coral-700',
  resting: 'bg-gray-100 text-gray-400',
  default: 'bg-gray-100 text-gray-600',
  warning: 'bg-amber-100 text-amber-700',
}

const RATING_LABELS = { 1: 'Lv.1', 2: 'Lv.2', 3: 'Lv.3' }
const GENDER_LABELS = { male: 'M', female: 'F' }
const STATUS_LABELS = { active: 'Active', resting: 'Resting' }

export default function Badge({ variant = 'default', children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  )
}

export function RatingBadge({ rating }) {
  return <Badge variant={`rating${rating}`}>{RATING_LABELS[rating] ?? `Lv.${rating}`}</Badge>
}

export function GenderBadge({ gender }) {
  return <Badge variant={gender}>{GENDER_LABELS[gender] ?? gender}</Badge>
}

export function StatusBadge({ status }) {
  return <Badge variant={status}>{STATUS_LABELS[status] ?? status}</Badge>
}
