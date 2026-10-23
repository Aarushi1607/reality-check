# REALITY CHECK — File Structure and Architecture

Companion to PROJECT.md and PRD.md.

---

## 1. Directory tree

```
reality-check/
├── index.html          # Markup for all screens. Loads CSS and JS. Entry point.
├── styles.css          # All styling, theme variables, glitch transition, focus styles, responsive layout.
├── js/
│   ├── generator.js    # Builds a run of five valid scenes from constants and templates. Pure, no DOM.
│   ├── figures.js      # Builds the SVG and hotspot for one figure. Pure function, no state.
│   └── game.js         # State, timer, screen switching, answer validation, restart.
├── README.md           # Setup, run, demo guide.
├── PROJECT.md          # Source of truth.
├── PRD.md              # Requirements.
├── FILE_STRUCTURE.md   # This file.
└── AI_RULES.md         # Rules for AI coding assistants.
```

No `assets/` folder. No images, fonts, or external files. Fonts fall back to system fonts.

## 2. Component boundaries

| Module | Owns | Must not |
|---|---|---|
| `generator.js` | Scene construction: layout, answer choice, lift, rule and explanation templates | Touch the DOM, hold game state, or read other modules |
| `figures.js` | Figure SVG and hotspot from one figure spec | Hold game state or choose answers |
| `game.js` | State, timer, validation, screen transitions, restart | Contain figure drawing code or build scene layouts |
| `index.html` / `styles.css` | Structure, look, focus styles | Contain game logic beyond inline event hooks that call `game.js` |

Dependency direction: `game.js` → `generator.js`, `game.js` → `figures.js`. No reverse dependencies.

## 3. Generator and data model

### Run and scene shape (created by `generator.js`)

`makeRun()` returns an array of five scenes, built by `makeScene(roundIndex)`.

```js
{
  id: "gravity-1",
  challenge: "gravity",            // MVP: always "gravity"; P1 adds "shadow"
  rule: "Everyone stands on the ground. One person does not.",
  timeLimitSec: 20,
  answerId: "f2",                  // exactly one figure has lift > 0
  explanation: "The second figure from the left is floating above the ground line. Everyone else is standing on it.",
  figures: [
    { id: "f1", x: 14, y: 70, lift: 0 },   // x: percent across the scene box, sorted left to right
    { id: "f2", x: 41, y: 70, lift: 15 },  // answer: lift in [12, 18]
    { id: "f3", x: 66, y: 70, lift: 0 },
    { id: "f4", x: 88, y: 70, lift: 0 }
  ]
}
```

### Generator rules

- **Figure count by round:** `[3, 4, 4, 5, 5]` for rounds 1–5.
- **Layout:** divide 10–90% of the scene width into `n` equal slots. Place each figure at its slot center plus a random offset of ±3. Ground line `y` is always 70.
- **Answer:** pick one figure index uniformly at random. Set its `lift` to a random integer in `[12, 18]`. All others get `lift: 0`.
- **IDs:** figure ids `f1..fn` follow left-to-right order, so the explanation's position wording matches the ids.
- **Explanation:** template filled with the answer's position from the left (first, second, third, fourth, fifth).
- **Validation:** `validateScene(scene)` returns true only if: exactly one figure has lift > 0; that lift is ≥ 12; `answerId` matches that figure; figure ids are unique; all x values are within 0–100.

### Runtime state (in `game.js`, in memory only)

```js
state = {
  screen: "start" | "round" | "feedback" | "results",
  run: [],              // five scenes from makeRun()
  roundIndex: 0,        // 0–4
  score: 0,
  locked: false,        // true once a round is resolved
  timerId: null,
  timeLeft: 0
}
```

Reset everything in `restart()`, which calls `makeRun()` again. No persistence.

## 4. Data flow

1. On "Start" or "Play again", `game.js` calls `makeRun()` and stores the result in `state.run`.
2. For each round, `game.js` reads `state.run[roundIndex]`.
3. Renders the rule text into the round screen.
4. Calls `figures.js` once per figure. Places each at (x, y).
5. Attaches a click and keyboard handler to each hotspot, carrying the figure id.
6. Click, key, or timeout → `game.js` sets `locked = true`, stops timer, compares the figure id with `answerId`.
7. Updates score, highlights the answer, shows explanation.
8. "Next" increments `roundIndex`, or switches to results after round 5.

## 5. Figure rendering contract (`figures.js`)

Input: one figure object (`{ id, x, y, lift }`) and its position label (for example "Figure 2 of 4").
Output: an SVG `<g>` containing:
- The shared humanoid shape (head, torso, arms, legs). Same geometry for every figure.
- `transform="translate(0, -lift)"` applied to the group. Only lift is used in MVP.
- A transparent hit element at least 44×44 px, tagged `data-figure-id`, with `role="button"`, `tabindex="0"`, and `aria-label` set to the position label.

Ground line is drawn once per scene by `game.js`, not per figure.

## 6. Screens (`index.html`)

Single page, one visible `<section>` at a time, toggled by `game.js`:
- `#screen-start`: title, concept line, Start button.
- `#screen-round`: rule text, round counter, timer, score, scene box (`#scene`), feedback live region, Next button.
- `#screen-results`: final score, verdict, Play again button.

Feedback area reuses the round screen; it is not a separate screen.

## 7. External dependencies

None. No CDN links, no npm, no fonts loaded from the network. Everything must work offline.

## 8. Build and run

No build step. Open `index.html` in a browser. Optional: `python3 -m http.server 8000` from the project root if a local server is preferred.

## 9. Ownership map

| Path | Owner | Notes |
|---|---|---|
| `js/game.js` | Aarushi | Engine, state, keyboard handling |
| `js/generator.js` | Aarushi (logic), Mitali (templates and copy) | Mitali owns rule and explanation wording. Aarushi owns generation logic and `validateScene`. |
| `js/figures.js` | Purvesh | Figure geometry and hotspot |
| `styles.css` | Purvesh | Look, glitch transition, focus styles |
| `index.html` | Aarushi | Screen markup and ARIA |
| `README.md`, docs | Mitali | Keep in sync with behavior |