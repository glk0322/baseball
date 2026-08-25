import { useEffect, useRef } from 'react'
import { DIFFICULTY_PRESETS, meterPosition } from './game'
import type { ActivePitch, GameState, GridPoint, HitEffect } from './types'

interface GameCanvasProps {
  state: GameState
  activePitch: ActivePitch | null
  batAim: GridPoint
  pitchTarget: GridPoint
  hitEffect: HitEffect | null
}

const W = 384
const H = 216

const COLORS = {
  navy: '#08142e',
  navy2: '#112548',
  blue: '#2257d6',
  blueLight: '#5f8cff',
  coral: '#f0524f',
  coralDark: '#9d2f3c',
  yellow: '#ffd447',
  cream: '#fff3d4',
  sky: '#78cce2',
  skyLight: '#beeef1',
  grass: '#238a58',
  grass2: '#177048',
  dirt: '#c98c59',
  dirtLight: '#e3b47c',
  white: '#fffaf0',
  ink: '#17213c',
}

function rect(
  context: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.fillStyle = color
  context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height))
}

function text(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  color = COLORS.white,
  size = 8,
  align: CanvasTextAlign = 'left',
) {
  context.fillStyle = color
  context.font = `800 ${size}px ui-monospace, monospace`
  context.textAlign = align
  context.textBaseline = 'top'
  context.fillText(value, Math.round(x), Math.round(y))
}

function drawCloud(context: CanvasRenderingContext2D, x: number, y: number) {
  rect(context, COLORS.skyLight, x + 6, y, 18, 4)
  rect(context, COLORS.skyLight, x, y + 4, 32, 6)
  rect(context, COLORS.white, x + 6, y + 2, 22, 5)
}

function drawStadium(context: CanvasRenderingContext2D, time: number) {
  rect(context, COLORS.sky, 0, 0, W, 83)
  drawCloud(context, 28, 18)
  drawCloud(context, 158, 9)
  drawCloud(context, 313, 25)

  rect(context, COLORS.navy2, 0, 57, W, 33)
  rect(context, COLORS.navy, 0, 62, W, 4)
  rect(context, '#d5dfe6', 0, 76, W, 4)

  const crowdColors = [COLORS.coral, COLORS.yellow, COLORS.blueLight, COLORS.cream, '#5fd5a0']
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 48; column += 1) {
      const index = (row * 17 + column * 7) % crowdColors.length
      const bounce = Math.sin(time / 420 + column) > 0.85 ? -1 : 0
      rect(context, crowdColors[index] ?? COLORS.cream, column * 8 + (row % 2) * 3, 67 + row * 4 + bounce, 3, 2)
    }
  }

  rect(context, COLORS.grass, 0, 88, W, 128)
  for (let stripe = 0; stripe < 10; stripe += 1) {
    if (stripe % 2 === 0) rect(context, COLORS.grass2, stripe * 44 - 22, 88, 22, 128)
  }

  context.fillStyle = COLORS.dirt
  context.beginPath()
  context.moveTo(192, 89)
  context.lineTo(353, 216)
  context.lineTo(31, 216)
  context.closePath()
  context.fill()
  context.fillStyle = COLORS.grass
  context.beginPath()
  context.moveTo(192, 100)
  context.lineTo(318, 216)
  context.lineTo(66, 216)
  context.closePath()
  context.fill()

  rect(context, COLORS.dirtLight, 180, 91, 24, 8)
  rect(context, COLORS.white, 187, 94, 10, 2)

  rect(context, COLORS.navy, 162, 34, 60, 27)
  rect(context, COLORS.yellow, 165, 37, 54, 3)
  text(context, 'PIXEL PARK', 192, 43, COLORS.cream, 7, 'center')
  text(context, '3 INNING', 192, 51, COLORS.blueLight, 5, 'center')

  rect(context, '#dce7e2', 17, 43, 3, 22)
  rect(context, '#dce7e2', 365, 43, 3, 22)
  rect(context, COLORS.yellow, 9, 38, 18, 3)
  rect(context, COLORS.yellow, 357, 38, 18, 3)
}

function drawPitcher(
  context: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  colors: { cap: string; jersey: string },
  scale: number,
  time: number,
) {
  const bob = Math.round(Math.sin(time / 220)) * scale
  drawPixelPlayer(context, x, groundY + bob, colors, scale, 'pitcher', false, time)
}

function drawBatter(
  context: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  colors: { cap: string; jersey: string },
  scale: number,
  time: number,
  flipped = false,
) {
  drawPixelPlayer(context, x, groundY, colors, scale, 'batter', flipped, time)
}

type PixelPlayerRole = 'pitcher' | 'batter'

function drawPixelBat(
  context: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  scale: number,
  direction: number,
  time: number,
) {
  const swingFrame = Math.sin(time / 110) > 0.94 ? 2 : 0
  for (let step = 0; step < 9; step += 1) {
    const batX = x - direction * (10 + step * 1.35 + swingFrame) * scale
    const batY = groundY - (20 + step * 2.15 + swingFrame) * scale
    rect(context, COLORS.ink, batX, batY, 4 * scale, 4 * scale)
    rect(context, step > 6 ? '#f0bd69' : '#d99852', batX + scale, batY + scale, 2 * scale, 2 * scale)
  }
}

function drawPixelPlayer(
  context: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  colors: { cap: string; jersey: string },
  scale: number,
  role: PixelPlayerRole,
  flipped: boolean,
  time: number,
) {
  const direction = flipped ? -1 : 1
  const skin = '#f2ad79'
  const skinLight = '#ffc391'
  const skinShade = '#d98258'
  const uniformShade = colors.jersey === COLORS.coral ? COLORS.coralDark : '#153c9d'
  const uniformLight = colors.jersey === COLORS.coral ? '#ff7b69' : COLORS.blueLight
  const stride = role === 'pitcher' && Math.sin(time / 260) > 0.72 ? scale : 0

  rect(context, 'rgba(8,20,46,.24)', x - 13 * scale, groundY - 2 * scale, 27 * scale, 4 * scale)
  if (role === 'batter') drawPixelBat(context, x, groundY, scale, direction, time)

  // Square shoes, striped socks and short legs.
  rect(context, COLORS.ink, x - 8 * scale - stride, groundY - 6 * scale, 8 * scale, 6 * scale)
  rect(context, colors.jersey, x - 7 * scale - stride, groundY - 5 * scale, 6 * scale, 3 * scale)
  rect(context, COLORS.cream, x - 6 * scale - stride, groundY - 2 * scale, 6 * scale, scale)
  rect(context, COLORS.ink, x + scale + stride, groundY - 6 * scale, 8 * scale, 6 * scale)
  rect(context, colors.jersey, x + 2 * scale + stride, groundY - 5 * scale, 6 * scale, 3 * scale)
  rect(context, COLORS.cream, x + 2 * scale + stride, groundY - 2 * scale, 6 * scale, scale)

  rect(context, COLORS.ink, x - 7 * scale - stride, groundY - 13 * scale, 6 * scale, 8 * scale)
  rect(context, COLORS.cream, x - 5 * scale - stride, groundY - 12 * scale, 3 * scale, 6 * scale)
  rect(context, uniformLight, x - 5 * scale - stride, groundY - 8 * scale, 3 * scale, 2 * scale)
  rect(context, COLORS.ink, x + 2 * scale + stride, groundY - 13 * scale, 6 * scale, 8 * scale)
  rect(context, COLORS.cream, x + 3 * scale + stride, groundY - 12 * scale, 3 * scale, 6 * scale)
  rect(context, uniformLight, x + 3 * scale + stride, groundY - 8 * scale, 3 * scale, 2 * scale)

  // Oversized block jersey with a dark outline and a two-tone hem.
  rect(context, COLORS.ink, x - 10 * scale, groundY - 25 * scale, 20 * scale, 14 * scale)
  rect(context, colors.jersey, x - 8 * scale, groundY - 23 * scale, 16 * scale, 10 * scale)
  rect(context, uniformLight, x - 7 * scale, groundY - 22 * scale, 3 * scale, 7 * scale)
  rect(context, uniformShade, x - 8 * scale, groundY - 16 * scale, 16 * scale, 3 * scale)
  rect(context, COLORS.yellow, x - 7 * scale, groundY - 13 * scale, 14 * scale, scale)
  rect(context, COLORS.cream, x - scale, groundY - 21 * scale, 2 * scale, 5 * scale)

  // Chunky arms with one glove/hand posed toward the plate.
  const armLift = role === 'pitcher' ? 3 * scale : 0
  rect(context, COLORS.ink, x - 13 * scale, groundY - 23 * scale - armLift, 6 * scale, 12 * scale)
  rect(context, colors.jersey, x - 12 * scale, groundY - 22 * scale - armLift, 4 * scale, 5 * scale)
  rect(context, skin, x - 12 * scale, groundY - 17 * scale - armLift, 4 * scale, 5 * scale)
  rect(context, skinLight, x - 11 * scale, groundY - 16 * scale - armLift, scale, 3 * scale)

  rect(context, COLORS.ink, x + 7 * scale, groundY - 23 * scale, 6 * scale, 12 * scale)
  rect(context, colors.jersey, x + 8 * scale, groundY - 22 * scale, 4 * scale, 5 * scale)
  rect(context, skin, x + 8 * scale, groundY - 17 * scale, 4 * scale, 5 * scale)
  rect(context, skinShade, x + 11 * scale, groundY - 16 * scale, scale, 3 * scale)

  if (role === 'pitcher') {
    rect(context, COLORS.ink, x - 15 * scale, groundY - 25 * scale - armLift, 6 * scale, 7 * scale)
    rect(context, '#8d5b36', x - 14 * scale, groundY - 24 * scale - armLift, 4 * scale, 5 * scale)
    rect(context, '#604027', x - 11 * scale, groundY - 22 * scale - armLift, scale, 3 * scale)
  }

  // Large square face, stepped hair, cap and bill.
  rect(context, COLORS.ink, x - 10 * scale, groundY - 39 * scale, 20 * scale, 17 * scale)
  rect(context, skin, x - 8 * scale, groundY - 37 * scale, 16 * scale, 13 * scale)
  rect(context, skinLight, x - 7 * scale, groundY - 36 * scale, 3 * scale, 10 * scale)
  rect(context, skinShade, x - 8 * scale, groundY - 26 * scale, 16 * scale, 2 * scale)
  rect(context, COLORS.ink, x - 8 * scale, groundY - 38 * scale, 16 * scale, 4 * scale)
  rect(context, COLORS.ink, x - 8 * scale, groundY - 35 * scale, 3 * scale, 5 * scale)
  rect(context, COLORS.ink, x + 6 * scale, groundY - 35 * scale, 2 * scale, 4 * scale)

  rect(context, COLORS.ink, x - 11 * scale, groundY - 44 * scale, 21 * scale, 8 * scale)
  rect(context, colors.cap, x - 9 * scale, groundY - 42 * scale, 17 * scale, 5 * scale)
  rect(context, uniformLight, x - 7 * scale, groundY - 42 * scale, 4 * scale, 2 * scale)
  rect(context, COLORS.ink, x + direction * 6 * scale, groundY - 38 * scale, direction * 7 * scale, 3 * scale)
  rect(context, colors.cap, x + direction * 6 * scale, groundY - 37 * scale, direction * 6 * scale, scale)

  const nearEyeX = x + direction * 2 * scale
  const farEyeX = x - direction * 5 * scale
  rect(context, COLORS.ink, nearEyeX, groundY - 32 * scale, 2 * scale, 3 * scale)
  rect(context, COLORS.cream, nearEyeX, groundY - 32 * scale, scale, scale)
  rect(context, COLORS.ink, farEyeX, groundY - 32 * scale, 2 * scale, 3 * scale)
  rect(context, COLORS.cream, farEyeX, groundY - 32 * scale, scale, scale)
  rect(context, skinShade, x + direction * scale, groundY - 29 * scale, 2 * scale, scale)
  rect(context, COLORS.ink, x - 2 * scale, groundY - 27 * scale, 4 * scale, 2 * scale)
  rect(context, COLORS.coral, x - scale, groundY - 27 * scale, 2 * scale, scale)
}

function zoneGeometry(mode: 'batting' | 'pitching') {
  return mode === 'batting'
    ? { x: 229, y: 113, cell: 7 }
    : { x: 250, y: 84, cell: 7 }
}

function drawZone(
  context: CanvasRenderingContext2D,
  mode: 'batting' | 'pitching',
  marker: GridPoint,
) {
  const zone = zoneGeometry(mode)
  rect(context, 'rgba(8,20,46,.35)', zone.x - 2, zone.y - 2, zone.cell * 5 + 4, zone.cell * 5 + 4)
  context.strokeStyle = 'rgba(255,255,255,.35)'
  context.lineWidth = 1
  for (let index = 0; index <= 5; index += 1) {
    context.beginPath()
    context.moveTo(zone.x + index * zone.cell, zone.y)
    context.lineTo(zone.x + index * zone.cell, zone.y + zone.cell * 5)
    context.stroke()
    context.beginPath()
    context.moveTo(zone.x, zone.y + index * zone.cell)
    context.lineTo(zone.x + zone.cell * 5, zone.y + index * zone.cell)
    context.stroke()
  }
  context.strokeStyle = COLORS.yellow
  context.lineWidth = 2
  context.strokeRect(zone.x + zone.cell, zone.y + zone.cell, zone.cell * 3, zone.cell * 3)
  context.strokeStyle = mode === 'batting' ? COLORS.blueLight : COLORS.coral
  context.strokeRect(
    zone.x + marker.x * zone.cell + 1,
    zone.y + marker.y * zone.cell + 1,
    zone.cell - 2,
    zone.cell - 2,
  )
}

function drawBall(
  context: CanvasRenderingContext2D,
  state: GameState,
  activePitch: ActivePitch,
  now: number,
) {
  const progress = Math.max(0, Math.min(1, (now - activePitch.startTime) / activePitch.duration))
  const eased = progress * progress * (3 - 2 * progress)
  const mode = activePitch.owner === 'cpu' ? 'batting' : 'pitching'
  const zone = zoneGeometry(mode)
  const endX = zone.x + activePitch.location.x * zone.cell + zone.cell / 2
  const endY = zone.y + activePitch.location.y * zone.cell + zone.cell / 2
  const startX = mode === 'batting' ? 192 : 91
  const startY = mode === 'batting' ? 100 : 146
  let x = startX + (endX - startX) * eased
  let y = startY + (endY - startY) * eased
  if (activePitch.type === 'curveball') x += Math.sin(progress * Math.PI) * 9
  if (activePitch.type === 'changeup') y -= Math.sin(progress * Math.PI) * 5

  const size = Math.max(2, Math.round(2 + progress * 3))
  rect(context, 'rgba(255,255,255,.35)', x - 8, y, 6, 2)
  rect(context, COLORS.white, x, y, size, size)
  rect(context, COLORS.coral, x + size - 2, y + 1, 1, Math.max(1, size - 2))

  if (state.phase === 'paused') {
    rect(context, 'rgba(8,20,46,.72)', 0, 0, W, H)
  }
}

function drawMeter(context: CanvasRenderingContext2D, state: GameState, now: number) {
  if (state.phase !== 'pitching') return
  const position = meterPosition(now, DIFFICULTY_PRESETS[state.difficulty].meterPeriod)
  const x = 130
  const y = 195
  rect(context, COLORS.navy, x - 2, y - 2, 124, 10)
  rect(context, COLORS.coral, x, y, 34, 6)
  rect(context, COLORS.yellow, x + 34, y, 18, 6)
  rect(context, '#5fe0a3', x + 52, y, 16, 6)
  rect(context, COLORS.yellow, x + 68, y, 18, 6)
  rect(context, COLORS.coral, x + 86, y, 34, 6)
  const cursorX = x + position * 120
  rect(context, COLORS.white, cursorX - 2, y - 4, 4, 14)
  text(context, 'ACCURACY', x - 4, y - 10, COLORS.cream, 5)
}

function drawEffect(context: CanvasRenderingContext2D, effect: HitEffect, now: number) {
  const elapsed = now - effect.startedAt
  if (elapsed > 720) return
  const alpha = 1 - elapsed / 720
  context.globalAlpha = alpha
  const color = effect.grade === 'perfect' || effect.outcome === 'homeRun' ? COLORS.yellow : COLORS.white
  const label = effect.grade === 'perfect' ? 'PERFECT!' : effect.grade === 'good' ? 'GOOD!' : effect.outcome === 'homeRun' ? 'HOME RUN!' : ''
  if (label) {
    text(context, label, 192, 102 - elapsed / 30, color, 14, 'center')
  }
  for (let index = 0; index < 12; index += 1) {
    const angle = (Math.PI * 2 * index) / 12
    const distance = elapsed / 15
    rect(
      context,
      index % 2 === 0 ? COLORS.yellow : COLORS.coral,
      246 + Math.cos(angle) * distance,
      128 + Math.sin(angle) * distance,
      3,
      3,
    )
  }
  context.globalAlpha = 1
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  activePitch: ActivePitch | null,
  batAim: GridPoint,
  pitchTarget: GridPoint,
  effect: HitEffect | null,
  now: number,
) {
  context.clearRect(0, 0, W, H)
  drawStadium(context, now)
  const actualPhase = state.phase === 'paused' ? state.resumePhase : state.phase

  if (actualPhase === 'pitching') {
    drawPitcher(context, 91, 178, { cap: COLORS.blue, jersey: COLORS.blue }, 2, now)
    drawBatter(context, 303, 150, { cap: COLORS.coral, jersey: COLORS.coral }, 1.5, now, true)
    drawZone(context, 'pitching', pitchTarget)
    drawMeter(context, { ...state, phase: 'pitching' }, now)
    text(context, 'YOU ARE PITCHING', 12, 96, COLORS.yellow, 7)
  } else {
    drawPitcher(context, 192, 112, { cap: COLORS.coral, jersey: COLORS.coral }, 1, now)
    drawBatter(context, 75, 193, { cap: COLORS.blue, jersey: COLORS.blue }, 2.15, now)
    drawZone(context, 'batting', { x: batAim.x + 1, y: batAim.y + 1 })
    text(context, 'YOU ARE BATTING', 12, 96, COLORS.yellow, 7)
  }

  if (activePitch) drawBall(context, state, activePitch, now)
  if (effect) drawEffect(context, effect, now)

  if (state.phase === 'paused') {
    rect(context, 'rgba(8,20,46,.76)', 0, 0, W, H)
    text(context, 'PAUSED', 192, 91, COLORS.yellow, 18, 'center')
    text(context, 'ESC TO RESUME', 192, 114, COLORS.cream, 7, 'center')
  }
}

export default function GameCanvas({
  state,
  activePitch,
  batAim,
  pitchTarget,
  hitEffect,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const propsRef = useRef({ state, activePitch, batAim, pitchTarget, hitEffect })
  propsRef.current = { state, activePitch, batAim, pitchTarget, hitEffect }

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.imageSmoothingEnabled = false
    let frame = 0

    const render = (now: number) => {
      const current = propsRef.current
      drawScene(
        context,
        current.state,
        current.activePitch,
        current.batAim,
        current.pitchTarget,
        current.hitEffect,
        now,
      )
      frame = requestAnimationFrame(render)
    }

    frame = requestAnimationFrame(render)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      width={W}
      height={H}
      aria-label="픽셀 야구 경기 장면"
    />
  )
}
