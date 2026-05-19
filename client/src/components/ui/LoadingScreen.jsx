export default function LoadingScreen({ message = 'Loading your session data', detail = 'Fetching the latest players, sessions, and rounds from the server.' }) {
  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen w-full items-center justify-center bg-green-950/45 px-4 py-6 backdrop-blur-sm animate-fade-in sm:px-6">
      <div className="w-full max-w-md rounded-2xl border border-green-100 bg-white px-6 py-8 text-center shadow-sm sm:px-8">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-50">
          <div className="setmaker-loader" aria-hidden="true">
            <span className="setmaker-loader__ball" />
            <span className="setmaker-loader__shadow" />
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-black text-green-900">{message}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500">{detail}</p>
        <div className="mt-6 flex items-center justify-center gap-2" aria-label="Loading">
          <span className="h-2 w-2 rounded-full bg-coral-500 setmaker-loader__dot" />
          <span className="h-2 w-2 rounded-full bg-green-700 setmaker-loader__dot setmaker-loader__dot--delay-1" />
          <span className="h-2 w-2 rounded-full bg-amber-400 setmaker-loader__dot setmaker-loader__dot--delay-2" />
        </div>
      </div>
    </div>
  )
}
