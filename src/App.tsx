import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { PixelAudio } from './audio'
import GameCanvas from './GameCanvas'
import {
  DIFFICULTY_PRESETS,
  applyAccuracyError,
  createGame,
  gameReducer,
  gradePlayerSwing,
  isStrikeLocation,
  meterPosition,
  playerPitchDuration,
  randomCpuPitch,
  resolveAiSwing,
  resolvePlayerContact,
  totalRuns,
} from './game'
import {
  PLAYER_DATA_AS_OF,
  PLAYER_DATA_SOURCES,
  PLAYER_PROFILES,
  calculateOverall,
  findPlayer,
} from './players'
import type {
  ActivePitch,
  ContactGrade,
  Difficulty,
  GameState,
  GridPoint,
  HitEffect,
  PlayerProfile,
  PitchType,
  PlayOutcome,
} from './types'

const PITCH_LABELS: Record<PitchType, { key: string; ko: string; en: string }> = {
  fastball: { key: '1', ko: '직구', en: 'FAST' },
  curveball: { key: '2', ko: '커브', en: 'CURVE' },
  changeup: { key: '3', ko: '체인지업', en: 'CHANGE' },
}

const OUTCOME_SOUND_HITS: PlayOutcome[] = ['single', 'double', 'triple', 'homeRun', 'foul']

function RotateDeviceNotice() {
  return (
    <div className="rotate-device" role="status">
      <span aria-hidden="true">↻</span>
      <strong>휴대폰을 가로로 돌려주세요</strong>
      <p>PIXEL BALL 3는 가로 화면에 최적화되어 있습니다.</p>
    </div>
  )
}

function PixelPlayer({ team }: { team: 'stars' | 'blazers' }) {
  return (
    <div className={`pixel-player pixel-player--${team}`} aria-hidden="true">
      <span className="pixel-player__shadow" />
      <span className="pixel-player__bat" />
      <span className="pixel-player__leg pixel-player__leg--left" />
      <span className="pixel-player__leg pixel-player__leg--right" />
      <span className="pixel-player__shoe pixel-player__shoe--left" />
      <span className="pixel-player__shoe pixel-player__shoe--right" />
      <span className="pixel-player__body" />
      <span className="pixel-player__belt" />
      <span className="pixel-player__jersey-mark" />
      <span className="pixel-player__arm pixel-player__arm--left" />
      <span className="pixel-player__arm pixel-player__arm--right" />
      <span className="pixel-player__glove" />
      <span className="pixel-player__head" />
      <span className="pixel-player__hair" />
      <span className="pixel-player__cap" />
      <span className="pixel-player__cap-bill" />
      <span className="pixel-player__eye pixel-player__eye--left" />
      <span className="pixel-player__eye pixel-player__eye--right" />
      <span className="pixel-player__nose" />
      <span className="pixel-player__mouth" />
    </div>
  )
}

function DifficultyPicker({
  selected,
  onSelect,
}: {
  selected: Difficulty
  onSelect: (difficulty: Difficulty) => void
}) {
  return (
    <fieldset className="difficulty-picker">
      <legend>난이도 선택</legend>
      <div className="difficulty-options">
        {(Object.entries(DIFFICULTY_PRESETS) as Array<[Difficulty, (typeof DIFFICULTY_PRESETS)[Difficulty]]>).map(
          ([difficulty, preset], index) => (
            <button
              type="button"
              key={difficulty}
              className={selected === difficulty ? 'is-selected' : ''}
              aria-pressed={selected === difficulty}
              onClick={() => onSelect(difficulty)}
            >
              <span>0{index + 1}</span>
              <strong>{preset.label}</strong>
              <small>{preset.tagline}</small>
            </button>
          ),
        )}
      </div>
    </fieldset>
  )
}

const RATING_LABELS = {
  contact: 'CON',
  power: 'POW',
  eye: 'EYE',
  speed: 'SPD',
  clutch: 'CLT',
} as const

function PlayerPicker({
  selected,
  onSelect,
}: {
  selected: PlayerProfile
  onSelect: (playerId: string) => void
}) {
  return (
    <fieldset className="player-picker">
      <legend>
        <span>2026 대표 타자 선택</span>
        <small>{PLAYER_DATA_AS_OF} 기준 · KBO 기록 게임용 환산</small>
      </legend>
      <div className="player-options">
        {PLAYER_PROFILES.map((player) => {
          const isSelected = player.id === selected.id
          return (
            <button
              type="button"
              key={player.id}
              className={isSelected ? 'is-selected' : ''}
              aria-label={`${player.name} ${player.team} 선택`}
              aria-pressed={isSelected}
              onClick={() => onSelect(player.id)}
            >
              <i style={{ backgroundColor: player.accent }}>{player.teamCode}</i>
              <strong>{player.name}</strong>
              <small>{player.archetype}</small>
              <b>OVR {calculateOverall(player.ratings)}</b>
            </button>
          )
        })}
      </div>
      <div className="player-detail" aria-live="polite">
        <div className="player-detail__identity">
          <span style={{ backgroundColor: selected.accent }}>{selected.teamCode}</span>
          <p>
            <strong>{selected.name}</strong>
            <small>{selected.team} · {selected.position} · {selected.bats}</small>
          </p>
        </div>
        <dl className="player-season-stats">
          <div><dt>AVG</dt><dd>{selected.stats.average.toFixed(3).replace(/^0/, '')}</dd></div>
          <div><dt>OPS</dt><dd>{selected.stats.ops.toFixed(3)}</dd></div>
          <div><dt>HR</dt><dd>{selected.stats.homeRuns}</dd></div>
          <div><dt>SB</dt><dd>{selected.stats.stolenBases}</dd></div>
        </dl>
        <div className="player-ratings">
          {(Object.keys(RATING_LABELS) as Array<keyof typeof RATING_LABELS>).map((rating) => (
            <div key={rating}>
              <span>{RATING_LABELS[rating]}</span>
              <i><b style={{ width: `${selected.ratings[rating]}%` }} /></i>
              <strong>{selected.ratings[rating]}</strong>
            </div>
          ))}
        </div>
      </div>
      <a href={PLAYER_DATA_SOURCES[0]} target="_blank" rel="noreferrer">KBO 공식 기록 출처 ↗</a>
    </fieldset>
  )
}

function MenuScreen({
  difficulty,
  player,
  muted,
  onDifficulty,
  onPlayer,
  onStart,
  onMute,
}: {
  difficulty: Difficulty
  player: PlayerProfile
  muted: boolean
  onDifficulty: (difficulty: Difficulty) => void
  onPlayer: (playerId: string) => void
  onStart: () => void
  onMute: () => void
}) {
  return (
    <main className="menu-screen">
      <RotateDeviceNotice />
      <header className="menu-header">
        <a className="wordmark" href="#top" aria-label="PIXEL BALL 3 홈">
          <span className="wordmark__ball">PB</span>
          <span>
            PIXEL BALL <b>3</b>
          </span>
        </a>
        <div className="menu-header__right">
          <span className="season-tag">ARCADE SEASON · 2026</span>
          <button className="icon-button" type="button" onClick={onMute} aria-label={muted ? '효과음 켜기' : '효과음 끄기'}>
            {muted ? 'SFX OFF' : 'SFX ON'}
          </button>
        </div>
      </header>

      <section className="match-preview" aria-labelledby="game-title">
        <div className="stadium-lights stadium-lights--left" aria-hidden="true" />
        <div className="stadium-lights stadium-lights--right" aria-hidden="true" />

        <article className="team team--away">
          <div className="team__player-wrap">
            <span className="team__role">YOU</span>
            <PixelPlayer team="stars" />
          </div>
          <p>SEOUL</p>
          <h2>STARS</h2>
          <div className="team__rating" aria-label="서울 스타즈 능력치 별 4개">
            ★ ★ ★ ★ <span>★</span>
          </div>
          <dl>
            <div><dt>BAT</dt><dd>82</dd></div>
            <div><dt>RUN</dt><dd>78</dd></div>
            <div><dt>DEF</dt><dd>80</dd></div>
          </dl>
        </article>

        <div className="preview-center">
          <div className="preview-tabs" aria-hidden="true">
            <span className="is-active">MATCH PREVIEW</span>
            <span>3 INNING GAME</span>
          </div>
          <p className="preview-kicker">PIXEL PARK · CLEAR · 7M/S</p>
          <h1 id="game-title">
            THREE INNINGS.
            <br />
            <em>ONE BIG MOMENT.</em>
          </h1>
          <div className="versus" aria-label="서울 스타즈 대 부산 블레이저스">
            <span>SEO</span>
            <b>VS</b>
            <span>BSN</span>
          </div>
          <p className="preview-copy">2026 기록으로 만든 나만의 대표 타자를 선택하세요.</p>
          <PlayerPicker selected={player} onSelect={onPlayer} />
          <DifficultyPicker selected={difficulty} onSelect={onDifficulty} />
          <button className="start-button" type="button" onClick={onStart}>
            <span>PLAY MATCH</span>
            <strong>경기 시작</strong>
            <i aria-hidden="true">▶</i>
          </button>
        </div>

        <article className="team team--home">
          <div className="team__player-wrap">
            <span className="team__role">CPU</span>
            <PixelPlayer team="blazers" />
          </div>
          <p>BUSAN</p>
          <h2>BLAZERS</h2>
          <div className="team__rating" aria-label="부산 블레이저스 능력치 별 4개">
            ★ ★ ★ ★ <span>★</span>
          </div>
          <dl>
            <div><dt>BAT</dt><dd>80</dd></div>
            <div><dt>RUN</dt><dd>76</dd></div>
            <div><dt>DEF</dt><dd>83</dd></div>
          </dl>
        </article>
      </section>

      <footer className="menu-footer">
        <div><kbd>WASD</kbd><span>코스 선택</span></div>
        <div><kbd>SPACE</kbd><span>스윙 / 투구</span></div>
        <div><kbd>1 2 3</kbd><span>구종 선택</span></div>
        <div><kbd>ESC</kbd><span>일시정지</span></div>
      </footer>
    </main>
  )
}

function CountDots({ label, count, max, tone }: { label: string; count: number; max: number; tone: string }) {
  return (
    <div className="count-row">
      <b>{label}</b>
      {Array.from({ length: max }, (_, index) => (
        <i key={index} className={index < count ? `is-on is-${tone}` : ''} />
      ))}
    </div>
  )
}

function BaseDiamond({ state }: { state: GameState }) {
  return (
    <div className="base-diamond" aria-label={`1루 ${state.bases.first ? '주자 있음' : '비어 있음'}, 2루 ${state.bases.second ? '주자 있음' : '비어 있음'}, 3루 ${state.bases.third ? '주자 있음' : '비어 있음'}`}>
      <i className={`base base--second${state.bases.second ? ' is-loaded' : ''}`} />
      <i className={`base base--third${state.bases.third ? ' is-loaded' : ''}`} />
      <i className={`base base--first${state.bases.first ? ' is-loaded' : ''}`} />
      <i className="base base--home" />
    </div>
  )
}

function Scoreboard({ state }: { state: GameState }) {
  const awayTotal = totalRuns(state, 'away')
  const homeTotal = totalRuns(state, 'home')
  return (
    <header className="scoreboard">
      <div className="scoreboard__brand">
        <span>PB</span>
        <b>PIXEL BALL 3</b>
      </div>
      <div className="scoreboard__inning">
        <div className="inning-label">
          <strong>{state.inning}</strong>
          <span>{state.half === 'top' ? '▲' : '▼'}</span>
        </div>
        <table aria-label="이닝별 점수">
          <thead><tr><th>TEAM</th><th>1</th><th>2</th><th>3</th><th>R</th><th>H</th></tr></thead>
          <tbody>
            <tr className={state.half === 'top' ? 'is-active' : ''}>
              <th><span className="team-chip team-chip--stars">S</span> SEOUL</th>
              {state.innings.map((score, index) => <td key={index}>{score.away}</td>)}
              <td className="total">{awayTotal}</td><td>{state.stats.away.hits}</td>
            </tr>
            <tr className={state.half === 'bottom' ? 'is-active' : ''}>
              <th><span className="team-chip team-chip--blazers">B</span> BUSAN</th>
              {state.innings.map((score, index) => <td key={index}>{score.home}</td>)}
              <td className="total">{homeTotal}</td><td>{state.stats.home.hits}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="scoreboard__count">
        <CountDots label="B" count={state.count.balls} max={3} tone="ball" />
        <CountDots label="S" count={state.count.strikes} max={2} tone="strike" />
        <CountDots label="O" count={state.count.outs} max={2} tone="out" />
      </div>
    </header>
  )
}

function ZonePad({
  size,
  value,
  onChange,
  label,
}: {
  size: 3 | 5
  value: GridPoint
  onChange: (point: GridPoint) => void
  label: string
}) {
  return (
    <div className={`zone-pad zone-pad--${size}`} role="group" aria-label={label}>
      {Array.from({ length: size * size }, (_, index) => {
        const point = { x: index % size, y: Math.floor(index / size) }
        const selected = point.x === value.x && point.y === value.y
        const strikeCell = size === 3 || (point.x >= 1 && point.x <= 3 && point.y >= 1 && point.y <= 3)
        return (
          <button
            type="button"
            key={index}
            className={`${selected ? 'is-selected ' : ''}${strikeCell ? 'is-strike-zone' : 'is-ball-zone'}`}
            aria-label={`${label} ${point.y + 1}행 ${point.x + 1}열`}
            aria-pressed={selected}
            onClick={() => onChange(point)}
          />
        )
      })}
    </div>
  )
}

function GameResultPanel({
  state,
  player,
  onRematch,
  onMenu,
}: {
  state: GameState
  player: PlayerProfile
  onRematch: () => void
  onMenu: () => void
}) {
  const away = totalRuns(state, 'away')
  const home = totalRuns(state, 'home')
  const resultCopy = state.result === 'win' ? 'VICTORY' : state.result === 'loss' ? 'DEFEAT' : 'DRAW'
  return (
    <div className="result-backdrop">
      <section className={`result-panel result-panel--${state.result}`} aria-labelledby="result-title">
        <p className="result-eyebrow">FINAL · PIXEL PARK</p>
        <h2 id="result-title">{resultCopy}</h2>
        <p>{state.result === 'win' ? '별처럼 빛난 3이닝이었습니다.' : state.result === 'loss' ? '다음 승부는 아직 남아 있습니다.' : '한 점도 양보하지 않은 팽팽한 승부!'}</p>
        <div className="result-player">
          <span style={{ backgroundColor: player.accent }}>{player.teamCode}</span>
          <p><strong>{player.name}</strong><small>{player.archetype} · OVR {calculateOverall(player.ratings)}</small></p>
        </div>
        <div className="final-score">
          <div><span>SEOUL</span><strong>{away}</strong><small>{state.stats.away.hits} H · {state.stats.away.homeRuns} HR</small></div>
          <b>—</b>
          <div><span>BUSAN</span><strong>{home}</strong><small>{state.stats.home.hits} H · {state.stats.home.homeRuns} HR</small></div>
        </div>
        <table aria-label="최종 이닝별 점수">
          <thead><tr><th>TEAM</th><th>1</th><th>2</th><th>3</th><th>R</th></tr></thead>
          <tbody>
            <tr><th>SEOUL</th>{state.innings.map((score, index) => <td key={index}>{score.away}</td>)}<td>{away}</td></tr>
            <tr><th>BUSAN</th>{state.innings.map((score, index) => <td key={index}>{score.home}</td>)}<td>{home}</td></tr>
          </tbody>
        </table>
        <div className="result-actions">
          <button className="secondary-button" type="button" onClick={onMenu}>메인으로</button>
          <button className="primary-button" type="button" onClick={onRematch}>재경기 <span>▶</span></button>
        </div>
      </section>
    </div>
  )
}

function GameScreen({
  state,
  player,
  muted,
  activePitch,
  batAim,
  pitchTarget,
  hitEffect,
  onBatAim,
  onPitchTarget,
  onPitchType,
  onSwing,
  onThrow,
  onPause,
  onMute,
  onRematch,
  onMenu,
}: {
  state: GameState
  player: PlayerProfile
  muted: boolean
  activePitch: ActivePitch | null
  batAim: GridPoint
  pitchTarget: GridPoint
  hitEffect: HitEffect | null
  onBatAim: (point: GridPoint) => void
  onPitchTarget: (point: GridPoint) => void
  onPitchType: (pitch: PitchType) => void
  onSwing: () => void
  onThrow: () => void
  onPause: () => void
  onMute: () => void
  onRematch: () => void
  onMenu: () => void
}) {
  const actualPhase = state.phase === 'paused' ? state.resumePhase : state.phase
  const isBatting = actualPhase === 'batting'
  const isPitching = actualPhase === 'pitching'

  return (
    <main className="game-screen">
      <RotateDeviceNotice />
      <Scoreboard state={state} />
      <section className="game-stage" aria-label="경기 플레이 영역">
        <GameCanvas state={state} activePitch={activePitch} batAim={batAim} pitchTarget={pitchTarget} hitEffect={hitEffect} />

        <div className="game-toolbar">
          <button type="button" onClick={onMute} aria-label={muted ? '효과음 켜기' : '효과음 끄기'}>{muted ? 'SFX ×' : 'SFX ♪'}</button>
          <button type="button" onClick={onPause} aria-label={state.phase === 'paused' ? '경기 계속하기' : '경기 일시정지'}>{state.phase === 'paused' ? '▶' : 'Ⅱ'}</button>
        </div>

        <aside className="game-status">
          <BaseDiamond state={state} />
          <span>RUNNERS</span>
        </aside>

        {isBatting ? (
          <aside className="active-player-card" aria-label={`현재 타자 ${player.name}`}>
            <span style={{ backgroundColor: player.accent }}>{player.teamCode}</span>
            <p>
              <small>2026 SELECTED BATTER</small>
              <strong>{player.name}</strong>
              <i>{player.archetype}</i>
            </p>
            <dl>
              <div><dt>CON</dt><dd>{player.ratings.contact}</dd></div>
              <div><dt>POW</dt><dd>{player.ratings.power}</dd></div>
              <div><dt>SPD</dt><dd>{player.ratings.speed}</dd></div>
            </dl>
          </aside>
        ) : null}

        <div className="play-call" aria-live="polite">
          <strong>{state.message}</strong>
          <span>{state.subMessage}</span>
        </div>

        {(isBatting || isPitching) && state.phase !== 'paused' ? (
          <aside className={`action-panel action-panel--${isBatting ? 'batting' : 'pitching'}`}>
            <p>{isBatting ? 'HIT ZONE' : 'PITCH ZONE'} <span>{isBatting ? '3×3' : '5×5'}</span></p>
            {isBatting ? (
              <ZonePad size={3} value={batAim} onChange={onBatAim} label="타격 코스" />
            ) : (
              <ZonePad size={5} value={pitchTarget} onChange={onPitchTarget} label="투구 코스" />
            )}
            <button
              className={`action-button action-button--${isBatting ? 'swing' : 'throw'}`}
              type="button"
              onClick={isBatting ? onSwing : onThrow}
              disabled={isBatting ? !activePitch : Boolean(activePitch)}
            >
              <span>{isBatting ? (activePitch ? 'SPACE' : 'WAIT') : 'SPACE'}</span>
              <strong>{isBatting ? '스윙' : '투구'}</strong>
            </button>
          </aside>
        ) : null}

        {isPitching && state.phase !== 'paused' ? (
          <div className="pitch-selector" role="group" aria-label="구종 선택">
            {(Object.entries(PITCH_LABELS) as Array<[PitchType, (typeof PITCH_LABELS)[PitchType]]>).map(([pitch, labels]) => (
              <button key={pitch} type="button" className={state.selectedPitch === pitch ? 'is-selected' : ''} aria-pressed={state.selectedPitch === pitch} onClick={() => onPitchType(pitch)}>
                <kbd>{labels.key}</kbd><span>{labels.ko}</span><small>{labels.en}</small>
              </button>
            ))}
          </div>
        ) : null}

        {state.phase === 'halfInningTransition' ? (
          <div className="inning-transition" role="status">
            <span>{state.half === 'top' ? '▲ TOP' : '▼ BOTTOM'}</span>
            <strong>{state.message}</strong>
            <p>{state.subMessage}</p>
          </div>
        ) : null}

        {state.phase === 'paused' ? (
          <div className="pause-panel">
            <span>GAME PAUSED</span>
            <strong>잠시 멈췄습니다</strong>
            <p>호흡을 가다듬고 다시 승부하세요.</p>
            <div><button type="button" onClick={onMenu}>경기 종료</button><button type="button" onClick={onPause}>계속하기</button></div>
          </div>
        ) : null}

        {state.phase === 'gameOver' ? <GameResultPanel state={state} player={player} onRematch={onRematch} onMenu={onMenu} /> : null}
      </section>
      <footer className="game-help">
        <span><kbd>WASD</kbd> 코스 이동</span>
        <span><kbd>SPACE</kbd> {isBatting ? '스윙' : '투구'}</span>
        <span><kbd>M</kbd> 효과음</span>
        <span><kbd>ESC</kbd> 일시정지</span>
        <b>{player.name} · {DIFFICULTY_PRESETS[state.difficulty].label.toUpperCase()} MODE</b>
      </footer>
    </main>
  )
}

function playOutcomeSound(audio: PixelAudio, outcome: PlayOutcome, grade: ContactGrade | null) {
  if (outcome === 'homeRun') {
    audio.play(grade === 'perfect' ? 'perfect' : 'hit')
    window.setTimeout(() => audio.play('score'), 140)
  } else if (OUTCOME_SOUND_HITS.includes(outcome)) {
    audio.play(grade === 'perfect' ? 'perfect' : 'hit')
  } else if (outcome === 'out') {
    audio.play('catch')
  } else {
    audio.play('call')
  }
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createGame('pro'))
  const [selectedPlayerId, setSelectedPlayerId] = useState(PLAYER_PROFILES[0]!.id)
  const [muted, setMuted] = useState(false)
  const [batAim, setBatAim] = useState<GridPoint>({ x: 1, y: 1 })
  const [pitchTarget, setPitchTarget] = useState<GridPoint>({ x: 2, y: 2 })
  const [activePitch, setActivePitch] = useState<ActivePitch | null>(null)
  const [hitEffect, setHitEffect] = useState<HitEffect | null>(null)
  const stateRef = useRef(state)
  const activePitchRef = useRef(activePitch)
  const pitchIdRef = useRef(0)
  const effectIdRef = useRef(0)
  const selectedPlayer = useMemo(() => findPlayer(selectedPlayerId), [selectedPlayerId])
  const selectedPlayerRef = useRef(selectedPlayer)
  const audioRef = useRef<PixelAudio | null>(null)
  audioRef.current ??= new PixelAudio()
  stateRef.current = state
  activePitchRef.current = activePitch
  selectedPlayerRef.current = selectedPlayer

  useEffect(() => {
    const audio = audioRef.current
    return () => audio?.dispose()
  }, [])

  useEffect(() => {
    audioRef.current?.setMuted(muted)
  }, [muted])

  const clearPitch = useCallback(() => {
    activePitchRef.current = null
    setActivePitch(null)
  }, [])

  const launchPitch = useCallback((pitch: ActivePitch) => {
    activePitchRef.current = pitch
    setActivePitch(pitch)
  }, [])

  const resolvePlay = useCallback((outcome: PlayOutcome, grade: ContactGrade | null = null) => {
    const now = performance.now()
    const effect = { id: ++effectIdRef.current, grade, outcome, startedAt: now }
    setHitEffect(effect)
    clearPitch()
    playOutcomeSound(audioRef.current!, outcome, grade)
    dispatch({ type: 'outcome', outcome, grade })
  }, [clearPitch])

  useEffect(() => {
    if (state.phase !== 'halfInningTransition') return
    clearPitch()
    const timer = window.setTimeout(() => dispatch({ type: 'ready' }), 1100)
    return () => window.clearTimeout(timer)
  }, [state.phase, state.inning, state.half, clearPitch])

  useEffect(() => {
    if (state.phase !== 'batting' || activePitch) return
    const timer = window.setTimeout(() => {
      if (stateRef.current.phase !== 'batting' || activePitchRef.current) return
      const cpuPitch = randomCpuPitch()
      const pitch: ActivePitch = {
        id: ++pitchIdRef.current,
        owner: 'cpu',
        type: cpuPitch.type,
        location: cpuPitch.location,
        startTime: performance.now(),
        duration: playerPitchDuration(
          stateRef.current.difficulty,
          cpuPitch.type,
          selectedPlayerRef.current.ratings.eye,
        ),
      }
      launchPitch(pitch)
      audioRef.current?.play('pitch')
    }, 700)
    return () => window.clearTimeout(timer)
  }, [state.phase, state.count.balls, state.count.strikes, state.count.outs, state.inning, activePitch, launchPitch])

  useEffect(() => {
    if (!activePitch) return
    const remaining = Math.max(0, activePitch.startTime + activePitch.duration + 90 - performance.now())
    const timer = window.setTimeout(() => {
      const current = activePitchRef.current
      if (!current || current.id !== activePitch.id) return
      if (current.owner === 'cpu') {
        resolvePlay(isStrikeLocation(current.location) ? 'calledStrike' : 'ball')
      } else {
        const meter = meterPosition(current.startTime, DIFFICULTY_PRESETS[stateRef.current.difficulty].meterPeriod)
        const accuracy = 1 - Math.abs(meter - 0.5) * 2
        const result = resolveAiSwing(stateRef.current, current.location, accuracy)
        resolvePlay(result.outcome, result.grade)
      }
    }, remaining)
    return () => window.clearTimeout(timer)
  }, [activePitch, resolvePlay])

  useEffect(() => {
    if (state.phase === 'batting' || state.phase === 'pitching' || state.phase === 'paused') return
    clearPitch()
  }, [state.phase, clearPitch])

  const handleStart = useCallback(() => {
    setBatAim({ x: 1, y: 1 })
    setPitchTarget({ x: 2, y: 2 })
    setHitEffect(null)
    audioRef.current?.play('start')
    dispatch({ type: 'start', difficulty: stateRef.current.difficulty })
  }, [])

  const handleSwing = useCallback(() => {
    const pitch = activePitchRef.current
    if (stateRef.current.phase !== 'batting' || !pitch || pitch.owner !== 'cpu') return
    activePitchRef.current = null
    setActivePitch(null)
    audioRef.current?.play('swing')
    const timingDelta = performance.now() - pitch.startTime - pitch.duration
    const aim = { x: batAim.x + 1, y: batAim.y + 1 }
    const runnersInScoringPosition = stateRef.current.bases.second || stateRef.current.bases.third
    const ratings = selectedPlayerRef.current.ratings
    const grade = gradePlayerSwing(
      stateRef.current.difficulty,
      aim,
      pitch.location,
      timingDelta,
      ratings,
      runnersInScoringPosition,
    )
    const outcome = resolvePlayerContact(grade, ratings, runnersInScoringPosition)
    resolvePlay(outcome, grade)
  }, [batAim, resolvePlay])

  const handleThrow = useCallback(() => {
    if (stateRef.current.phase !== 'pitching' || activePitchRef.current) return
    const now = performance.now()
    const preset = DIFFICULTY_PRESETS[stateRef.current.difficulty]
    const position = meterPosition(now, preset.meterPeriod)
    const accuracy = 1 - Math.abs(position - 0.5) * 2
    const location = applyAccuracyError(pitchTarget, accuracy)
    const type = stateRef.current.selectedPitch
    const duration = type === 'fastball' ? 560 : type === 'curveball' ? 720 : 820
    launchPitch({
      id: ++pitchIdRef.current,
      owner: 'player',
      type,
      location,
      startTime: now,
      duration,
    })
    audioRef.current?.play('pitch')
  }, [pitchTarget, launchPitch])

  const handlePause = useCallback(() => {
    const current = stateRef.current
    if (current.phase === 'batting' || current.phase === 'pitching') clearPitch()
    dispatch({ type: 'togglePause' })
  }, [clearPitch])

  const handleMute = useCallback(() => setMuted((value) => !value), [])

  const moveAim = useCallback((dx: number, dy: number) => {
    const phase = stateRef.current.phase
    if (phase === 'batting') {
      setBatAim((point) => ({ x: Math.max(0, Math.min(2, point.x + dx)), y: Math.max(0, Math.min(2, point.y + dy)) }))
    } else if (phase === 'pitching') {
      setPitchTarget((point) => ({ x: Math.max(0, Math.min(4, point.x + dx)), y: Math.max(0, Math.min(4, point.y + dy)) }))
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (key === 'm') {
        event.preventDefault()
        handleMute()
        return
      }
      if (key === 'escape' && stateRef.current.phase !== 'menu' && stateRef.current.phase !== 'gameOver' && stateRef.current.phase !== 'halfInningTransition') {
        event.preventDefault()
        handlePause()
        return
      }
      if (stateRef.current.phase !== 'batting' && stateRef.current.phase !== 'pitching') return
      if (key === 'arrowleft' || key === 'a') { event.preventDefault(); moveAim(-1, 0) }
      else if (key === 'arrowright' || key === 'd') { event.preventDefault(); moveAim(1, 0) }
      else if (key === 'arrowup' || key === 'w') { event.preventDefault(); moveAim(0, -1) }
      else if (key === 'arrowdown' || key === 's') { event.preventDefault(); moveAim(0, 1) }
      else if (key === ' ' && !event.repeat) {
        event.preventDefault()
        if (stateRef.current.phase === 'batting') handleSwing()
        else handleThrow()
      } else if (stateRef.current.phase === 'pitching' && ['1', '2', '3'].includes(key)) {
        const pitches: PitchType[] = ['fastball', 'curveball', 'changeup']
        dispatch({ type: 'selectPitch', pitch: pitches[Number(key) - 1] ?? 'fastball' })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleMute, handlePause, handleSwing, handleThrow, moveAim])

  const menuProps = useMemo(() => ({
    difficulty: state.difficulty,
    player: selectedPlayer,
    muted,
    onDifficulty: (difficulty: Difficulty) => dispatch({ type: 'chooseDifficulty', difficulty }),
    onPlayer: setSelectedPlayerId,
    onStart: handleStart,
    onMute: handleMute,
  }), [state.difficulty, selectedPlayer, muted, handleStart, handleMute])

  if (state.phase === 'menu') return <MenuScreen {...menuProps} />

  return (
    <GameScreen
      state={state}
      player={selectedPlayer}
      muted={muted}
      activePitch={activePitch}
      batAim={batAim}
      pitchTarget={pitchTarget}
      hitEffect={hitEffect}
      onBatAim={setBatAim}
      onPitchTarget={setPitchTarget}
      onPitchType={(pitch) => dispatch({ type: 'selectPitch', pitch })}
      onSwing={handleSwing}
      onThrow={handleThrow}
      onPause={handlePause}
      onMute={handleMute}
      onRematch={handleStart}
      onMenu={() => dispatch({ type: 'menu' })}
    />
  )
}
