import { useNavigate } from 'react-router-dom'

const FEATURES = [
  {
    title: 'Matchups in seconds',
    desc: 'Our algorithm pairs players based on skill and variety — so you never have to track who played with whom.',
    accent: '#1a4731',
  },
  {
    title: 'Broadcast instantly',
    desc: 'Players scan a QR code or follow a link to see their court assignment. Less walking, faster starts.',
    accent: '#e8503a',
  },
  {
    title: 'Flexible gender modes',
    desc: 'Mix genders evenly, keep courts gender-specific, or go fully flexible — whatever your session needs.',
    accent: '#1a4731',
  },
]

const STEPS = [
  { n: '1', title: 'Set up the session', desc: 'Create the session, choose the court count, and set the timing for each round.' },
  { n: '2', title: 'Add players', desc: 'Enter player names, ratings, and gender settings, then keep updating the list as people arrive.' },
  { n: '3', title: 'Generate the round', desc: 'Build the doubles matchups, review the court assignments, and adjust swaps if needed.' },
  { n: '4', title: 'Broadcast to players', desc: 'Open the broadcast page and share the QR code or link so everyone can check their court instantly.' },
]

function UnderlinedWord({ children }) {
  return (
    <span className="relative inline-block" style={{ color: '#e8503a' }}>
      {children}
      <span
        className="absolute left-0 bottom-0 w-full rounded-full"
        style={{ height: '3px', backgroundColor: '#e8503a', bottom: '-4px' }}
      />
    </span>
  )
}

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-24 py-12 animate-fade-in">

      {/* Hero */}
      <div className="flex flex-col items-center text-center gap-6 animate-slide-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-green-800 bg-green-50 text-xs font-black text-green-700 uppercase tracking-widest">
          Social Tennis · Doubles Scheduler
        </div>
        <h1 className="text-5xl sm:text-6xl font-black text-green-900 leading-tight max-w-2xl">
          Simple matchups,{' '}
          <UnderlinedWord>smarter</UnderlinedWord>{' '}
          sessions
        </h1>
        <p className="text-base sm:text-lg text-gray-600 max-w-2xl leading-relaxed">
          Generate fair and varied doubles matchups for your tennis sessions.
          <br />
          Manage players and organise each round with less guesswork.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => navigate('/auth')}
            className="px-8 py-4 rounded-xl text-green-900 font-black text-base border border-green-900/15 bg-white shadow-sm hover:shadow-md hover:border-green-900/30 active:scale-[0.98] transition-all duration-200"
          >
            Log In
          </button>
          <button
            onClick={() => navigate('/setup')}
            style={{ backgroundColor: '#e8503a' }}
            className="px-10 py-4 rounded-xl text-white font-black text-base shadow-sm hover:shadow-md hover:brightness-90 active:scale-[0.98] transition-all duration-200">
            Start New Session →
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="flex flex-col gap-8 animate-slide-up">
        <div className="text-center">
          <h2 className="text-3xl font-black text-green-900">
            Why organizers <UnderlinedWord>choose</UnderlinedWord> SetMaker
          </h2>
          <p className="text-base text-gray-400 mt-4">Run better social sessions — for any skill level, any group size.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="bg-white rounded-2xl shadow-sm p-7 flex flex-col gap-3 border border-gray-100 border-l-4"
              style={{ borderLeftColor: f.accent }}
            >
              <h3 className="text-lg font-black text-green-900 leading-snug">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="flex flex-col gap-8 animate-slide-up">
        <h2 className="text-3xl font-black text-green-900">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map(s => (
            <div key={s.n} className="bg-white rounded-2xl border border-green-100 shadow-sm p-6 flex flex-col gap-4">
              <span className="w-14 h-14 rounded-full bg-green-900 text-white text-2xl font-black flex items-center justify-center shadow-sm">
                {s.n}
              </span>
              <h3 className="text-base font-black text-green-900">{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
