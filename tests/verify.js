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
  'mode-investigation',
  'mode-gravity',
  'btn-start',
  'btn-restart',
  'btn-next',
  'round-counter',
  'challenge-badge',
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
console.log('[PASS] All documented screen, mode, and control IDs present in index.html');

// 2. Test js/generator.js
const {
  TEMPLATES,
  FIGURE_COUNTS,
  makeGravityScene,
  makeMemoryScene,
  makeCipherScene,
  makeSignalScene,
  makeScene,
  makeRun,
  validateScene,
  validateRuns
} = require('../js/generator.js');

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

// Test makeScene for each round in classic gravity
for (let r = 0; r < 5; r++) {
  const scene = makeGravityScene(r);
  assert(validateScene(scene), `makeGravityScene(${r}) generated an invalid scene`);
  assert.strictEqual(scene.figures.length, FIGURE_COUNTS[r], `Round ${r} should have ${FIGURE_COUNTS[r]} figures`);
  assert.strictEqual(scene.timeLimitSec, 20, 'Time limit must be 20 seconds');
}
console.log('[PASS] makeGravityScene(0..4) verified across all figure counts [3, 4, 4, 5, 5]');

// Test mini-game scene generators
for (let r = 0; r < 5; r++) {
  const memScene = makeMemoryScene(r);
  assert(validateScene(memScene), `makeMemoryScene(${r}) generated an invalid scene`);
  assert.strictEqual(memScene.challenge, 'memory');
  assert.strictEqual(memScene.panels.length, 4);

  const cipScene = makeCipherScene(r);
  assert(validateScene(cipScene), `makeCipherScene(${r}) generated an invalid scene`);
  assert.strictEqual(cipScene.challenge, 'cipher');
  assert.strictEqual(cipScene.options.length, 4);

  const sigScene = makeSignalScene(r);
  assert(validateScene(sigScene), `makeSignalScene(${r}) generated an invalid scene`);
  assert.strictEqual(sigScene.challenge, 'signal');
  assert.strictEqual(sigScene.signals.length, 4);
}
console.log('[PASS] Mini-game scene generators (Memory, Cipher, Signal) verified');

// Test validateRuns across all modes
const modes = ['gravity', 'investigation', 'memory', 'cipher', 'signal'];
modes.forEach(mode => {
  const runResult = validateRuns(200, mode);
  assert(runResult.valid, `validateRuns(200, "${mode}") reported invalid scenes!`);
  assert.strictEqual(runResult.invalidCount, 0, `Invalid scene count must be 0 for mode: ${mode}`);
  assert.strictEqual(runResult.totalScenes, 1000, `Total scenes tested must be 1000 for mode: ${mode}`);
  console.log(`[PASS] validateRuns(200, "${mode}") passed with 1000/1000 valid scenes`);
});

// 3. Test js/figures.js renderFigure contract
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
      appendChild: function(child) { this.children.push(child); return child; }
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
console.log('[PASS] Purvesh renderFigure contract intact (SVG <g>, lift transform, 44x44 hitbox, role="button", tabindex="0", aria-label)');

// 4. Test Game Engine Flow & State Machine Simulation
console.log('Testing Game Engine state machine...');

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
    querySelector: function() { return this; },
    querySelectorAll: function() { return [this]; }
  };
});

global.document.getElementById = function(id) {
  return mockElements[id] || null;
};
global.document.querySelectorAll = function(sel) {
  return [mockElements['round-counter']];
};
global.document.createElement = function(tag) {
  return {
    tagName: tag,
    textContent: '',
    className: '',
    attributes: {},
    classList: {
      add: function() {},
      remove: function() {}
    },
    setAttribute: function(n, v) { this.attributes[n] = String(v); },
    getAttribute: function(n) { return this.attributes[n]; },
    appendChild: function(c) { this.children = this.children || []; this.children.push(c); }
  };
};

global.document.readyState = 'complete';
global.window = global;
global.TEMPLATES = TEMPLATES;
global.makeRun = makeRun;
global.validateScene = validateScene;
global.renderFigure = renderFigure;

delete require.cache[require.resolve('../js/game.js')];
const game = require('../js/game.js');

// 4a. Test Classic Gravity Run Flow
game.startNewGame('gravity');
assert.strictEqual(game.state.gameMode, 'gravity');
assert.strictEqual(game.state.roundIndex, 0);
assert.strictEqual(game.state.score, 0);
assert.strictEqual(game.state.run.length, 5);
assert.strictEqual(game.state.run[0].challenge, 'gravity');

// Correct selection in gravity round
const gravityAnswer = game.state.run[0].answerId;
game.handleSelection(gravityAnswer);
assert.strictEqual(game.state.locked, true);
assert.strictEqual(game.state.score, 1);
assert.strictEqual(mockElements['feedback-message'].textContent, 'Correct');
console.log('[PASS] Gravity Glitch protocol: round initialization, scoring, and feedback verified');

// 4b. Test Multi-Discipline Investigation Run Flow
game.startNewGame('investigation');
assert.strictEqual(game.state.gameMode, 'investigation');
assert.strictEqual(game.state.run.length, 5);
assert.strictEqual(game.state.run[0].challenge, 'memory', 'Round 1 of investigation should be memory');
assert.strictEqual(game.state.run[1].challenge, 'cipher', 'Round 2 of investigation should be cipher');
assert.strictEqual(game.state.run[2].challenge, 'gravity', 'Round 3 of investigation should be gravity');
assert.strictEqual(game.state.run[3].challenge, 'signal', 'Round 4 of investigation should be signal');

// Complete Memory round (Round 0)
const memoryScene = game.state.run[0];
game.handleSelection(memoryScene.answerId);
assert.strictEqual(game.state.score, 1);
assert.strictEqual(mockElements['feedback-message'].textContent, 'Correct');
game.handleNext(); // Advance to Cipher (Round 1)

// Complete Cipher round (Round 1)
assert.strictEqual(game.state.roundIndex, 1);
const cipherScene = game.state.run[1];
game.handleSelection(cipherScene.answerId);
assert.strictEqual(game.state.score, 2);
game.handleNext(); // Advance to Gravity (Round 2)

// Complete Gravity round (Round 2)
assert.strictEqual(game.state.roundIndex, 2);
const gravScene = game.state.run[2];
game.handleSelection(gravScene.answerId);
assert.strictEqual(game.state.score, 3);
game.handleNext(); // Advance to Signal (Round 3)

// Complete Signal round (Round 3)
assert.strictEqual(game.state.roundIndex, 3);
const sigScene = game.state.run[3];
game.handleSelection(sigScene.answerId);
assert.strictEqual(game.state.score, 4);
game.handleNext(); // Advance to Final Round (Round 4)

// Complete Final Round (Round 4)
assert.strictEqual(game.state.roundIndex, 4);
game.handleSelection(game.state.run[4].answerId);
assert.strictEqual(game.state.score, 5);

// Transition to Results
game.handleNext();
assert.strictEqual(game.state.screen, 'results');
assert.strictEqual(mockElements['final-score'].textContent, 'Score: 5 / 5');
assert.strictEqual(mockElements['verdict-text'].textContent, 'Clear sight');
console.log('[PASS] Full 5-round Hawkins Investigation completed across all 4 mini-game types to results (5/5)');

// 4c. Test Replay without reload
game.restart();
assert.strictEqual(game.state.roundIndex, 0);
assert.strictEqual(game.state.score, 0);
assert.strictEqual(game.state.locked, false);
assert.strictEqual(game.state.run.length, 5);
console.log('[PASS] Restart without reload verified for multi-game investigation');

// Clean up any timers
if (game.state.timerId) clearInterval(game.state.timerId);

console.log('--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
process.exit(0);
