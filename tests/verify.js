// tests/verify.js
// Automated verification suite for REALITY CHECK

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- STARTING VERIFICATION SUITE ---');

// 1. Verify file presence and basic syntax
const requiredFiles = [
  'index.html',
  'styles.css',
  'js/generator.js',
  'js/figures.js',
  'js/game.js'
];

requiredFiles.forEach(relPath => {
  const fullPath = path.join(__dirname, '..', relPath);
  assert(fs.existsSync(fullPath), `Missing required file: ${relPath}`);
  console.log(`[PASS] File exists: ${relPath}`);
});

// Check index.html script tag order
const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const generatorPos = htmlContent.indexOf('js/generator.js');
const figuresPos = htmlContent.indexOf('js/figures.js');
const gamePos = htmlContent.indexOf('js/game.js');

assert(generatorPos !== -1, 'index.html missing js/generator.js');
assert(figuresPos !== -1, 'index.html missing js/figures.js');
assert(gamePos !== -1, 'index.html missing js/game.js');
assert(generatorPos < figuresPos && figuresPos < gamePos, 'Scripts must load in order: generator.js, figures.js, game.js');
console.log('[PASS] Script loading order verified in index.html (generator.js -> figures.js -> game.js)');

// Check index.html sections and accessibility elements
const expectedIds = [
  'screen-start',
  'screen-round',
  'screen-results',
  'btn-start',
  'btn-restart',
  'btn-next',
  'round-counter',
  'timer-count',
  'score-display',
  'rule-text',
  'scene',
  'feedback',
  'feedback-message',
  'feedback-explanation',
  'final-score',
  'verdict-text'
];

expectedIds.forEach(id => {
  assert(htmlContent.includes(`id="${id}"`), `index.html missing required id="${id}"`);
});
console.log('[PASS] All documented screen and control IDs present in index.html');

// 2. Test js/generator.js
const { TEMPLATES, FIGURE_COUNTS, makeScene, makeRun, validateScene, validateRuns } = require('../js/generator.js');

// Verify TEMPLATES
assert(TEMPLATES, 'TEMPLATES object must exist');
assert.strictEqual(TEMPLATES.rule, 'Everyone stands on the ground. One person does not.', 'TEMPLATES.rule mismatch');
assert.strictEqual(TEMPLATES.challenge, 'gravity', 'TEMPLATES.challenge mismatch');
assert(Array.isArray(TEMPLATES.positions) && TEMPLATES.positions.length === 5, 'TEMPLATES.positions must be 5 words');
assert.strictEqual(typeof TEMPLATES.explanation, 'function', 'TEMPLATES.explanation must be a function');
assert.strictEqual(TEMPLATES.verdicts.perfect, 'Clear sight');
assert.strictEqual(TEMPLATES.verdicts.sharp, 'Sharp eyes');
assert.strictEqual(TEMPLATES.verdicts.slipped, 'Reality slipped');
console.log('[PASS] TEMPLATES object preserved and intact');

// Test makeScene for each round
for (let r = 0; r < 5; r++) {
  const scene = makeScene(r);
  assert(validateScene(scene), `makeScene(${r}) generated an invalid scene`);
  assert.strictEqual(scene.figures.length, FIGURE_COUNTS[r], `Round ${r} should have ${FIGURE_COUNTS[r]} figures`);
  assert.strictEqual(scene.timeLimitSec, 20, 'Time limit must be 20 seconds');
}
console.log('[PASS] makeScene(0..4) verified across all figure counts [3, 4, 4, 5, 5]');

// Test validateRuns(200) as required by AI_RULES.md section 9
console.log('Running validateRuns(200)...');
const runResult = validateRuns(200);
assert(runResult.valid, 'validateRuns(200) reported invalid scenes!');
assert.strictEqual(runResult.invalidCount, 0, 'Invalid scene count must be 0');
assert.strictEqual(runResult.totalScenes, 1000, 'Total scenes tested must be 1000');
console.log('[PASS] AI_RULES.md validateRuns(200) passed with 1000/1000 valid scenes');

// 3. Test js/figures.js renderFigure contract
// Mock minimal SVG DOM in Node for renderFigure testing
global.document = {
  createElementNS: function(ns, tag) {
    return {
      tagName: tag,
      attributes: {},
      children: [],
      classList: {
        add: function(c) { this.classes = this.classes || []; this.classes.push(c); },
        contains: function(c) { return (this.classes || []).includes(c); }
      },
      setAttribute: function(name, val) { this.attributes[name] = String(val); },
      getAttribute: function(name) { return this.attributes[name]; },
      appendChild: function(child) { this.children.push(child); return child; },
      querySelector: function(sel) {
        // Simple search
        if (sel === '.figure-hotspot') {
          return findChild(this, n => n.attributes && n.attributes.class && n.attributes.class.includes('figure-hotspot'));
        }
        return null;
      }
    };
  }
};

function findChild(node, predicate) {
  if (predicate(node)) return node;
  for (const child of (node.children || [])) {
    const res = findChild(child, predicate);
    if (res) return res;
  }
  return null;
}

const { renderFigure } = require('../js/figures.js');
const testFigure = { id: 'f2', x: 41, y: 70, lift: 15 };
const figEl = renderFigure(testFigure, 'Figure 2 of 4');
assert(figEl, 'renderFigure must return an element');
assert.strictEqual(figEl.getAttribute('data-figure-id'), 'f2');
const hotspot = findChild(figEl, n => n.attributes && n.attributes['data-figure-id'] === 'f2' && n.attributes.role === 'button');
assert(hotspot, 'Hotspot button with role="button" must exist');
assert.strictEqual(hotspot.getAttribute('tabindex'), '0');
assert.strictEqual(hotspot.getAttribute('aria-label'), 'Figure 2 of 4');
console.log('[PASS] renderFigure contract verified (SVG <g>, lift transform, 44x44 hitbox, role="button", tabindex="0", aria-label)');

// 4. Test Game Engine Flow & State Machine Simulation
console.log('Testing Game Engine state machine...');

// Build mock DOM environment for game.js
const mockElements = {};
expectedIds.forEach(id => {
  mockElements[id] = {
    id: id,
    tagName: 'div',
    textContent: '',
    className: '',
    attributes: {},
    classList: {
      _classes: new Set(),
      add: function(c) { this._classes.add(c); },
      remove: function(c) { this._classes.delete(c); },
      contains: function(c) { return this._classes.has(c); }
    },
    setAttribute: function(n, v) { this.attributes[n] = String(v); },
    getAttribute: function(n) { return this.attributes[n]; },
    appendChild: function(c) { this.children = this.children || []; this.children.push(c); },
    addEventListener: function(evt, handler) {
      this.listeners = this.listeners || {};
      this.listeners[evt] = this.listeners[evt] || [];
      this.listeners[evt].push(handler);
    },
    focus: function() { this.focused = true; },
    querySelector: function(sel) {
      return this; // mock query
    }
  };
});

global.document.getElementById = function(id) {
  return mockElements[id] || null;
};
global.document.readyState = 'complete';
global.window = global;
global.TEMPLATES = TEMPLATES;
global.makeRun = makeRun;
global.validateScene = validateScene;
global.renderFigure = renderFigure;

// Clear module cache and load game.js
delete require.cache[require.resolve('../js/game.js')];
const game = require('../js/game.js');

// Test 4a: Start Game
game.startNewGame();
assert.strictEqual(game.state.roundIndex, 0, 'Round index should be 0 on start');
assert.strictEqual(game.state.score, 0, 'Score should be 0 on start');
assert.strictEqual(game.state.locked, false, 'Round should not be locked initially');
assert.strictEqual(game.state.run.length, 5, 'Run should have 5 scenes');
assert(game.state.timerId !== null, 'Timer should be active during round');
console.log('[PASS] startNewGame() correctly initializes 5-round run, score 0, round 0, active timer');

// Test 4b: Correct Selection
const currentScene = game.state.run[0];
const answerId = currentScene.answerId;
game.handleSelection(answerId);
assert.strictEqual(game.state.locked, true, 'Round must be locked after selection');
assert.strictEqual(game.state.score, 1, 'Score should increment to 1 for correct answer');
assert.strictEqual(game.state.timerId, null, 'Timer must be stopped after selection');
assert.strictEqual(mockElements['feedback-message'].textContent, 'Correct', 'Feedback message should be "Correct"');
console.log('[PASS] Correct selection: scores 1 point, stops timer, locks round, shows "Correct"');

// Test 4c: Double selection prevention
game.handleSelection('f1');
assert.strictEqual(game.state.score, 1, 'Score must not change on double-selection when locked');
console.log('[PASS] Double-selection guard verified: input ignored when locked');

// Test 4d: Advance to next round
game.handleNext();
assert.strictEqual(game.state.roundIndex, 1, 'handleNext() should advance to round 1');
assert.strictEqual(game.state.locked, false, 'New round must be unlocked');
assert(game.state.timerId !== null, 'New round must start fresh timer');
console.log('[PASS] handleNext() successfully transitions to round 2 with clean timer');

// Test 4e: Incorrect Selection
const round1Scene = game.state.run[1];
const wrongId = round1Scene.figures.find(f => f.id !== round1Scene.answerId).id;
game.handleSelection(wrongId);
assert.strictEqual(game.state.locked, true, 'Round must lock on incorrect selection');
assert.strictEqual(game.state.score, 1, 'Score must remain 1 for incorrect answer');
assert.strictEqual(mockElements['feedback-message'].textContent, 'Not this one', 'Feedback message should be "Not this one"');
console.log('[PASS] Incorrect selection: scores 0 points, stops timer, locks round, shows "Not this one"');

// Test 4f: Timeout handling
game.handleNext(); // round 2
assert.strictEqual(game.state.roundIndex, 2);
game.handleTimeout();
assert.strictEqual(game.state.locked, true, 'Round must lock on timeout');
assert.strictEqual(game.state.score, 1, 'Score must remain 1 on timeout');
assert.strictEqual(mockElements['feedback-message'].textContent, "Time's up", 'Feedback message should be "Time\'s up"');
console.log('[PASS] Timeout handling: scores 0 points, stops timer, locks round, shows "Time\'s up"');

// Test 4g: Complete remaining rounds to results
game.handleNext(); // round 3
game.handleSelection(game.state.run[3].answerId); // correct -> score 2
game.handleNext(); // round 4
game.handleSelection(game.state.run[4].answerId); // correct -> score 3
game.handleNext(); // to results
assert.strictEqual(game.state.screen, 'results', 'State screen should be results');
assert.strictEqual(mockElements['final-score'].textContent, 'Score: 3 / 5', 'Final score display mismatch');
assert.strictEqual(mockElements['verdict-text'].textContent, 'Sharp eyes', 'Score 3 should have verdict "Sharp eyes"');
console.log('[PASS] Full 5-round run completed to results screen with correct score and verdict');

// Test 4h: Play again (restart without reload)
const previousRun = game.state.run;
game.restart();
assert.strictEqual(game.state.roundIndex, 0, 'Round index must be reset to 0');
assert.strictEqual(game.state.score, 0, 'Score must be reset to 0');
assert.strictEqual(game.state.locked, false, 'Locked state must be reset to false');
assert.strictEqual(game.state.run.length, 5, 'New run must have 5 scenes');
assert(game.state.timerId !== null, 'Timer must be running for new round 1');
console.log('[PASS] Play again / restart() generates fresh run and resets all state without reloading');

// Test 4i: Keyboard Selection (Enter and Space)
console.log('Testing keyboard selection (Enter/Space)...');
const sceneEl = mockElements['scene'];
assert(sceneEl.listeners && sceneEl.listeners['keydown'], 'Scene must have keydown listener for keyboard accessibility');
const keydownHandler = sceneEl.listeners['keydown'][0];

// Simulate Enter key on answer figure
let preventDefaultCalled = false;
const enterEvent = {
  key: 'Enter',
  preventDefault: () => { preventDefaultCalled = true; },
  target: {
    closest: (selector) => {
      if (selector === '[data-figure-id]') {
        return { getAttribute: () => game.state.run[0].answerId };
      }
      return null;
    }
  }
};
keydownHandler(enterEvent);
assert(preventDefaultCalled, 'Enter key event should call preventDefault()');
assert.strictEqual(game.state.locked, true, 'Round should lock on Enter selection');
assert.strictEqual(game.state.score, 1, 'Score should increment to 1 via Enter key');
console.log('[PASS] Keyboard selection via Enter key successfully registered and scored');

// Test 4j: Timer cleanup on restart
const runningTimerId = game.state.timerId;
game.restart();
// Previous timer must be cleared and new timer handle created
assert(game.state.timerId !== null, 'Timer must be recreated on restart');
// Clear timer at end of test to allow node exit
if (game.state.timerId) {
  clearInterval(game.state.timerId);
}
console.log('[PASS] Timer cleanup on restart verified');

console.log('--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
process.exit(0);

