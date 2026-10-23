# REALITY CHECK — Product Requirements

Companion to PROJECT.md. Where they conflict, PROJECT.md wins; update both together.

---

## 1. MVP definition

A player can open `index.html`, start a run, complete five rounds of randomly generated Gravity Glitch scenes with a 20-second timer and pass/fail feedback, see a score, restart without reloading the page, and do all of it with the keyboard. Nothing else is required.

## 2. PS must-have coverage

| PS must-have | Where it is met |
|---|---|
| Runs in the browser | US-01, Section 5 (no network) |
| 3 challenge types **or** a random generator | US-08 (random generator, Gravity Glitch) |
| Clear pass/fail feedback | US-04 |
| Each challenge under 30 s | US-05 (20 s) |
| Restart without reloading | US-07 |

## 3. User stories and acceptance criteria

### P0 — Must have

**US-01 Start a run**
As a player, I want a start screen so I know what the game is and can begin.
- AC1: Start screen shows the title, one-line concept ("Traditional CAPTCHAs ask you to recognize things. This asks you to apply a rule."), and a "Start" button.
- AC2: Clicking "Start" generates a new run of five scenes, begins round 1, and resets score to 0.

**US-02 See the rule**
As a player, I want the rule stated in text before I inspect the scene.
- AC1: Each round shows the rule text above the scene before the timer starts counting.
- AC2: Rule text is always: "Everyone stands on the ground. One person does not." (Owned by Mitali.)
- AC3: Round number shows as "Round N of 5".
- AC4: Rule text is real text (not an image), so screen readers can read it.

**US-03 Select a figure**
As a player, I want to click or keyboard-select the figure that breaks the rule.
- AC1: Each figure has a clickable hotspot at least 44×44 px.
- AC2: Each hotspot is reachable with Tab, activated with Enter or Space, and labeled for screen readers as "Figure N of M" (N counted left to right).
- AC3: A click or key activation selects exactly one figure. Further selection in the same round is ignored.
- AC4: Hotspots respond only while the round is active (not during feedback or after timeout).

**US-04 Get feedback**
As a player, I want to know whether I was right and why.
- AC1: Correct selection: "Correct" message, the floating figure is highlighted, and the explanation appears.
- AC2: Incorrect selection: "Not this one" message, the correct figure is highlighted, and the explanation appears.
- AC3: A "Next" button advances to the next round, or to results after round 5. "Next" receives focus when feedback appears.
- AC4: The feedback message is text, announced to screen readers (live region).

**US-05 Timer**
As a player, I want a time limit so rounds stay short.
- AC1: Each round has a countdown visible on screen, 20 seconds (assumption A1).
- AC2: At 0 with no selection, the round ends as incorrect, shows the explanation and correct figure, and enables "Next". Timeout scores 0.
- AC3: Timer stops immediately on selection or timeout. No further input is accepted.

**US-06 Score and results**
As a player, I want to see how well I did.
- AC1: Running score is visible during rounds ("Score: X").
- AC2: Results screen shows final score out of 5 and a one-line verdict by band: 5 = "Clear sight", 3–4 = "Sharp eyes", 0–2 = "Reality slipped". Band copy is placeholder; Mitali may change wording.
- AC3: Results screen has a "Play again" button.

**US-07 Restart**
As a player, I want to play again without reloading.
- AC1: "Play again" generates a new run, resets round, score, and timer state, and starts round 1.
- AC2: No stale figure selection, timer, or feedback carries into the new run.

**US-08 Random generator**
As a player, I want each run to be different so one run is not a memorized pattern.
- AC1: Every run generates five scenes from `js/generator.js`. No scene is hard-coded.
- AC2: Each scene has exactly one floating figure. Its lift is at least 12 (visibility floor). Every other figure has lift 0.
- AC3: The answer's position is random. Figure count per round follows the curve in FILE_STRUCTURE.md section 3 (3, 4, 4, 5, 5).
- AC4: The generator never produces an invalid scene. Verified by the check in AI_RULES.md section 9 (200 runs, zero failures).

**US-09 Keyboard-only play**
As a player who cannot use a mouse, I want to play the whole game with the keyboard.
- AC1: Start, figure selection, Next, and Play again are all reachable with Tab and activated with Enter or Space.
- AC2: Focus is visible on every interactive element.
- AC3: A keyboard-only run completes without a mouse. (Tested in playtest.)

### P1 — Should have (only after P0 passes PROJECT.md section 9)

**US-10 Second challenge type: Shadow Protocol**
- AC1: Each scene is labeled with its challenge type ("Gravity Glitch" or "Shadow Protocol").
- AC2: Shadow Protocol uses the same figure factory. The anomaly is a shadow offset, not new art.
- AC3: Round types are chosen by the generator. Each run contains at least one scene of each type.
- AC4: The same ambiguity and visibility rules apply to both types.

**US-11 Difficulty progression**
- AC1: Figure count increases across rounds (FILE_STRUCTURE.md section 3).
- AC2: Anomaly lift never drops below the visibility floor (section 6).

### P2 — Nice to have / excluded

- Reflection Files challenge type.
- Reality Shift (rules change between rounds).
- A "human test" or bot-detection framing or mode.
- Sound, animation beyond a single glitch transition.
- Persistent high score, leaderboard, or any server storage.
- Seeded or shareable runs.

## 4. User flows

```
[Start screen] --Start--> [Generate run] --> [Round N: show rule, start 20 s timer]
   --select figure or timeout--> [Feedback: result + explanation + highlight]
   --Next--> (N < 5) [Round N+1]  |  (N = 5) [Results]
[Results] --Play again--> [Generate new run, round 1, score reset]
```

## 5. Edge cases and expected behavior

| Case | Expected behavior |
|---|---|
| Click after timeout | Ignored. Feedback stays. |
| Double-click on a figure | First click registers; second is ignored. |
| Click or key during feedback | Ignored. |
| Timer reaches 0 exactly as a click lands | Whichever event is processed first wins; the round locks on that result. No double scoring. |
| "Next" pressed twice quickly | Advances one round only. |
| "Play again" during a round | Not available. Button only appears on results. |
| Browser window resized mid-round | Layout reflows; hotspots still match figure positions (coordinates are percentages). |
| Browser back button | Not handled. Game stays on the current screen. Acceptable for MVP. |
| Generator produces an invalid scene | Should never happen by construction. If it does, the run regenerates that scene and logs `console.warn`. The game does not show an error to the player. |

## 6. Quality bar

- **Ambiguity rule:** every scene has exactly one figure whose lift differs from the rest. No other figure has any transform, so no second defensible answer exists.
- **Visibility floor:** the floating figure's lift is at least 12 units of the scene height (12%). Subtler anomalies are excluded because they create arguable answers.
- **Explanation rule:** each explanation names the figure by position ("the third figure from the left") and states the rule, in one or two sentences.
- **Timing rule:** the timed portion of each round is 20 seconds, under the PS's 30-second limit.

## 7. Explicitly excluded (MVP)

- Any backend, database, or API call.
- Login, accounts, or any personal data collection.
- Claims of bot detection, human verification, or security.
- Computer vision or AI-generated images.
- Reality Shift and Reflection Files.
- Sound, music, or narration.

## 8. Open questions

- **Q1 (D1):** Confirm the random-generator approach for the PS must-have. Blocks scene and generator work.
- **Q2 (D2):** Confirm pitch wording on bots (drop the bot-distinguishing claim is recommended). Blocks the pitch script.
- **Q3:** Score band wording. Low priority.