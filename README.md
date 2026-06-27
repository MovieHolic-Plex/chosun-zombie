# 조선 좀비: 역귀의 밤

<p align="center">
  <a href="https://zombie-chosun.hyeon.space"><img alt="Demo online" src="https://img.shields.io/badge/demo-online-b11226?style=for-the-badge"></a>
  <img alt="Version" src="https://img.shields.io/badge/version-0.1.0--demo.0-2f2f2f?style=for-the-badge">
  <a href="LICENSE"><img alt="License: Unlicense" src="https://img.shields.io/badge/license-Unlicense-f2efe4?style=for-the-badge"></a>
  <img alt="Stack: React TypeScript Vite" src="https://img.shields.io/badge/React%20%2B%20TypeScript%20%2B%20Vite-24292f?style=for-the-badge">
</p>

<p align="center">
  <a href="https://zombie-chosun.hyeon.space">
    <img src="public/demo/yeokgwi-night-demo-preview.gif" alt="조선 좀비: 역귀의 밤 데모 미리보기" width="100%">
  </a>
</p>

<p align="center">
  <a href="https://zombie-chosun.hyeon.space"><strong>브라우저에서 플레이</strong></a>
  ·
  <a href="https://zombie-chosun.hyeon.space/demo/yeokgwi-night-demo.mp4">데모 영상 보기</a>
  ·
  <a href="LICENSE">Unlicense</a>
</p>

> 눈보라가 산길을 지우고, 죽은 자가 돌아온다는 소문만 남았다.
> `조선 좀비: 역귀의 밤`은 조선 후기 산골 마을을 배경으로 한 한국어 민속 호러 비주얼 노벨 데모입니다.

## 공개 데모

- 데모 사이트: [zombie-chosun.hyeon.space](https://zombie-chosun.hyeon.space)
- 데모 영상: [yeokgwi-night-demo.mp4](https://zombie-chosun.hyeon.space/demo/yeokgwi-night-demo.mp4)
- 현재 공개 범위: 프롤로그 플레이 가능 빌드
- 버전: `0.1.0-demo.0`

## 게임 소개

`조선 좀비: 역귀의 밤`은 픽셀 아트 기반의 시네마틱 비주얼 노벨입니다. 플레이어는 눈보라 속에서 고립된 산골 마을에 들어선 인물들의 시점으로, 역병과 굶주림, 실종, 그리고 죽은 자가 움직인다는 불길한 전언을 따라갑니다.

프롤로그는 완성판의 분위기와 연출 방향을 검증하기 위한 공개 프로토타입입니다. 대사 진행, 선택지, 이벤트 CG, 캐릭터 스프라이트, 저장/불러오기, 설정 UI까지 실제 플레이 흐름 안에서 확인할 수 있습니다.

## 구현된 것

- 프롤로그 전용 한국어 비주얼 노벨 런타임
- Ren'Py풍 텍스트 스크립트 파서와 라벨/분기 처리
- 배경, 캐릭터 스프라이트, 얼굴 초상화, 전체 화면 이벤트 CG 호출
- 선택지, 대사 로그, 자동 진행, 저장/불러오기, 설정 UI
- 눈, 흔들림, 플래시, 페이드, 시네마틱 컷 전환
- 프롤로그 스크립트 경로와 런타임 이미지 에셋 검증 스크립트

## 현재 상태

이 저장소는 완성판 게임이 아니라 공개 가능한 프롤로그 데모입니다.

- 사운드는 대부분 임시 또는 절차 생성입니다.
- 모바일 및 접근성 QA는 추가 작업이 필요합니다.
- 이후 챕터는 현재 공개 범위에 포함되어 있지 않습니다.
- 생성형 이미지 에셋은 프로토타입용이며 정식 릴리스 전 교체될 수 있습니다.

## 기술 스택

- React
- TypeScript
- Vite
- lucide-react
- oxlint

## 로컬 실행

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

프로덕션 빌드:

```bash
npm run build
npm run preview
```

## 검증

프롤로그 공개 빌드를 수정했다면 아래 명령을 실행하는 것을 권장합니다.

```bash
npm run validate:prologue-paths
npm run validate:vn-assets
npm run lint
npm run build
```

검증 스크립트는 다음 항목을 확인합니다.

- `public/scripts/prologue.txt`의 모든 라벨 도달 가능 여부
- 선택지 분기별 종료 도달 여부
- 이벤트 CG 호출 누락 여부
- 런타임 매니페스트와 실제 이미지 파일 일치 여부
- 프롤로그 외 스크립트가 공개 manifest에 섞였는지 여부

## 조작

- 대사창 클릭 또는 탭: 다음 대사로 진행
- 선택지 버튼: 분기 선택
- 기록: 읽은 대사 로그 확인
- 자동: 자동 진행 토글
- 저장/불러오기: 브라우저 로컬 저장 슬롯 사용
- 설정: 텍스트 속도와 자동 진행 간격 조정

## 프로젝트 구조

```text
public/assets/bg/       배경
public/assets/cg/       전체 화면 이벤트 CG
public/assets/char/     전신 캐릭터 스프라이트
public/assets/face/     대사창 얼굴 초상화
public/demo/            README 미리보기와 데모 영상
public/scripts/         공개 플레이 스크립트
src/engine/             스크립트 파서와 비주얼 노벨 런타임
src/components/         플레이 화면과 UI 컴포넌트
scripts/tools/          프롤로그 및 에셋 검증 도구
```

## 제작 원칙

- 프롤로그는 언제든 처음부터 끝까지 플레이 가능해야 합니다.
- 공개 빌드는 `public/scripts/prologue.txt`만 플레이 대상으로 둡니다.
- 스크립트가 호출하는 이미지 파일은 매니페스트와 디스크 양쪽에 있어야 합니다.
- 이벤트 CG는 시트에서 잘라 쓰지 않고, 컷마다 별도 레퍼런스를 잡아 제작합니다.
- 캐릭터 스프라이트 역시 런타임용 단일 포즈 기준으로 검수합니다.

## 라이선스

Unlicense. 저작권 및 사용 제한 없이 가능한 한 자유롭게 사용, 수정, 재배포할 수 있습니다. 자세한 내용은 [LICENSE](LICENSE)를 참고하세요.
