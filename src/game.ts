import type {
  Bases,
  ContactGrade,
  Difficulty,
  DifficultyPreset,
  GameResult,
  GameState,
  GridPoint,
  PlayerRatings,
  PlayOutcome,
} from './types'

export const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyPreset> = {
  rookie: {
    label: '루키',
    tagline: '공을 오래 보고 크게 휘둘러요',
    pitchDuration: 1300,
    perfectWindow: 90,
    contactWindow: 180,
    aiContact: 0.45,
    meterPeriod: 1600,
  },
  pro: {
    label: '프로',
    tagline: '딱 좋은 속도의 진짜 승부',
    pitchDuration: 1000,
    perfectWindow: 70,
    contactWindow: 140,
    aiContact: 0.6,
    meterPeriod: 1250,
  },
  allstar: {
    label: '올스타',
    tagline: '한순간도 방심할 수 없어요',
    pitchDuration: 780,
    perfectWindow: 50,
    contactWindow: 100,
    aiContact: 0.75,
    meterPeriod: 950,
  },
}

export const EMPTY_BASES: Bases = {
  first: false,
  second: false,
  third: false,
}

const OUTCOME_MESSAGES: Record<PlayOutcome, [string, string]> = {
  ball: ['BALL', '존을 벗어났습니다'],
  calledStrike: ['STRIKE', '좋은 공을 지켜봤어요'],
  swingingStrike: ['SWING & MISS', '배트가 허공을 갈랐습니다'],
  foul: ['FOUL', '아슬아슬하게 빗나갔습니다'],
  out: ['OUT', '수비가 깔끔하게 처리합니다'],
  single: ['BASE HIT!', '1루타! 주자들이 움직입니다'],
  double: ['DOUBLE!', '외야를 가르는 2루타!'],
  triple: ['TRIPLE!', '단숨에 3루까지 달립니다!'],
  homeRun: ['HOME RUN!', '담장을 넘겼습니다!'],
}

export function createGame(difficulty: Difficulty = 'pro'): GameState {
  return {
    phase: 'menu',
    resumePhase: null,
    difficulty,
    inning: 1,
    half: 'top',
    innings: Array.from({ length: 3 }, () => ({ away: 0, home: 0 })),
    count: { balls: 0, strikes: 0, outs: 0 },
    bases: { ...EMPTY_BASES },
    stats: {
      away: { hits: 0, homeRuns: 0 },
      home: { hits: 0, homeRuns: 0 },
    },
    selectedPitch: 'fastball',
    message: 'PLAY BALL!',
    subMessage: '서울 스타즈의 선공입니다',
    lastOutcome: null,
    contactGrade: null,
    result: null,
  }
}

export function startGame(difficulty: Difficulty): GameState {
  return {
    ...createGame(difficulty),
    phase: 'halfInningTransition',
    message: '1회초',
    subMessage: 'SEOUL STARS 공격',
  }
}

export function totalRuns(state: GameState, side: 'away' | 'home'): number {
  return state.innings.reduce((sum, inning) => sum + inning[side], 0)
}

export function isStrikeLocation(location: GridPoint): boolean {
  return location.x >= 1 && location.x <= 3 && location.y >= 1 && location.y <= 3
}

export function pitchDuration(
  difficulty: Difficulty,
  pitchType: GameState['selectedPitch'],
): number {
  const base = DIFFICULTY_PRESETS[difficulty].pitchDuration
  if (pitchType === 'fastball') return base * 0.9
  if (pitchType === 'changeup') return base * 1.18
  return base * 1.05
}

export function playerPitchDuration(
  difficulty: Difficulty,
  pitchType: GameState['selectedPitch'],
  eye: number,
): number {
  const readingBoost = Math.max(0.96, Math.min(1.06, 1 + (eye - 84) * 0.003))
  return pitchDuration(difficulty, pitchType) * readingBoost
}

export function meterPosition(time: number, period: number): number {
  const progress = (time % period) / period
  return progress <= 0.5 ? progress * 2 : (1 - progress) * 2
}

export function gradeSwing(
  difficulty: Difficulty,
  aim: GridPoint,
  pitchLocation: GridPoint,
  timingDelta: number,
): ContactGrade {
  const preset = DIFFICULTY_PRESETS[difficulty]
  const distance = Math.max(
    Math.abs(aim.x - pitchLocation.x),
    Math.abs(aim.y - pitchLocation.y),
  )
  const timing = Math.abs(timingDelta)

  if (distance === 0 && timing <= preset.perfectWindow) return 'perfect'
  if (distance <= 1 && timing <= preset.contactWindow) return 'good'
  if (distance <= 1 && timing <= preset.contactWindow * 1.45) return 'weak'
  return 'miss'
}

export function gradePlayerSwing(
  difficulty: Difficulty,
  aim: GridPoint,
  pitchLocation: GridPoint,
  timingDelta: number,
  ratings: PlayerRatings,
  runnersInScoringPosition = false,
): ContactGrade {
  const preset = DIFFICULTY_PRESETS[difficulty]
  const distance = Math.max(
    Math.abs(aim.x - pitchLocation.x),
    Math.abs(aim.y - pitchLocation.y),
  )
  const clutchBoost = runnersInScoringPosition ? (ratings.clutch - 80) * 0.002 : 0
  const windowScale = Math.max(
    0.9,
    Math.min(1.24, 1 + (ratings.contact - 84) * 0.008 + (ratings.eye - 84) * 0.003 + clutchBoost),
  )
  const timing = Math.abs(timingDelta)

  if (distance === 0 && timing <= preset.perfectWindow * windowScale) return 'perfect'
  if (distance <= 1 && timing <= preset.contactWindow * windowScale) return 'good'
  if (distance <= 1 && timing <= preset.contactWindow * 1.45 * windowScale) return 'weak'
  return 'miss'
}

function weightedOutcome(
  entries: Array<[PlayOutcome, number]>,
  rng: () => number,
): PlayOutcome {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  const roll = Math.max(0, Math.min(0.999999, rng())) * total
  let cursor = 0

  for (const [outcome, weight] of entries) {
    cursor += weight
    if (roll < cursor) return outcome
  }

  return entries.at(-1)?.[0] ?? 'out'
}

export function resolveContact(
  grade: ContactGrade,
  rng: () => number = Math.random,
): PlayOutcome {
  if (grade === 'miss') return 'swingingStrike'
  if (grade === 'perfect') {
    return weightedOutcome(
      [
        ['out', 0.1],
        ['single', 0.3],
        ['double', 0.22],
        ['triple', 0.08],
        ['homeRun', 0.3],
      ],
      rng,
    )
  }
  if (grade === 'good') {
    return weightedOutcome(
      [
        ['out', 0.45],
        ['single', 0.37],
        ['double', 0.13],
        ['triple', 0.02],
        ['homeRun', 0.03],
      ],
      rng,
    )
  }
  return weightedOutcome(
    [
      ['foul', 0.55],
      ['out', 0.35],
      ['single', 0.1],
    ],
    rng,
  )
}

export function resolvePlayerContact(
  grade: ContactGrade,
  ratings: PlayerRatings,
  runnersInScoringPosition = false,
  rng: () => number = Math.random,
): PlayOutcome {
  if (grade === 'miss') return 'swingingStrike'

  const contact = (ratings.contact - 84) / 100
  const power = (ratings.power - 84) / 100
  const eye = (ratings.eye - 84) / 100
  const clutch = runnersInScoringPosition ? Math.max(0, ratings.clutch - 80) / 250 : 0
  let outcome: PlayOutcome

  if (grade === 'perfect') {
    outcome = weightedOutcome(
      [
        ['out', Math.max(0.025, 0.1 - contact * 0.42 - clutch * 0.35)],
        ['single', Math.max(0.12, 0.3 + contact * 0.36 - power * 0.18)],
        ['double', Math.max(0.08, 0.22 + power * 0.3)],
        ['triple', 0.08],
        ['homeRun', Math.max(0.12, 0.3 + power * 0.48 + clutch * 0.24)],
      ],
      rng,
    )
  } else if (grade === 'good') {
    outcome = weightedOutcome(
      [
        ['out', Math.max(0.22, 0.45 - contact * 0.75 - clutch * 0.45)],
        ['single', Math.max(0.22, 0.37 + contact * 0.52 - power * 0.12)],
        ['double', Math.max(0.06, 0.13 + power * 0.3)],
        ['triple', 0.02],
        ['homeRun', Math.max(0.01, 0.03 + power * 0.34 + clutch * 0.12)],
      ],
      rng,
    )
  } else {
    outcome = weightedOutcome(
      [
        ['foul', Math.max(0.38, 0.55 + eye * 0.36)],
        ['out', Math.max(0.2, 0.35 - contact * 0.45 - clutch * 0.18)],
        ['single', Math.max(0.05, 0.1 + contact * 0.24)],
      ],
      rng,
    )
  }

  const stretchChance = Math.max(0, ratings.speed - 80) / 125
  if (outcome === 'single' && rng() < stretchChance) return 'double'
  if (outcome === 'double' && ratings.speed > 90 && rng() < stretchChance * 0.65) return 'triple'
  return outcome
}

export function resolveAiSwing(
  state: GameState,
  pitchLocation: GridPoint,
  accuracy: number,
  rng: () => number = Math.random,
): { outcome: PlayOutcome; grade: ContactGrade | null } {
  const strike = isStrikeLocation(pitchLocation)
  const chaseChance = state.difficulty === 'rookie' ? 0.34 : state.difficulty === 'pro' ? 0.23 : 0.14
  const swingChance = strike ? 0.84 : chaseChance

  if (rng() > swingChance) {
    return { outcome: strike ? 'calledStrike' : 'ball', grade: null }
  }

  const edgePitch = pitchLocation.x === 1 || pitchLocation.x === 3 || pitchLocation.y === 1 || pitchLocation.y === 3
  const contactChance = Math.max(
    0.15,
    DIFFICULTY_PRESETS[state.difficulty].aiContact - (edgePitch ? 0.1 : 0) - accuracy * 0.08,
  )

  if (rng() > contactChance) {
    return { outcome: 'swingingStrike', grade: 'miss' }
  }

  const qualityRoll = rng() + accuracy * 0.12
  const grade: ContactGrade = qualityRoll < 0.1 ? 'perfect' : qualityRoll < 0.62 ? 'good' : 'weak'
  return { outcome: resolveContact(grade, rng), grade }
}

export function randomCpuPitch(
  rng: () => number = Math.random,
): { type: GameState['selectedPitch']; location: GridPoint } {
  const pitchTypes: GameState['selectedPitch'][] = ['fastball', 'curveball', 'changeup']
  const type = pitchTypes[Math.floor(rng() * pitchTypes.length)] ?? 'fastball'
  const inZone = rng() < 0.78

  if (inZone) {
    return {
      type,
      location: {
        x: 1 + Math.floor(rng() * 3),
        y: 1 + Math.floor(rng() * 3),
      },
    }
  }

  const side = Math.floor(rng() * 4)
  if (side === 0) return { type, location: { x: 0, y: 1 + Math.floor(rng() * 3) } }
  if (side === 1) return { type, location: { x: 4, y: 1 + Math.floor(rng() * 3) } }
  if (side === 2) return { type, location: { x: 1 + Math.floor(rng() * 3), y: 0 } }
  return { type, location: { x: 1 + Math.floor(rng() * 3), y: 4 } }
}

export function applyAccuracyError(
  target: GridPoint,
  accuracy: number,
  rng: () => number = Math.random,
): GridPoint {
  const spread = accuracy >= 0.75 ? 0 : accuracy >= 0.4 ? 1 : 2
  if (spread === 0) return { ...target }

  const offset = () => Math.floor(rng() * (spread * 2 + 1)) - spread
  return {
    x: Math.max(0, Math.min(4, target.x + offset())),
    y: Math.max(0, Math.min(4, target.y + offset())),
  }
}

function walkRunners(bases: Bases): { bases: Bases; runs: number } {
  if (!bases.first) {
    return { bases: { ...bases, first: true }, runs: 0 }
  }

  if (!bases.second) {
    return { bases: { ...bases, first: true, second: true }, runs: 0 }
  }

  if (!bases.third) {
    return { bases: { first: true, second: true, third: true }, runs: 0 }
  }

  return { bases: { first: true, second: true, third: true }, runs: 1 }
}

export function advanceRunners(
  bases: Bases,
  hitBases: 1 | 2 | 3 | 4,
): { bases: Bases; runs: number } {
  const occupied = [bases.first, bases.second, bases.third]
  const next = [false, false, false]
  let runs = hitBases === 4 ? 1 : 0

  occupied.forEach((hasRunner, index) => {
    if (!hasRunner) return
    const destination = index + hitBases
    if (destination >= 3) runs += 1
    else next[destination] = true
  })

  if (hitBases < 4) next[hitBases - 1] = true

  return {
    bases: { first: next[0], second: next[1], third: next[2] },
    runs,
  }
}

function withRuns(state: GameState, runs: number): GameState {
  if (runs === 0) return state
  const innings = state.innings.map((score) => ({ ...score }))
  const score = innings[state.inning - 1]
  if (!score) return state
  score[state.half === 'top' ? 'away' : 'home'] += runs
  return { ...state, innings }
}

function gameResult(state: GameState): GameResult {
  const away = totalRuns(state, 'away')
  const home = totalRuns(state, 'home')
  if (away > home) return 'win'
  if (home > away) return 'loss'
  return 'draw'
}

function finishGame(state: GameState, message?: string): GameState {
  const result = gameResult(state)
  const labels: Record<Exclude<GameResult, null>, string> = {
    win: 'SEOUL STARS 승리!',
    loss: 'BUSAN BLAZERS 승리',
    draw: '무승부',
  }
  return {
    ...state,
    phase: 'gameOver',
    result,
    message: message ?? labels[result ?? 'draw'],
    subMessage: '3이닝 승부가 끝났습니다',
  }
}

function endHalfInning(state: GameState): GameState {
  if (state.half === 'top') {
    if (state.inning === 3 && totalRuns(state, 'home') > totalRuns(state, 'away')) {
      return finishGame(state)
    }
    return {
      ...state,
      phase: 'halfInningTransition',
      half: 'bottom',
      count: { balls: 0, strikes: 0, outs: 0 },
      bases: { ...EMPTY_BASES },
      message: `${state.inning}회말`,
      subMessage: 'BUSAN BLAZERS 공격',
    }
  }

  if (state.inning === 3) return finishGame(state)

  return {
    ...state,
    phase: 'halfInningTransition',
    inning: state.inning + 1,
    half: 'top',
    count: { balls: 0, strikes: 0, outs: 0 },
    bases: { ...EMPTY_BASES },
    message: `${state.inning + 1}회초`,
    subMessage: 'SEOUL STARS 공격',
  }
}

function registerOut(state: GameState): GameState {
  const outs = state.count.outs + 1
  if (outs >= 3) {
    return endHalfInning({
      ...state,
      count: { balls: 0, strikes: 0, outs },
      bases: { ...state.bases },
    })
  }
  return {
    ...state,
    count: { balls: 0, strikes: 0, outs },
  }
}

function resetAtBat(state: GameState): GameState {
  return {
    ...state,
    count: { ...state.count, balls: 0, strikes: 0 },
  }
}

export function applyOutcome(
  state: GameState,
  outcome: PlayOutcome,
  grade: ContactGrade | null = null,
): GameState {
  if (state.phase !== 'batting' && state.phase !== 'pitching') return state

  const [message, subMessage] = OUTCOME_MESSAGES[outcome]
  let next: GameState = {
    ...state,
    message,
    subMessage,
    lastOutcome: outcome,
    contactGrade: grade,
  }

  if (outcome === 'ball') {
    const balls = state.count.balls + 1
    if (balls < 4) return { ...next, count: { ...state.count, balls } }
    const walked = walkRunners(state.bases)
    next = withRuns({ ...next, bases: walked.bases }, walked.runs)
    next = resetAtBat(next)
  } else if (outcome === 'calledStrike' || outcome === 'swingingStrike') {
    const strikes = state.count.strikes + 1
    if (strikes < 3) return { ...next, count: { ...state.count, strikes } }
    next = registerOut(next)
  } else if (outcome === 'foul') {
    return {
      ...next,
      count: {
        ...state.count,
        strikes: Math.min(2, state.count.strikes + 1),
      },
    }
  } else if (outcome === 'out') {
    next = registerOut(next)
  } else {
    const hitBases = outcome === 'single' ? 1 : outcome === 'double' ? 2 : outcome === 'triple' ? 3 : 4
    const advanced = advanceRunners(state.bases, hitBases)
    const side = state.half === 'top' ? 'away' : 'home'
    const stats = {
      away: { ...state.stats.away },
      home: { ...state.stats.home },
    }
    stats[side].hits += 1
    if (outcome === 'homeRun') stats[side].homeRuns += 1
    next = withRuns({ ...next, bases: advanced.bases, stats }, advanced.runs)
    next = resetAtBat(next)
  }

  if (
    next.phase !== 'gameOver' &&
    next.inning === 3 &&
    next.half === 'bottom' &&
    totalRuns(next, 'home') > totalRuns(next, 'away')
  ) {
    return finishGame(next, '끝내기! BUSAN BLAZERS 승리')
  }

  return next
}

export type GameAction =
  | { type: 'chooseDifficulty'; difficulty: Difficulty }
  | { type: 'start'; difficulty: Difficulty }
  | { type: 'ready' }
  | { type: 'outcome'; outcome: PlayOutcome; grade?: ContactGrade | null }
  | { type: 'selectPitch'; pitch: GameState['selectedPitch'] }
  | { type: 'togglePause' }
  | { type: 'menu' }

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'chooseDifficulty':
      return { ...state, difficulty: action.difficulty }
    case 'start':
      return startGame(action.difficulty)
    case 'ready':
      if (state.phase !== 'halfInningTransition') return state
      return {
        ...state,
        phase: state.half === 'top' ? 'batting' : 'pitching',
        message: state.half === 'top' ? 'READY TO HIT' : 'TAKE THE MOUND',
        subMessage: state.half === 'top' ? '코스를 고르고 공을 기다리세요' : '구종과 코스를 선택하세요',
      }
    case 'outcome':
      return applyOutcome(state, action.outcome, action.grade ?? null)
    case 'selectPitch':
      return { ...state, selectedPitch: action.pitch }
    case 'togglePause':
      if (state.phase === 'batting' || state.phase === 'pitching') {
        return { ...state, resumePhase: state.phase, phase: 'paused' }
      }
      if (state.phase === 'paused' && state.resumePhase) {
        return { ...state, phase: state.resumePhase, resumePhase: null }
      }
      return state
    case 'menu':
      return createGame(state.difficulty)
    default:
      return state
  }
}
