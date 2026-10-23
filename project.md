# REALITY CHECK — Project Source of Truth

**Status:** PS confirmed. Ideation complete. MVP build starting. Build window: 90 minutes (started 16:30 IST, 2026-10-23).
**Team:** Aarushi (game engine), Purvesh (figure art and layout constants), Mitali (rule text, explanation templates, testing, demo).
**Read order for new contributors:** PROJECT.md → PRD.md → FILE_STRUCTURE.md → AI_RULES.md → README.md

---

## 1. Problem (confirmed PS: "Reimagine CAPTCHA", PS 1 of 4)

CAPTCHAs frustrate people, shut out users with disabilities, and bots now pass many faster than humans do. The mission: design and build a playable, CAPTCHA-style challenge that:

- a human clears in under 30 seconds and enjoys,
- plays with what makes us human, and what a bot would get wrong,
- is explicitly **not** real security. It is a game about the idea of a CAPTCHA.

**Must-haves (from the PS):**
1. Runs in the browser.
2. At least 3 different challenge types, **or** a random generator.
3. Clear pass/fail feedback.
4. Each challenge takes under 30 seconds.
5. Restart without reloading.

## 2. PS fit (honest assessment)

| Must-have | Current design | Action |
|---|---|---|
| Runs in browser | Met | None |
| 3 types **or** random generator | **Not met as previously scoped** (one type, fixed scenes) | Build a random generator for Gravity Glitch (Decision D1). This satisfies the "or" clause. |
| Clear pass/fail | Met | None |
| Under 30 s | Met (20 s timer) | None |
| Restart without reload | Met | None |

**Theme and intent gaps (not must-haves, but the PS asks for them):**

- **"What makes us human / what a bot would get wrong":** not addressed. A bot that reads the page's data passes instantly. The game must not claim to separate humans from bots (Decision D2).
- **Accessibility:** the PS names disabled users as excluded by CAPTCHAs. A purely visual, mouse-only design repeats that problem. Add basic keyboard and screen-reader support (P0). This is not a full accessibility audit.
- **Fun:** unproven until playtest. Do not claim it before someone other than the team has played it.

**Judging risk:** the generator is the cheapest compliant path, but one mechanic with random layouts is a thin answer to "3 types." If the 17:05 checkpoint passes, the P1 second type is the strongest upgrade.

## 3. Target users

- **Hackathon judges and demo audience:** need to understand the concept in under 60 seconds and play one round.
- **Casual players:** short, self-contained rounds with no account or setup.

No real user base exists. Do not design for retention, accounts, or analytics.

## 4. Proposed solution

A single-page browser game. Each run generates five scenes at random. In each scene, several human figures stand on a ground line and exactly one floats above it. The rule is shown, the player clicks the floating figure within 20 seconds, and an explanation follows.

**MVP challenge type:** Gravity Glitch, produced by a random generator.

## 5. Value proposition

A short visual reasoning puzzle with a clear "aha" reveal. The player applies a stated rule rather than recognizing objects, and every generated scene has one defensible answer by construction.

**Honest assessment:** the format is familiar (spot-the-odd-one-out, CAPTCHA parody). The differentiator is the explanation reveal and the human-rule framing, and neither is proven yet.

## 6. Core workflow

1. Start screen → "Start".
2. Round N: rule shown, 20 s timer starts, player selects one figure (mouse, or Tab and Enter).
3. Feedback: correct or incorrect, the answer highlighted, plus the explanation. Player continues.
4. Repeat for 5 rounds.
5. Results: score out of 5 → "Play again" (restarts in-page, no reload).

## 7. Scope

| Tier | Contents |
|---|---|
| **P0 (MVP)** | Gravity Glitch via a random generator. 5 rounds per run. 20 s timer. Pass/fail feedback with explanation. Score. Results. Restart. Keyboard-operable hotspots and readable rule text. |
| **P1** | Second challenge type, Shadow Protocol, using the same figure system. Starts only after P0 passes section 8. Counts toward the "3 types" option if built. |
| **P2 (excluded)** | Reflection Files, Reality Shift, a "human test" or bot-detection mode, sound, accounts, backend, databases, AI or CV APIs, analytics, mobile-specific layouts beyond basic responsiveness. |

## 8. Decisions

- **D1 (proposed, team to confirm):** Meet the must-have with a random generator, not three challenge types. Cheapest compliant option. Risk: judged as thin. Mitigation: P1 second type if time allows.
- **D2 (team to decide):** Pitch wording on bots. **Recommended:** drop any bot-distinguishing claim and frame the theme as "the rule is the test." Do not attempt a bot-resistant mechanic in 90 minutes.
- **D3 (resolved):** The concept doc's three challenge types are reduced to one for MVP, per D1.

## 9. Success criteria

- Full 5-round run completes with no console errors.
- The generator produces valid scenes in 200 consecutive runs with zero failures (automated check in `AI_RULES.md` section 9).
- The timed portion of each round is 20 seconds, under the PS's 30-second limit.
- A keyboard-only run completes: Tab to a figure, Enter selects, Tab to Next.
- Restart works without reloading the page.
- The game runs by opening `index.html` with no network connection.
- The demo, including pitch, takes under 3 minutes.
- At least two people outside the author have played a full run and can state the rule without help.

## 10. Tech stack

- HTML, CSS, and vanilla JavaScript. No framework, no build step, no dependencies.
- Figures are inline SVG generated in JavaScript.
- Opens directly from the filesystem (`index.html`).

**If a prompt-to-app builder is used instead:** the export must still be one self-contained page with no login or API key. Hand-written code is the default.

## 11. Architecture

Static single-page app with three layers:

- **Generator** (`js/generator.js`): creates a run of five valid scenes from constants and rule and explanation templates.
- **Logic** (`js/game.js`): state (current round, score, timer), screen switching, answer validation, restart.
- **Rendering** (`js/figures.js`, `index.html`, `styles.css`): figure SVG, screen markup, and styling.

No backend, no storage beyond in-memory state, no network calls.

## 12. Constraints

- 90-minute build window with three people.
- No backend, authentication, database, or API keys.
- Must run without internet access during the demo.

## 13. Assumptions (unverified)

| ID | Assumption | How to verify |
|---|---|---|
| A1 | Round timer is 20 seconds. | Mitali confirms during playtest. |
| A2 | Score is 1 point per correct answer; wrong answers and timeouts score 0. Max 5. | Agreed in this document; change only with team sign-off. |
| A3 | Judges accept a game about the CAPTCHA idea as in scope. The PS says this explicitly. | Confirmed by PS text. Remaining risk is whether the human-vs-bot theme lands (see D2). |
| A4 | Purvesh can produce the figure template and layout constants in about 30 minutes. | Checkpoint at 17:05. If missed, the generator still works with the simplest figure. |
| A5 | The demo laptop has a current browser and no internet dependency. | Test on the demo machine at 17:45. |
| A6 | One mechanic with random layouts is an acceptable reading of "random generator." | Team decides with D1. Judging risk is real. |

## 14. Known limitations

- **Not bot protection.** A bot that reads the page passes instantly. Stating otherwise to judges is a misrepresentation.
- **One mechanic.** Gravity Glitch only in MVP. Repeat players will recognize the pattern quickly.
- **Simple art.** Figures are geometric vector shapes. Anomalies are transforms (lift), not detailed drawings.
- **No persistence.** Scores are lost on reload. No leaderboard.
- **Basic accessibility only.** Keyboard and text support, not audited against accessibility standards.
- **Limited device QA.** Tested on desktop browser only, unless time allows more.

## 15. What makes it different (and what doesn't)

- **Does not differ:** the spot-the-odd-one-out format is common.
- **Differs:** the player applies a stated rule rather than recognizing an object, the game explains the reasoning after each answer, and the scenes are generated so the answer is always defensible.
- **Risk:** the difference is only visible if judges read the explanation. The demo must show the explanation reveal on screen.

## 16. Status and next steps

**Done:** Repository exists. PS confirmed and recorded in section 1. Concept doc received. Docs updated to the PS.

**Next (in order):**
1. Team confirms D1 (generator) and decides D2 (pitch wording on bots).
2. Purvesh produces the figure template and the layout constants used by the generator.
3. Mitali writes the rule text, the explanation template, and the score-band copy.
4. Aarushi builds `generator.js` and the engine in `game.js`, then runs the generator check.
5. All three playtest. Include one run with the keyboard only.
6. Checkpoint at 17:30: if P0 passes, decide whether P1 (Shadow Protocol) is feasible before 17:45 freeze.

Do not start P1 until P0 passes section 9.