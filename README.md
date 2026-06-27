# 조선 좀비: 역귀의 밤

브라우저에서 플레이하는 한국어 비주얼 노벨 데모입니다. 가상의 조선 후기 역병 산골을 배경으로, 눈보라 속에 고립된 인물들이 “죽은 자가 돌아온다”는 소문과 맞닥뜨리는 프롤로그를 담고 있습니다.

- 공개 데모: [zombie-chosun.hyeon.space](https://zombie-chosun.hyeon.space)
- 버전: `0.1.0-demo.0`
- 라이선스: Unlicense
- 현재 공개 범위: 프롤로그 플레이 가능 빌드

## 데모 영상

<video src="https://github.com/MovieHolic-Plex/chosun-zombie/raw/master/public/demo/yeokgwi-night-demo.mp4" controls width="100%"></video>

[데모 영상 보기](public/demo/yeokgwi-night-demo.mp4)

GitHub에서 영상 미리보기가 뜨지 않으면 [배포 사이트 영상 파일](https://zombie-chosun.hyeon.space/demo/yeokgwi-night-demo.mp4)을 직접 열어 확인할 수 있습니다.

## 현재 구현 상태

이 저장소는 완성판 게임이 아니라, 분위기와 연출 방향을 검증하기 위한 공개 프로토타입입니다.

구현된 것:

- 한국어 비주얼 노벨 런타임
- 프롤로그 전용 스크립트 재생
- 배경, 캐릭터 스프라이트, 얼굴 초상화, 이벤트 CG 호출
- 선택지, 대사 로그, 저장/불러오기, 설정 UI
- 눈, 흔들림, 플래시, 페이드, 시네마틱 컷 전환
- 프롤로그 경로/에셋 검증 스크립트

아직 프로토타입인 것:

- 사운드는 대부분 임시 또는 절차 생성입니다.
- 모바일/접근성 QA는 더 필요합니다.
- 현재 공개 빌드는 프롤로그 중심이며, 이후 챕터는 공개 범위에서 제외될 수 있습니다.
- 생성형 이미지 에셋은 프로토타입용이며 정식 릴리스 전 교체될 수 있습니다.

## 실행 방법

요구 사항:

- Node.js `20.19+` 또는 `22.12+`
- npm

개발 서버:

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

프롤로그 공개 빌드를 만지기 전후로 아래 명령을 실행하는 것을 권장합니다.

```bash
npm run validate:prologue-paths
npm run validate:vn-assets
npm run lint
npm run build
```

검증 스크립트가 확인하는 것:

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
- 설정: 텍스트 속도, 자동 진행 간격 등 조정

## 스크립트 구조

시나리오는 Ren'Py풍의 텍스트 스크립트로 작성됩니다.

```text
scene bg intro_snow_pass with fade
cinematic cg006_seoha_first_bell with dissolve
show char ih serious at left with moveinleft
hide char ih with dissolve
show effect snow
play music windy_snow
jump scene_002
menu:
```

주요 파일:

- `public/scripts/manifest.json`: 현재 공개 플레이 대상 스크립트 목록
- `public/scripts/prologue.txt`: 프롤로그 본문
- `public/assets/runtime-asset-manifest.json`: 런타임 이미지 에셋 매니페스트
- `src/engine/parser.ts`: 라벨과 메뉴 파싱
- `src/engine/parserCommands.ts`: 스크립트 명령 파싱
- `src/engine/visuals.ts`: 배경, CG, 캐릭터 에셋 해석

## 에셋 구조

```text
public/assets/bg/       배경
public/assets/cg/       전체 화면 이벤트 CG
public/assets/char/     전신 캐릭터 스프라이트
public/assets/face/     대사창 얼굴 초상화
```

현재 공개 빌드에서는 프롤로그에서 실제 호출되는 런타임 이미지 에셋만 남기는 것을 원칙으로 합니다. 쓰지 않는 이미지가 남아 있으면 향후 이미지 생성 및 검수 과정에서 레퍼런스가 오염될 수 있으므로 제거합니다.

## 배포 메모

공개 데모 도메인은 `https://zombie-chosun.hyeon.space`를 사용합니다.

Namecheap DNS A 레코드 업서트:

```bash
NAMECHEAP_API_USER=...
NAMECHEAP_API_KEY=...
NAMECHEAP_USERNAME=...
NAMECHEAP_CLIENT_IP=...
NAMECHEAP_SLD=hyeon
NAMECHEAP_TLD=space
NAMECHEAP_HOST=zombie-chosun
DEPLOY_SERVER_IP=158.247.206.23
npm run dns:upsert:zombie-chosun
```

nginx 정적 배포 예시는 `scripts/deploy/nginx-zombie-chosun.conf`에 있습니다. Vite 빌드 산출물인 `dist/`를 서버의 `/var/www/zombie-chosun/current`에 배치한 뒤 nginx vhost로 연결하는 구성을 기준으로 합니다.

## 개발 원칙

- 프롤로그는 언제든 처음부터 끝까지 플레이 가능해야 합니다.
- 스크립트가 호출하는 이미지 파일은 반드시 매니페스트와 디스크 양쪽에 있어야 합니다.
- 이벤트 CG는 시트에서 잘라 쓰지 않고, 컷마다 별도 레퍼런스를 잡아 생성합니다.
- 캐릭터 스프라이트 역시 런타임용 단일 포즈 기준으로 검수합니다.

## 라이선스

Unlicense. 저작권 및 사용 제한 없이 가능한 한 자유롭게 사용, 수정, 재배포할 수 있습니다. 자세한 내용은 `LICENSE`를 참고하세요.
