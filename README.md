# PIXEL BALL 3

AI와 타격·투구를 번갈아 플레이하는 오리지널 8비트 3이닝 야구 게임입니다. 모든 경기 그래픽과 효과음은 Canvas, CSS, Web Audio로 만들어 외부 이미지·폰트·음원에 의존하지 않습니다.

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
