# REALITY CHECK — Rules for AI Coding Assistants

Read this before changing any file. These rules override general coding habits.

---

## 1. Project context (non-negotiable)

- REALITY CHECK is a single-page browser game built in a 90-minute hackathon, answering the "Reimagine CAPTCHA" problem statement.
- Source of truth: `PROJECT.md`. Requirements: `PRD.md`. Structure: `FILE_STRUCTURE.md`.
- The MVP is **one challenge type (Gravity Glitch) produced by a random generator**. Do not add challenge types, scenes, or features unless the user explicitly asks for that exact item and it is listed as P1 in `PRD.md`.
- The PS must-haves are non-negotiable: browser, 3 types **or** random generator, clear pass/fail, each challenge under 30 s, restart without reload.
- It is a game about the idea of a CAPTCHA. Never describe it, in code comments or UI text, as bot protection, human verification, or security.

## 2. Non-negotiable requirements

1. Runs by opening `index.html` directly, with no server, build step, or network access.
2. No external dependencies: no CDN scripts, no npm packages, no network fonts, no API calls.
3. No login, accounts, backend, database, or API keys.
4. Each generated scene has exactly one floating figure (lift ≥ 12), and every other figure has `lift: 0`.
5. Restart works without a page reload.
6. Timeouts never break game state.
7. Every interactive element is keyboard-operable, and rule and feedback text is real text.

## 3. Before you change anything

1. **Inspect first.** Read the files you will touch and the files that import or depend on them. Do not write code against assumptions about existing structure.
2. **Read the docs.** Check `PRD.md` for the acceptance criteria for the feature. If the request is not covered, stop and ask.
3. **Preserve working behavior.** If a change would alter a passing acceptance criterion, say so before making the change.
4. **Make the smallest change.** Edit existing code rather than replacing it. Do not rewrite a file to fix one line.

## 4. Scope guards (prevent creep)

- Do not add a feature because it "would be nice." Check the PRD tier first. P2 items are excluded.
- Do not invent requirements, rule copy, explanation wording, or score-band copy. If content is missing, use a clearly marked placeholder such as `TODO(mitali): ...`.
- Do not add a challenge type without an explicit instruction from the user. Shadow Protocol is P1 and starts only after P0 passes.
- Do not change the scoring rule (1 point per correct answer, max 5) or the default timer (20 s) without an explicit instruction. These are documented assumptions A1 and A2.
- Do not add persistence (localStorage, cookies) without an explicit instruction. The MVP is in-memory only.

## 5. Coding conventions

- Plain HTML, CSS, and vanilla JavaScript (ES2017 or later is fine). No TypeScript, no framework, no transpilation.
- Scripts load with plain `<script>` tags in dependency order: `generator.js`, `figures.js`, `game.js`.
- Generation logic and copy templates stay in `generator.js`. State and flow stay in `game.js`. Drawing stays in `figures.js`. Do not cross these boundaries (see `FILE_STRUCTURE.md` section 2).
- Use `const` and `let`. No global variables except the documented names (`makeRun`, `validateScene`, `game`, and the exported figure function).
- Use `textContent` for text. Use `innerHTML` only for generated SVG produced by `figures.js`, never for scene text.
- Name figure IDs and scene IDs as in the data model. Do not rename fields without updating every reader.

## 6. Architecture rules

- `game.js` is the only module that changes state.
- `figures.js` is a pure function: input figure object, output SVG element. No DOM writes outside its return value, no state.
- `generator.js` is pure: no DOM access, no state, and randomness only through `Math.random`. It returns new objects each call.
- Timer logic lives in `game.js` only. Use one timer handle; always clear it before creating another.
- Each round resolves exactly once. Use the `locked` flag before any scoring or highlighting.

## 7. Error handling

- An invalid generated scene must not reach the player. `makeScene` regenerates it and logs `console.warn`.
- A click or key on an unknown figure ID is ignored and logged with `console.warn`.
- Never leave the timer running on a screen where it has no purpose.

## 8. Security

- No `eval`, no `new Function`, no dynamic script injection.
- No network requests of any kind.
- No storage of personal data. The game collects none.
- Rule and explanation text is trusted static content, but still assigned via `textContent`.

## 9. Testing (manual, minimum)

Before reporting a change as done, check:
- [ ] Full 5-round run completes.
- [ ] Each round: correct answer scores 1, wrong figure scores 0, timeout scores 0.
- [ ] Clicking or pressing keys during feedback or after timeout does nothing.
- [ ] Double-click registers once.
- [ ] "Play again" generates a new run and resets score, round, timer, and highlights.
- [ ] Keyboard-only run completes (Tab, Enter, Space only).
- [ ] No console errors in a fresh load.
- [ ] Works with the network disabled.

**Generator check (automated, console):** `validateRuns(200)` must run 200 runs of 5 scenes and report zero invalid scenes. Aarushi adds this function in `generator.js` with `validateScene` (see FILE_STRUCTURE.md section 3). Do not mark the generator as done without running it.

Report which checks you ran. Do not claim a check passed if you did not run it.

## 10. Documentation

- If behavior changes, update the matching section of `PRD.md` and `README.md` in the same change.
- Do not create new documentation files unless asked.

## 11. Reporting

- State what you changed, which files, and which checks you ran.
- List any assumption you made. Do not hide it.
- If a request conflicts with these rules, stop and say which rule conflicts. Do not silently comply or silently refuse.