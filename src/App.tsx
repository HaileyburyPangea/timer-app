import { useState, useEffect, useRef, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Team = 'A' | 'B'

interface Phase {
  id: string
  label: string
  sublabel: string
  duration: number // seconds
  actor: 'presenting' | 'commenting' | 'judge'
  isConfer?: boolean // shorter, quieter interstitial
}

function buildRound(presenter: Team, commentator: Team): Phase[] {
  return [
    {
      id: 'prep',
      label: 'Preparation',
      sublabel: `Team ${presenter} prepares their position`,
      duration: 2 * 60,
      actor: 'presenting',
      isConfer: true,
    },
    {
      id: 'presentation',
      label: 'Presentation',
      sublabel: `Team ${presenter} presents their position`,
      duration: 5 * 60,
      actor: 'presenting',
    },
    {
      id: 'confer-commentary',
      label: 'Discussion',
      sublabel: `Team ${commentator} confers before commentary`,
      duration: 1 * 60,
      actor: 'commenting',
      isConfer: true,
    },
    {
      id: 'commentary',
      label: 'Commentary',
      sublabel: `Team ${commentator} analyses and engages`,
      duration: 3 * 60,
      actor: 'commenting',
    },
    {
      id: 'confer-response',
      label: 'Discussion',
      sublabel: `Team ${presenter} confers before response`,
      duration: 1 * 60,
      actor: 'presenting',
      isConfer: true,
    },
    {
      id: 'response',
      label: 'Response',
      sublabel: `Team ${presenter} responds to commentary`,
      duration: 3 * 60,
      actor: 'presenting',
    },
    {
      id: 'questioning',
      label: 'Judge Q&A',
      sublabel: `Judge questions Team ${presenter}`,
      duration: 7 * 60,
      actor: 'judge',
    },
  ]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60)
  const s = Math.abs(seconds) % 60
  const sign = seconds < 0 ? '−' : ''
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── CoinToss ──────────────────────────────────────────────────────────────────

function CoinToss({ onDecide }: { onDecide: (first: Team) => void }) {
  const [flipping, setFlipping] = useState(false)
  const [result, setResult] = useState<Team | null>(null)

  const flip = () => {
    if (flipping) return
    setFlipping(true)
    setResult(null)
    setTimeout(() => {
      const winner: Team = Math.random() < 0.5 ? 'A' : 'B'
      setResult(winner)
      setFlipping(false)
    }, 1200)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-12 px-8">
      <div className="text-center">
        <p className="text-xs tracking-[0.25em] uppercase text-amber-400 mb-4 font-mono">
          Ethics Debate Timer
        </p>
        <h1 className="text-5xl font-bold text-white tracking-tight leading-none mb-3">
          Coin Toss
        </h1>
        <p className="text-slate-400 text-base max-w-sm mx-auto leading-relaxed">
          Determine which team presents first in Round 1.
        </p>
      </div>

      <div className="relative flex items-center justify-center" style={{ height: 160 }}>
        <div
          className={`w-36 h-36 rounded-full border-4 flex items-center justify-center cursor-pointer select-none transition-all duration-100 ${
            flipping
              ? 'animate-spin border-amber-400 bg-amber-400/10'
              : 'border-slate-600 bg-slate-800 hover:border-amber-400/60 hover:bg-slate-700'
          }`}
          style={{ animationDuration: flipping ? '0.25s' : undefined }}
          onClick={flip}
        >
          {result ? (
            <span className="text-4xl font-bold text-amber-400">{result}</span>
          ) : flipping ? (
            <span className="text-slate-500 text-2xl">●</span>
          ) : (
            <span className="text-slate-400 text-sm tracking-widest uppercase font-mono">flip</span>
          )}
        </div>
      </div>

      {result && (
        <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="text-slate-400 text-sm mb-2 font-mono uppercase tracking-widest">Result</p>
          <p className="text-white text-2xl font-semibold mb-1">
            Team <span className="text-amber-400">{result}</span> presents first
          </p>
          <p className="text-slate-500 text-sm mb-8">
            Team {result === 'A' ? 'B' : 'A'} will comment and then present in Round 2
          </p>
          <button
            onClick={() => onDecide(result)}
            className="px-10 py-3 bg-amber-400 text-slate-900 font-bold text-sm tracking-widest uppercase hover:bg-amber-300 transition-colors"
          >
            Begin Round 1
          </button>
        </div>
      )}

      {!result && !flipping && (
        <p className="text-slate-600 text-xs font-mono">Click the coin to flip</p>
      )}
    </div>
  )
}

// ── RoundTimer ────────────────────────────────────────────────────────────────

interface TimerProps {
  phases: Phase[]
  roundNumber: 1 | 2
  presenterTeam: Team
  commentatorTeam: Team
  onRoundComplete: () => void
}

function RoundTimer({ phases, roundNumber, presenterTeam, commentatorTeam, onRoundComplete }: TimerProps) {
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(phases[0].duration)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const phase = phases[phaseIndex]
  const isLast = phaseIndex === phases.length - 1
  const isOvertime = secondsLeft < 0

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    setRunning(false)
  }, [])

  const start = useCallback(() => {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => s - 1)
    }, 1000)
    setRunning(true)
  }, [])

  const goToPhase = useCallback((index: number) => {
    stop()
    setPhaseIndex(index)
    setSecondsLeft(phases[index].duration)
  }, [stop, phases])

  const advance = useCallback(() => {
    if (isLast) {
      stop()
      onRoundComplete()
    } else {
      goToPhase(phaseIndex + 1)
    }
  }, [stop, isLast, phaseIndex, goToPhase, onRoundComplete])

  useEffect(() => {
    if (secondsLeft < -120 && running) stop()
  }, [secondsLeft, running, stop])

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const progress = Math.max(0, secondsLeft / phase.duration)
  const R = 118
  const circumference = 2 * Math.PI * R
  const strokeDash = circumference * progress

  // Color logic: Team A = cyan, Team B = rose
  const teamColor = (team: Team) => team === 'A' ? '#22d3ee' : '#fb7185'

  const ringColor = isOvertime
    ? '#f87171'
    : phase.actor === 'judge'
    ? '#a78bfa'
    : phase.actor === 'presenting'
    ? teamColor(presenterTeam)
    : teamColor(commentatorTeam)

  const actorTextClass =
    phase.actor === 'judge'
      ? 'text-violet-400'
      : phase.actor === 'presenting'
      ? presenterTeam === 'A' ? 'text-cyan-400' : 'text-rose-400'
      : commentatorTeam === 'A' ? 'text-cyan-400' : 'text-rose-400'

  const activeTeam: Team | null =
    phase.actor === 'judge' ? null
    : phase.actor === 'presenting' ? presenterTeam
    : commentatorTeam

  const totalMinutes = Math.floor(phases.reduce((a, p) => a + p.duration, 0) / 60)

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-slate-800">
        <div>
          <p className="text-xs text-slate-600 font-mono uppercase tracking-widest mb-0.5">
            Ethics Debate Timer
          </p>
          <p className="text-white font-bold text-lg tracking-tight">
            Round {roundNumber}{' '}
            <span className="text-slate-500 font-normal text-sm">of 2</span>
          </p>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-xs font-mono uppercase tracking-widest mb-0.5 text-cyan-400">Team A</p>
            <p className="text-slate-400 text-sm">
              {presenterTeam === 'A' ? 'Presenting' : 'Commenting'}
            </p>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div className="text-right">
            <p className="text-xs font-mono uppercase tracking-widest mb-0.5 text-rose-400">Team B</p>
            <p className="text-slate-400 text-sm">
              {presenterTeam === 'B' ? 'Presenting' : 'Commenting'}
            </p>
          </div>
        </div>
      </header>

      {/* Phase strip */}
      <div className="flex border-b border-slate-800 overflow-x-auto">
        {phases.map((p, i) => {
          const isPast = i < phaseIndex
          const isCurrent = i === phaseIndex
          const isClickable = i <= phaseIndex // can go back, not forward
          return (
            <button
              key={p.id}
              disabled={!isClickable}
              onClick={() => isClickable && goToPhase(i)}
              title={i < phaseIndex ? 'Click to return to this phase' : undefined}
              className={[
                'flex-1 min-w-0 py-3 px-3 text-center border-r border-slate-800 last:border-r-0 transition-colors',
                'text-xs font-mono uppercase tracking-wider leading-tight',
                p.isConfer ? 'opacity-70' : '',
                isCurrent
                  ? 'bg-slate-800 text-white'
                  : isPast
                  ? 'text-slate-500 bg-slate-900/40 hover:bg-slate-800/60 hover:text-slate-300 cursor-pointer'
                  : 'text-slate-700 cursor-default',
              ].join(' ')}
            >
              <span className={`mr-1 ${isPast ? 'text-amber-400' : ''}`}>
                {isPast ? '✓' : `${i + 1}`}
              </span>
              <span className="whitespace-nowrap">{p.label}</span>
              <span className="ml-1.5 text-slate-600 tabular-nums">
                {p.duration >= 60 ? `${Math.floor(p.duration / 60)}m` : `${p.duration}s`}
              </span>
            </button>
          )
        })}
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8 py-10 px-8">
        {/* Phase label */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            {phase.isConfer && (
              <span className="text-xs font-mono uppercase tracking-widest text-slate-500 border border-slate-700 px-2 py-0.5">
                Confer
              </span>
            )}
            <h2 className={`font-bold tracking-tight ${phase.isConfer ? 'text-2xl text-slate-300' : 'text-3xl text-white'}`}>
              {phase.label}
            </h2>
          </div>
          <p className={`text-sm font-mono uppercase tracking-widest ${actorTextClass}`}>
            {phase.sublabel}
          </p>
        </div>

        {/* Ring + time — larger SVG, text sits outside the stroke path */}
        <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
          <svg width={280} height={280} className="absolute inset-0 rotate-[-90deg]">
            <circle cx={140} cy={140} r={R} fill="none" stroke="#1e293b" strokeWidth={phase.isConfer ? 6 : 10} />
            <circle
              cx={140}
              cy={140}
              r={R}
              fill="none"
              stroke={ringColor}
              strokeWidth={phase.isConfer ? 6 : 10}
              strokeLinecap="butt"
              strokeDasharray={`${strokeDash} ${circumference}`}
              strokeOpacity={phase.isConfer ? 0.6 : 1}
              style={{ transition: 'stroke-dasharray 0.5s linear, stroke 0.3s' }}
            />
          </svg>

          {/* Text overlay — sized to fit comfortably inside R=118 ring, i.e. diameter 236px, minus stroke = ~216px usable */}
          <div className="relative flex flex-col items-center justify-center" style={{ width: 210, height: 210 }}>
            <span
              className={`font-mono font-bold tabular-nums leading-none ${
                isOvertime ? 'text-red-400' : phase.isConfer ? 'text-slate-300' : 'text-white'
              }`}
              style={{ fontSize: '3.75rem', letterSpacing: '-0.02em' }}
            >
              {formatTime(secondsLeft)}
            </span>
            <span className={`text-xs font-mono uppercase tracking-widest mt-2 ${
              isOvertime ? 'text-red-400' : actorTextClass
            }`}>
              {isOvertime
                ? 'Overtime'
                : phase.actor === 'judge'
                ? 'Judge'
                : `Team ${activeTeam}`}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => goToPhase(phaseIndex)}
            className="px-6 py-2.5 border border-slate-700 text-slate-400 text-xs font-mono uppercase tracking-widest hover:border-slate-500 hover:text-slate-200 transition-colors"
          >
            Reset
          </button>

          <button
            onClick={running ? stop : start}
            className={`px-12 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${
              running
                ? 'bg-slate-700 text-white hover:bg-slate-600'
                : 'bg-amber-400 text-slate-900 hover:bg-amber-300'
            }`}
          >
            {running ? 'Pause' : secondsLeft === phase.duration ? 'Start' : 'Resume'}
          </button>

          <button
            onClick={advance}
            className={`px-6 py-2.5 text-xs font-mono uppercase tracking-widest transition-colors ${
              isLast
                ? 'border border-amber-400/60 text-amber-400 hover:bg-amber-400/10'
                : 'border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            }`}
          >
            {isLast
              ? roundNumber === 2 ? 'Finish' : 'End Round'
              : 'Next →'}
          </button>
        </div>

        <p className="text-slate-700 text-xs font-mono">
          {phase.duration >= 60
            ? `${Math.floor(phase.duration / 60)} minute${Math.floor(phase.duration / 60) !== 1 ? 's' : ''} allocated`
            : `${phase.duration} seconds allocated`}
        </p>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-8 py-4">
        <div className="flex items-center justify-between text-xs font-mono text-slate-600 uppercase tracking-widest">
          <span>Phase {phaseIndex + 1} / {phases.length}</span>
          <span>Total round time: {totalMinutes} min</span>
        </div>
      </footer>
    </div>
  )
}

// ── Summary ───────────────────────────────────────────────────────────────────

function Summary({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-10 px-8">
      <div className="text-center">
        <p className="text-xs tracking-[0.25em] uppercase text-amber-400 mb-4 font-mono">
          Session Complete
        </p>
        <h1 className="text-5xl font-bold text-white tracking-tight leading-none mb-4">
          Both rounds finished
        </h1>
        <p className="text-slate-400 text-base max-w-md mx-auto leading-relaxed">
          Both teams have presented, responded, and been questioned by the judge.
          The debate session is complete.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px bg-slate-800 border border-slate-800 w-full max-w-lg">
        {[
          { label: 'Preparation', value: '2 min × 2' },
          { label: 'Presentation', value: '5 min × 2' },
          { label: 'Discussion (×2)', value: '1 min × 4' },
          { label: 'Commentary', value: '3 min × 2' },
          { label: 'Response', value: '3 min × 2' },
          { label: 'Judge Q&A', value: '7 min × 2' },
        ].map(row => (
          <div key={row.label} className="bg-slate-900 px-6 py-4 flex justify-between items-center">
            <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">{row.label}</span>
            <span className="text-white text-sm font-mono">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="text-slate-500 text-xs font-mono uppercase tracking-widest">
        Total session time: 44 minutes
      </div>

      <button
        onClick={onRestart}
        className="px-10 py-3 border border-slate-700 text-slate-300 text-xs font-mono uppercase tracking-widest hover:border-amber-400/50 hover:text-amber-400 transition-colors"
      >
        New Session
      </button>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

type AppState = 'toss' | 'round1' | 'round2' | 'done'

export default function App() {
  const [state, setState] = useState<AppState>('toss')
  const [firstTeam, setFirstTeam] = useState<Team>('A')

  const handleToss = (winner: Team) => {
    setFirstTeam(winner)
    setState('round1')
  }

  const secondTeam: Team = firstTeam === 'A' ? 'B' : 'A'

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#0b0f18', color: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {state === 'toss' && <CoinToss onDecide={handleToss} />}
      {state === 'round1' && (
        <RoundTimer
          phases={buildRound(firstTeam, secondTeam)}
          roundNumber={1}
          presenterTeam={firstTeam}
          commentatorTeam={secondTeam}
          onRoundComplete={() => setState('round2')}
        />
      )}
      {state === 'round2' && (
        <RoundTimer
          phases={buildRound(secondTeam, firstTeam)}
          roundNumber={2}
          presenterTeam={secondTeam}
          commentatorTeam={firstTeam}
          onRoundComplete={() => setState('done')}
        />
      )}
      {state === 'done' && <Summary onRestart={() => setState('toss')} />}
    </div>
  )
}
