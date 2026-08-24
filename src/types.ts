export type Difficulty = 'rookie' | 'pro' | 'allstar'

export type PitchType = 'fastball' | 'curveball' | 'changeup'

export type ContactGrade = 'perfect' | 'good' | 'weak' | 'miss'

export type PlayOutcome =
  | 'ball'
  | 'calledStrike'
  | 'swingingStrike'
  | 'foul'
  | 'out'
  | 'single'
  | 'double'
  | 'triple'
  | 'homeRun'

export type GamePhase =
  | 'menu'
  | 'halfInningTransition'
  | 'batting'
  | 'pitching'
  | 'paused'
  | 'gameOver'

export type GameResult = 'win' | 'loss' | 'draw' | null

export interface GridPoint {
  x: number
  y: number
}

export interface Count {
  balls: number
  strikes: number
  outs: number
}

export interface Bases {
  first: boolean
  second: boolean
  third: boolean
}

export interface InningScore {
  away: number
  home: number
}

export interface TeamStats {
  hits: number
  homeRuns: number
}

export interface GameStats {
  away: TeamStats
  home: TeamStats
}

export interface GameState {
  phase: GamePhase
  resumePhase: 'batting' | 'pitching' | null
  difficulty: Difficulty
  inning: number
  half: 'top' | 'bottom'
  innings: InningScore[]
  count: Count
  bases: Bases
  stats: GameStats
  selectedPitch: PitchType
  message: string
  subMessage: string
  lastOutcome: PlayOutcome | null
  contactGrade: ContactGrade | null
  result: GameResult
}

export interface DifficultyPreset {
  label: string
  tagline: string
  pitchDuration: number
  perfectWindow: number
  contactWindow: number
  aiContact: number
  meterPeriod: number
}

export interface ActivePitch {
  id: number
  owner: 'cpu' | 'player'
  type: PitchType
  location: GridPoint
  startTime: number
  duration: number
}

export interface HitEffect {
  id: number
  grade: ContactGrade | null
  outcome: PlayOutcome
  startedAt: number
}
