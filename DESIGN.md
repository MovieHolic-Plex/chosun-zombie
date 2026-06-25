# Chosun Zombie Design System

## 1. Atmosphere & Identity

`역귀야행` should feel like a blood-stained Joseon field journal unfolding in a cold plague night. The signature is parchment horror: warm hanji surfaces and brush borders sitting over dark, cinematic snowfields and red-black danger accents.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/parchment | `--hanji-beige-2` | `#f2ebd9` | `#f2ebd9` | Dialogue boxes, modal surfaces |
| Surface/parchment-soft | `--hanji-beige-1` | `#fdfbf7` | `#fdfbf7` | Highlights and paper texture |
| Surface/parchment-aged | `--hanji-beige-3` | `#e5dac1` | `#e5dac1` | Secondary panels and hover states |
| Surface/parchment-edge | `--hanji-beige-4` | `#c9bda3` | `#c9bda3` | Borders and dividers |
| Surface/ink | `--ash-grey-1` | `#1e1e1e` | `#1e1e1e` | Primary dark surfaces and body ink |
| Surface/ink-soft | `--ash-grey-2` | `#2d2d2d` | `#2d2d2d` | Borders, text, dark panels |
| Text/muted | `--ash-grey-4` | `#8e8e8e` | `#8e8e8e` | Disabled and secondary text |
| Accent/blood | `--bloody-red-2` | `#8b0000` | `#8b0000` | Names, danger, focus accents |
| Accent/blood-bright | `--bloody-red-3` | `#b30000` | `#b30000` | Active red emphasis |
| Accent/lantern | `--lantern-yellow-1` | `#ffd56b` | `#ffd56b` | Active menu states and glow |
| Scene/night | `--faded-navy-1` | `#0a1128` | `#0a1128` | Title and night atmosphere |
| Scene/pine | `--pine-green-2` | `#2e3f37` | `#2e3f37` | Fallback scenic gradients |

### Rules

- Parchment surfaces carry UI; navy, pine, and black carry the world behind it.
- Blood red is semantic: threat, character name emphasis, selection focus.
- Lantern yellow is rare and reserved for active/confirmed states.
- New colors must be added here before use.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Title | 110px | 400 | 1 | 5px | Main title logo |
| Modal title | 26px | 800 | 1.3 | 0 | Modal headings |
| Character name | 20px | 800 | 1.3 | 0 | Speaker names |
| Menu button | 18px | 700 | 1.4 | 0 | Main menu actions |
| Dialogue | 17px | 400 | 1.6 | 0 | Body dialogue |
| Body | 16px | 400 | 1.5 | 0 | Settings and modal text |
| Small action | 12px | 600 | 1.4 | 0 | Footer controls |
| Debug | 10px | 400 | 1.4 | 0 | Development-only overlays |

### Font Stack

- Primary serif: `Nanum Myeongjo, serif`
- Title brush: `East Sea Dokdo, cursive`
- Sans support: `Gothic A1, sans-serif`
- Mono: browser monospace for development-only panels

### Rules

- Use the serif for story and controls; use the brush font only for titles or historic plaques.
- Body text must not drop below 12px except development-only diagnostics.
- Letter spacing is intentional only on title and subtitle marks.

## 4. Spacing & Layout

### Base Unit

All spacing derives from 4px.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight icon gaps and footer padding |
| `--space-2` | 8px | Inline groups |
| `--space-3` | 12px | Compact button padding |
| `--space-4` | 16px | Standard panel padding |
| `--space-5` | 20px | Dialogue gaps and modal controls |
| `--space-6` | 24px | Choice padding and comfortable rhythm |
| `--space-8` | 32px | Modal and section spacing |
| `--space-10` | 40px | Title/menu separation |

### Grid

- Game viewport: fixed 1280x720, scaled to fit the window.
- Main UI margin: 2 percent to 4 percent of viewport width.
- Character layer: bottom-aligned above the dialogue box.

### Rules

- Keep fixed-format game elements stable; transitions must not resize the viewport.
- Use the 1280x720 stage as the source coordinate system.

## 5. Components

### Dialogue Box
- **Structure**: portrait, speaker name, dialogue text, advance arrow, footer menu.
- **Variants**: narration, character speech, choice overlay.
- **Spacing**: `--space-4` to `--space-5`.
- **States**: typing, complete, auto mode, skip mode.
- **Motion**: standard fade/slide in; text reveal controlled by game state.

### Choice Button
- **Structure**: stacked brush-border buttons above the dialogue box.
- **Variants**: default and hover blood accent.
- **Spacing**: `--space-4` vertical gap, `--space-6` horizontal padding.
- **States**: default, hover, active.
- **Motion**: staggered opacity/translate entry.

### Visual Layer
- **Structure**: background layer, snow/effect layer, character layer, UI layer.
- **Variants**: dissolve, fade, move-in/out, punch, flash.
- **Motion**: transform, opacity, and filter only.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 120ms | ease-out | Button active feedback |
| Standard | 220ms | ease-in-out | Hover and focus |
| Visual dissolve | 520-650ms | ease-in-out | Character and background changes |
| Emphasis | 600ms | cubic-bezier(0.16, 1, 0.3, 1) | Dialogue and menu entry |

### Rules

- Animate only `opacity`, `transform`, and `filter`.
- Respect `prefers-reduced-motion` by disabling non-essential movement.
- Scene and sprite changes should overlap when possible, matching Ren'Py-style dissolve behavior.

## 7. Depth & Surface

### Strategy

Mixed, with a strict role split:

- Story UI uses parchment surfaces, double borders, and restrained shadows.
- World visuals use image depth and dark overlays.
- Developer-only panels may use stark diagnostic styling but must not be treated as final game UI.

| Level | Value | Usage |
|-------|-------|-------|
| Panel | `0 4px 20px rgba(0, 0, 0, 0.4)` | Dialogue and UI panels |
| Premium | `0 10px 30px rgba(0, 0, 0, 0.5)` | Modals and save/load surfaces |
| Sprite | `drop-shadow(0 10px 15px rgba(0,0,0,0.5))` | Character grounding |
