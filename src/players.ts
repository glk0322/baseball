import type { PlayerProfile, PlayerRatings } from './types'

export const PLAYER_DATA_AS_OF = '2026-08-24'

export const PLAYER_DATA_SOURCES = [
  'https://www.koreabaseball.com/Record/Player/HitterBasic/Basic1.aspx',
  'https://www.koreabaseball.com/Record/Player/HitterBasic/Basic2.aspx',
  'https://www.koreabaseball.com/Record/Player/HitterBasic/Detail1.aspx',
] as const

export const PLAYER_PROFILES: PlayerProfile[] = [
  {
    id: 'koo-ja-wook-2026',
    name: '구자욱',
    team: '삼성 라이온즈',
    teamCode: 'SAM',
    position: '외야수',
    bats: '좌타',
    archetype: '밸런스 히터',
    accent: '#3d78ff',
    ratings: { contact: 94, power: 88, eye: 88, speed: 76, clutch: 91 },
    stats: {
      games: 92, plateAppearances: 403, atBats: 346, hits: 123,
      doubles: 21, triples: 4, homeRuns: 14, runsBattedIn: 84,
      walks: 48, hitByPitch: 4, strikeouts: 58, stolenBases: 5,
      caughtStealing: 1, average: 0.355, onBasePercentage: 0.435,
      sluggingPercentage: 0.561, ops: 0.996, iso: 0.205,
      averageWithRunnersInScoringPosition: 0.396,
    },
  },
  {
    id: 'victor-reyes-2026',
    name: '레이예스',
    team: '롯데 자이언츠',
    teamCode: 'LOT',
    position: '외야수',
    bats: '양타',
    archetype: '정교한 해결사',
    accent: '#ef4050',
    ratings: { contact: 96, power: 82, eye: 83, speed: 58, clutch: 93 },
    stats: {
      games: 110, plateAppearances: 485, atBats: 439, hits: 156,
      doubles: 29, triples: 2, homeRuns: 13, runsBattedIn: 79,
      walks: 41, hitByPitch: 2, strikeouts: 52, stolenBases: 1,
      caughtStealing: 1, average: 0.355, onBasePercentage: 0.410,
      sluggingPercentage: 0.519, ops: 0.929, iso: 0.164,
      averageWithRunnersInScoringPosition: 0.405,
    },
  },
  {
    id: 'choi-won-joon-2026',
    name: '최원준',
    team: 'KT 위즈',
    teamCode: 'KT',
    position: '외야수',
    bats: '좌타',
    archetype: '스피드 리드오프',
    accent: '#8f99ad',
    ratings: { contact: 94, power: 76, eye: 88, speed: 96, clutch: 82 },
    stats: {
      games: 104, plateAppearances: 493, atBats: 427, hits: 148,
      doubles: 27, triples: 3, homeRuns: 8, runsBattedIn: 58,
      walks: 54, hitByPitch: 6, strikeouts: 67, stolenBases: 22,
      caughtStealing: 8, average: 0.347, onBasePercentage: 0.424,
      sluggingPercentage: 0.480, ops: 0.904, iso: 0.133,
      averageWithRunnersInScoringPosition: 0.343,
    },
  },
  {
    id: 'park-sung-han-2026',
    name: '박성한',
    team: 'SSG 랜더스',
    teamCode: 'SSG',
    position: '유격수',
    bats: '좌타',
    archetype: '클러치 테이블세터',
    accent: '#e83445',
    ratings: { contact: 93, power: 67, eye: 96, speed: 73, clutch: 98 },
    stats: {
      games: 114, plateAppearances: 499, atBats: 423, hits: 143,
      doubles: 26, triples: 2, homeRuns: 4, runsBattedIn: 58,
      walks: 73, hitByPitch: 1, strikeouts: 65, stolenBases: 5,
      caughtStealing: 2, average: 0.338, onBasePercentage: 0.435,
      sluggingPercentage: 0.437, ops: 0.872, iso: 0.099,
      averageWithRunnersInScoringPosition: 0.434,
    },
  },
  {
    id: 'austin-dean-2026',
    name: '오스틴',
    team: 'LG 트윈스',
    teamCode: 'LG',
    position: '내야수',
    bats: '우타',
    archetype: '거포 슬러거',
    accent: '#b2283f',
    ratings: { contact: 91, power: 99, eye: 90, speed: 60, clutch: 88 },
    stats: {
      games: 112, plateAppearances: 499, atBats: 426, hits: 142,
      doubles: 25, triples: 3, homeRuns: 32, runsBattedIn: 101,
      walks: 60, hitByPitch: 9, strikeouts: 74, stolenBases: 2,
      caughtStealing: 1, average: 0.333, onBasePercentage: 0.423,
      sluggingPercentage: 0.631, ops: 1.054, iso: 0.298,
      averageWithRunnersInScoringPosition: 0.380,
    },
  },
]

export function calculateOverall(ratings: PlayerRatings): number {
  return Math.round(
    ratings.contact * 0.28 +
      ratings.power * 0.24 +
      ratings.eye * 0.18 +
      ratings.speed * 0.12 +
      ratings.clutch * 0.18,
  )
}

export function findPlayer(playerId: string): PlayerProfile {
  return PLAYER_PROFILES.find((player) => player.id === playerId) ?? PLAYER_PROFILES[0]!
}
