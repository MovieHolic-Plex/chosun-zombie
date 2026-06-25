# Chosun Zombie: Yeokgwi Night Demo

Version: `0.1.0-demo.0`

A cinematic Korean visual-novel demo set in a fictional late-Joseon plague crisis. The current build is a public prototype, not a complete game: it focuses on mood, script flow, character presentation, and a Ren'Py-inspired browser VN runtime.

## Demo Status

This repository is intended to be playable as a short demo slice.

Implemented:

- Main menu, save/load modals, log, and settings UI
- Script-driven scenario playback from plain text files
- Background changes, character show/hide commands, positions, and transitions
- Korean VN dialogue box with face portraits and choice menus
- Cinematic intro overlay, letterbox treatment, snow, flash, and shake effects
- Generated pixel-style background, sprite, portrait, and concept assets
- Procedural `windy_snow` BGM via Web Audio for the opening scene

Not yet complete:

- This is not a balanced or finished game loop
- Story is still a demo draft and will need more editing
- Audio is mostly procedural/stubbed; no full soundtrack or SFX library yet
- Browser QA, mobile layout polish, accessibility, and save compatibility are still in progress
- Assets are prototype-grade and may be replaced before a real release

## Quick Start

Requirements:

- Node.js `20.19+` or `22.12+`
- npm

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://127.0.0.1:8888/
```

Production build:

```bash
npm run build
npm run preview
```

Quality check:

```bash
npm run lint
```

## How the Demo Works

The scenario is stored as Ren'Py-like plain text:

- `public/scripts/prologue.txt`
- `public/scripts/chapter01.txt`

Supported script commands include:

```text
scene bg snow_mountain_pass with fade
show char 이현 serious at left with moveinleft
hide char 역귀 with dissolve
show effect snow
play music windy_snow
jump scene_002
menu:
```

Runtime systems:

- `src/engine/parser.ts` scans labels and menus
- `src/engine/parserCommands.ts` parses single-line script commands
- `src/engine/visuals.ts` resolves background and character assets
- `src/engine/audio.ts` handles procedural/demo audio
- `src/App.tsx` drives scenario state, variables, saves, and command execution

## Asset Layout

```text
public/assets/bg/       Backgrounds
public/assets/char/     Full-body VN sprites
public/assets/face/     Dialogue portraits
public/assets/concept/  Contact sheets and visual development references
```

Current scripted visual references are checked against the included assets. Missing character, face, or background files should be treated as a bug.

## Controls

- Click or tap the dialogue box to advance text
- Use choice buttons when a menu appears
- Footer actions open log, save, load, and settings panels
- Audio starts after a user gesture because browsers block autoplay

## Development Notes

This project started from a Vite React TypeScript scaffold, but the app is now a custom VN prototype. The codebase favors small engine modules over hard-coded React-only scene logic so that the script format can evolve.

Useful commands:

```bash
npm run dev
npm run lint
npm run build
```

Before opening a pull request or publishing a release, run both:

```bash
npm run lint
npm run build
```

## Roadmap

- Replace procedural audio with real BGM/SFX assets
- Add stronger script validation and authoring diagnostics
- Improve mobile landscape layout and touch ergonomics
- Expand character expression sets and rework remaining prototype art
- Add richer scene direction: camera moves, CG cuts, pauses, and sound cues
- Add automated smoke tests for script parsing and asset references

## License

MIT. See `LICENSE`.
