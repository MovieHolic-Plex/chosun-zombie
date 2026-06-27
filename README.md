# 조선 좀비: 역귀의 밤 / Chosun Zombie: Night of the Yeokgwi

<p align="center">
  <a href="https://zombie-chosun.hyeon.space"><img alt="Demo online" src="https://img.shields.io/badge/demo-online-b11226?style=for-the-badge"></a>
  <img alt="Version" src="https://img.shields.io/badge/version-0.1.0--demo.0-2f2f2f?style=for-the-badge">
  <a href="LICENSE"><img alt="License: Unlicense" src="https://img.shields.io/badge/license-Unlicense-f2efe4?style=for-the-badge"></a>
  <img alt="Stack: React TypeScript Vite" src="https://img.shields.io/badge/React%20%2B%20TypeScript%20%2B%20Vite-24292f?style=for-the-badge">
</p>

<p align="center">
  <a href="https://zombie-chosun.hyeon.space">
    <img src="public/demo/yeokgwi-night-demo-preview.gif" alt="Chosun Zombie: Night of the Yeokgwi demo preview" width="100%">
  </a>
</p>

<p align="center">
  <a href="#한국어"><strong>한국어</strong></a>
  ·
  <a href="#english"><strong>English</strong></a>
  ·
  <a href="https://zombie-chosun.hyeon.space"><strong>Play Demo</strong></a>
  ·
  <a href="https://zombie-chosun.hyeon.space/demo/yeokgwi-night-demo.mp4">Watch Video</a>
  ·
  <a href="LICENSE">Unlicense</a>
</p>

---

## 한국어

> 눈보라가 산길을 지우고, 죽은 자가 돌아온다는 소문만 남았다.
>
> `조선 좀비: 역귀의 밤`은 조선 후기 산골 마을을 배경으로 한 한국어 민속 호러 비주얼 노벨 데모입니다.

### 공개 데모

- 플레이: [zombie-chosun.hyeon.space](https://zombie-chosun.hyeon.space)
- 데모 영상: [yeokgwi-night-demo.mp4](https://zombie-chosun.hyeon.space/demo/yeokgwi-night-demo.mp4)
- 공개 범위: 프롤로그 플레이 가능 빌드
- 버전: `0.1.0-demo.0`

### 게임 소개

`조선 좀비: 역귀의 밤`은 픽셀 아트 기반의 시네마틱 비주얼 노벨입니다. 플레이어는 눈보라 속에서 고립된 산골 마을에 들어선 인물들의 시점으로, 역병과 굶주림, 실종, 그리고 죽은 자가 움직인다는 불길한 전언을 따라갑니다.

현재 공개 빌드는 완성판이 아니라 프롤로그 데모입니다. 대사 진행, 선택지, 이벤트 CG, 캐릭터 스프라이트, 저장/불러오기, 설정 UI까지 실제 플레이 흐름 안에서 확인할 수 있습니다.

### 구현된 것

- 프롤로그 전용 한국어 비주얼 노벨 런타임
- Ren'Py풍 텍스트 스크립트 파서와 라벨/분기 처리
- 배경, 캐릭터 스프라이트, 얼굴 초상화, 전체 화면 이벤트 CG 호출
- 선택지, 대사 로그, 자동 진행, 저장/불러오기, 설정 UI
- 눈, 흔들림, 플래시, 페이드, 시네마틱 컷 전환
- 프롤로그 스크립트 경로와 런타임 이미지 에셋 검증 스크립트

### 현재 상태

- 사운드는 대부분 임시 또는 절차 생성입니다.
- 모바일 및 접근성 QA는 추가 작업이 필요합니다.
- 이후 챕터는 현재 공개 범위에 포함되어 있지 않습니다.
- 생성형 이미지 에셋은 프로토타입용이며 정식 릴리스 전 교체될 수 있습니다.

### 조작

- 대사창 클릭 또는 탭: 다음 대사로 진행
- 선택지 버튼: 분기 선택
- 기록: 읽은 대사 로그 확인
- 자동: 자동 진행 토글
- 저장/불러오기: 브라우저 로컬 저장 슬롯 사용
- 설정: 텍스트 속도와 자동 진행 간격 조정

### 로컬 실행

요구 사항:

- Node.js `20.19+` 또는 `22.12+`
- npm

```bash
npm install
npm run dev
```

기본 로컬 주소:

```text
http://127.0.0.1:8888/
```

---

## English

> Snow erases the mountain road, and only one rumor remains: the dead are coming back.
>
> `Chosun Zombie: Night of the Yeokgwi` is a Korean folk-horror visual novel demo set in an isolated late-Joseon mountain village.

### Public Demo

- Play: [zombie-chosun.hyeon.space](https://zombie-chosun.hyeon.space)
- Demo video: [yeokgwi-night-demo.mp4](https://zombie-chosun.hyeon.space/demo/yeokgwi-night-demo.mp4)
- Public scope: playable prologue build
- Version: `0.1.0-demo.0`

### About

`Chosun Zombie: Night of the Yeokgwi` is a cinematic pixel-art visual novel about plague, hunger, disappearance, and the fear that the dead have begun to move again.

The current public build is a prologue demo rather than a full game. It includes the actual story flow for dialogue, choices, event CGs, character sprites, save/load, logs, and settings.

### Features

- Korean visual-novel runtime for the prologue
- Ren'Py-like text script parser with labels and branching
- Backgrounds, full-body character sprites, dialogue portraits, and full-screen event CGs
- Choices, dialogue log, auto mode, save/load, and settings UI
- Snow, shake, flash, fade, dissolve, and cinematic cut transitions
- Validation scripts for prologue paths and runtime image assets

### Current State

- Most audio is temporary or procedurally generated.
- Mobile and accessibility QA still need more work.
- Later chapters are not part of the current public scope.
- Generated image assets are prototype material and may be replaced before a formal release.

### Controls

- Click or tap the dialogue box: advance text
- Choice buttons: select a branch
- Log: review previously read lines
- Auto: toggle automatic progression
- Save/Load: use browser-local save slots
- Settings: adjust text speed and auto-advance delay

### Local Setup

Requirements:

- Node.js `20.19+` or `22.12+`
- npm

```bash
npm install
npm run dev
```

Default local URL:

```text
http://127.0.0.1:8888/
```

---

## Development

### Stack

- React
- TypeScript
- Vite
- lucide-react
- oxlint

### Build

```bash
npm run build
npm run preview
```

### Validation

Run these before and after changing the public prologue build:

```bash
npm run validate:prologue-paths
npm run validate:vn-assets
npm run lint
npm run build
```

The validators check:

- Reachability for every label in `public/scripts/prologue.txt`
- End-state reachability for choice branches
- Missing event CG references
- Runtime manifest entries against actual image files
- Whether non-prologue scripts leaked into the public manifest

### Project Structure

```text
public/assets/bg/       Backgrounds
public/assets/cg/       Full-screen event CGs
public/assets/char/     Full-body character sprites
public/assets/face/     Dialogue portraits
public/demo/            README preview and demo video
public/scripts/         Public playable scripts
src/engine/             Script parser and visual-novel runtime
src/components/         Play screen and UI components
scripts/tools/          Prologue and asset validation tools
```

### Production Principles

- The prologue must remain playable from start to finish.
- The public build should only play `public/scripts/prologue.txt`.
- Every image referenced by the script must exist both in the manifest and on disk.
- Event CGs are produced as individual referenced shots, not sliced from sheets.
- Character sprites are reviewed as runtime-ready single-pose assets.

## License

Unlicense. You may use, modify, and redistribute this project as freely as possible. See [LICENSE](LICENSE).
