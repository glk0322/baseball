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

export interface PlayerRatings {
  contact: number
  power: number
  eye: number
  speed: number
  clutch: number
}

export interface HitterSeasonStats {
  games: number
  plateAppearances: number
  atBats: number
  hits: number
  doubles: number
  triples: number
  homeRuns: number
  runsBattedIn: number
  walks: number
  hitByPitch: number
  strikeouts: number
  stolenBases: number
  caughtStealing: number
  average: number
  onBasePercentage: number
  sluggingPercentage: number
  ops: number
  iso: number
  averageWithRunnersInScoringPosition: number
}

export interface PlayerProfile {
  id: string
  name: string
  team: string
  teamCode: string
  position: string
  bats: '좌타' | '우타' | '양타'
  archetype: string
  accent: string
  ratings: PlayerRatings
  stats: HitterSeasonStats
}
