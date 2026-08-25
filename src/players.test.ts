import { describe, expect, it } from 'vitest'
import {
  gradePlayerSwing,
  playerPitchDuration,
  resolvePlayerContact,
} from './game'
import {
  PLAYER_DATA_AS_OF,
  PLAYER_PROFILES,
  calculateOverall,
  findPlayer,
} from './players'

describe('2026 KBO 선수 능력치', () => {
  it('기준일과 다섯 명의 정적 스냅샷을 제공한다', () => {
    expect(PLAYER_DATA_AS_OF).toBe('2026-08-24')
    expect(PLAYER_PROFILES).toHaveLength(5)
    expect(PLAYER_PROFILES.every((player) => player.stats.plateAppearances > 400)).toBe(true)
  })

  it('기록 성향이 능력치와 종합점수에 반영된다', () => {
    const austin = findPlayer('austin-dean-2026')
    const choi = findPlayer('choi-won-joon-2026')

    expect(austin.stats.ops).toBe(1.054)
    expect(austin.ratings.power).toBe(99)
    expect(choi.stats.stolenBases).toBe(22)
    expect(choi.ratings.speed).toBe(96)
    expect(calculateOverall(austin.ratings)).toBe(88)
  })

  it('컨택과 선구안이 좋은 타자는 더 넓은 타이밍 창을 얻는다', () => {
    const reyes = findPlayer('victor-reyes-2026')
    expect(
      gradePlayerSwing(
        'allstar',
        { x: 2, y: 2 },
        { x: 2, y: 2 },
        105,
        reyes.ratings,
      ),
    ).toBe('good')
  })

  it('선구안은 투구 인지 시간을, 주력은 추가 진루 확률을 높인다', () => {
    const park = findPlayer('park-sung-han-2026')
    const reyes = findPlayer('victor-reyes-2026')
    const choi = findPlayer('choi-won-joon-2026')
    const rolls = [0.5, 0]

    expect(playerPitchDuration('pro', 'fastball', park.ratings.eye))
      .toBeGreaterThan(playerPitchDuration('pro', 'fastball', reyes.ratings.eye))
    expect(resolvePlayerContact('good', choi.ratings, false, () => rolls.shift() ?? 0))
      .toBe('double')
  })
})
