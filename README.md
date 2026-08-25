# PIXEL BALL 3

AI와 타격·투구를 번갈아 플레이하는 오리지널 8비트 3이닝 야구 게임입니다. 모든 경기 그래픽과 효과음은 Canvas, CSS, Web Audio로 만들어 외부 이미지·폰트·음원에 의존하지 않습니다.

## 2026 선수 데이터

2026년 8월 24일 기준 KBO 공식 타자 기록을 바탕으로 대표 타자 5명의 정적 스냅샷을 제공합니다. 메뉴에서 선수를 선택하면 컨택·파워·선구안·주력·클러치 능력치가 타이밍 창, 장타 분포, 추가 진루 및 득점권 보정에 반영됩니다.

- 출처: [KBO 타자 기본 기록](https://www.koreabaseball.com/Record/Player/HitterBasic/Basic1.aspx)
- 출처: [KBO 타자 세부 기록](https://www.koreabaseball.com/Record/Player/HitterBasic/Basic2.aspx)
- 환산 기준과 원본 스냅샷: `src/players.ts`

현재 데이터는 로컬 프로토타입 검증을 위한 소규모 수동 스냅샷입니다. 운영 서비스에서 자동 갱신하거나 재배포하려면 KBO의 공식 API 또는 서면 이용 허가가 필요합니다.

## 실행

```bash
npm install
npm run dev
```

Chrome 1280×720 이상을 권장합니다.

## 조작

- `WASD` / 방향키: 타격 또는 투구 코스 이동
- `Space`: 스윙 또는 투구
- `1` / `2` / `3`: 직구, 커브, 체인지업 선택
- `M`: 효과음 켜기/끄기
- `Esc`: 일시정지

화면의 코스 패드와 액션 버튼만으로도 모든 핵심 조작이 가능합니다.

## 검증

```bash
npm test
npm run typecheck
npm run build
```
