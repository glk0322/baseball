import { describe, expect, it } from 'vitest'
import {
  advanceRunners,
  applyOutcome,
  createGame,
  gameReducer,
  gradeSwing,
  resolveContact,
  startGame,
  totalRuns,
} from './game'
import type { GameState } from './types'

function activeGame(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createGame('pro'),
    phase: 'batting',
    ...overrides,
  }
}

describe('PIXEL BALL 경기 엔진', () => {
  it('경기를 1회초 전환 화면으로 시작하고 타격 단계에 진입한다', () => {
    const started = startGame('rookie')
    expect(started.phase).toBe('halfInningTransition')
    expect(started.inning).toBe(1)
    expect(started.half).toBe('top')
    expect(gameReducer(started, { type: 'ready' }).phase).toBe('batting')
  })

  it('스트라이크 세 개를 아웃 하나로 바꾸고 타석 카운트를 초기화한다', () => {
    let state = activeGame()
    state = applyOutcome(state, 'calledStrike')
    state = applyOutcome(state, 'swingingStrike')
    state = applyOutcome(state, 'calledStrike')

    expect(state.count).toEqual({ balls: 0, strikes: 0, outs: 1 })
  })

  it('투 스트라이크 이후 파울은 스트라이크를 추가하지 않는다', () => {
    const state = activeGame({ count: { balls: 1, strikes: 2, outs: 0 } })
    expect(applyOutcome(state, 'foul').count).toEqual({ balls: 1, strikes: 2, outs: 0 })
  })

  it('만루에서 네 번째 볼은 한 점을 내고 만루를 유지한다', () => {
    const state = activeGame({
      count: { balls: 3, strikes: 1, outs: 0 },
      bases: { first: true, second: true, third: true },
    })
    const next = applyOutcome(state, 'ball')

    expect(next.bases).toEqual({ first: true, second: true, third: true })
    expect(next.count).toEqual({ balls: 0, strikes: 0, outs: 0 })
    expect(totalRuns(next, 'away')).toBe(1)
  })

  it('안타 루수만큼 주자를 진루시키고 홈런에는 타자 득점도 포함한다', () => {
    expect(advanceRunners({ first: true, second: false, third: true }, 2)).toEqual({
      bases: { first: false, second: true, third: true },
      runs: 1,
    })
    expect(advanceRunners({ first: true, second: true, third: true }, 4)).toEqual({
      bases: { first: false, second: false, third: false },
      runs: 4,
    })
  })

  it('3아웃 후 공수를 교대하고 주자와 카운트를 비운다', () => {
    const state = activeGame({ count: { balls: 2, strikes: 1, outs: 2 }, bases: { first: true, second: true, third: false } })
    const next = applyOutcome(state, 'out')

    expect(next.phase).toBe('halfInningTransition')
    expect(next.half).toBe('bottom')
    expect(next.count).toEqual({ balls: 0, strikes: 0, outs: 0 })
    expect(next.bases).toEqual({ first: false, second: false, third: false })
  })

  it('3회초 뒤 홈팀이 앞서면 3회말을 생략한다', () => {
    const state = activeGame({
      inning: 3,
      half: 'top',
      count: { balls: 0, strikes: 0, outs: 2 },
      innings: [{ away: 0, home: 1 }, { away: 0, home: 0 }, { away: 0, home: 0 }],
    })
    const next = applyOutcome(state, 'out')

    expect(next.phase).toBe('gameOver')
    expect(next.result).toBe('loss')
  })

  it('3회말 홈팀이 앞서는 순간 끝내기로 종료한다', () => {
    const state = activeGame({
      phase: 'pitching',
      inning: 3,
      half: 'bottom',
      bases: { first: false, second: false, third: true },
      innings: [{ away: 0, home: 0 }, { away: 0, home: 0 }, { away: 0, home: 0 }],
    })
    const next = applyOutcome(state, 'single', 'good')

    expect(next.phase).toBe('gameOver')
    expect(next.result).toBe('loss')
    expect(totalRuns(next, 'home')).toBe(1)
  })

  it('3회말이 동점으로 끝나면 무승부 처리한다', () => {
    const state = activeGame({
      phase: 'pitching',
      inning: 3,
      half: 'bottom',
      count: { balls: 0, strikes: 0, outs: 2 },
      innings: [{ away: 1, home: 1 }, { away: 0, home: 0 }, { away: 0, home: 0 }],
    })
    const next = applyOutcome(state, 'out')
    expect(next.phase).toBe('gameOver')
    expect(next.result).toBe('draw')
  })
})

describe('타격 판정', () => {
  it('난이도별 시간 창과 코스 차이로 등급을 정한다', () => {
    expect(gradeSwing('pro', { x: 2, y: 2 }, { x: 2, y: 2 }, 65)).toBe('perfect')
    expect(gradeSwing('pro', { x: 2, y: 2 }, { x: 3, y: 2 }, 120)).toBe('good')
    expect(gradeSwing('pro', { x: 2, y: 2 }, { x: 3, y: 2 }, 180)).toBe('weak')
    expect(gradeSwing('allstar', { x: 2, y: 2 }, { x: 2, y: 2 }, 150)).toBe('miss')
  })

  it('고정 난수로 컨택 결과를 재현한다', () => {
    expect(resolveContact('perfect', () => 0.05)).toBe('out')
    expect(resolveContact('perfect', () => 0.75)).toBe('homeRun')
    expect(resolveContact('good', () => 0.5)).toBe('single')
    expect(resolveContact('weak', () => 0.2)).toBe('foul')
    expect(resolveContact('miss', () => 0)).toBe('swingingStrike')
  })
})
