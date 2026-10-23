// js/generator.js
// Reality Check - Scene Generator
// Generation logic owned by Aarushi. Templates and copy owned by Mitali.

// Mitali owns this object and its contents.
const TEMPLATES = {
  challenge: 'gravity',
  rule: 'Everyone stands on the ground. One person does not.',
  positions: ['first', 'second', 'third', 'fourth', 'fifth'],
  explanation: function(pos) {
    return `The ${pos} figure from the left is floating above the ground line. Everyone else is standing on it.`;
  },
  verdicts: {
    perfect: 'Clear sight',   // 5
    sharp: 'Sharp eyes',      // 3-4
    slipped: 'Reality slipped' // 0-2
  },
  concept: 'Traditional CAPTCHAs ask you to recognize things. This asks you to apply a rule.'
};

const FIGURE_COUNTS = [3, 4, 4, 5, 5];

/**
 * Validates a single scene object according to FILE_STRUCTURE.md constraints.
 * @param {Object} scene
 * @returns {boolean}
 */
function validateScene(scene) {
  if (!scene || typeof scene !== 'object') return false;
  if (!scene.id || typeof scene.id !== 'string') return false;
  if (scene.challenge !== 'gravity') return false;
  if (typeof scene.rule !== 'string' || scene.rule.trim() === '') return false;
  if (scene.timeLimitSec !== 20) return false;
  if (typeof scene.explanation !== 'string' || scene.explanation.trim() === '') return false;
  if (!Array.isArray(scene.figures) || scene.figures.length < 3 || scene.figures.length > 5) return false;

  // Verify unique figure IDs
  const idSet = new Set();
  for (let i = 0; i < scene.figures.length; i++) {
    const fig = scene.figures[i];
    if (!fig || typeof fig !== 'object') return false;
    if (typeof fig.id !== 'string' || fig.id === '') return false;
    if (idSet.has(fig.id)) return false;
    idSet.add(fig.id);

    // Verify left-to-right ID ordering f1..fn
    if (fig.id !== `f${i + 1}`) return false;

    // Verify x coordinates in 0-100 range and sorted
    if (typeof fig.x !== 'number' || isNaN(fig.x) || fig.x < 0 || fig.x > 100) return false;
    if (i > 0 && fig.x <= scene.figures[i - 1].x) return false;

    // Ground line y is always 70
    if (fig.y !== 70) return false;

    // Lift must be a non-negative number
    if (typeof fig.lift !== 'number' || isNaN(fig.lift) || fig.lift < 0) return false;
  }

  // Exactly one figure has lift > 0, and that lift must be >= 12
  const floatingFigures = scene.figures.filter(f => f.lift > 0);
  if (floatingFigures.length !== 1) return false;

  const floating = floatingFigures[0];
  if (floating.lift < 12 || floating.lift > 18) return false;

  // All other figures must have lift = 0
  const groundedFigures = scene.figures.filter(f => f.lift === 0);
  if (groundedFigures.length !== scene.figures.length - 1) return false;

  // answerId must match the floating figure
  if (scene.answerId !== floating.id) return false;

  // Verify explanation matches position
  const answerIndex = scene.figures.findIndex(f => f.id === scene.answerId);
  if (answerIndex === -1) return false;
  const expectedPositionWord = TEMPLATES.positions[answerIndex];
  if (!scene.explanation.toLowerCase().includes(expectedPositionWord)) return false;

  return true;
}

/**
 * Builds one scene for the given round index (0-4).
 * @param {number} roundIndex - 0-indexed round number (0 to 4)
 * @returns {Object} scene object
 */
function makeScene(roundIndex) {
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const safeRoundIndex = Math.max(0, Math.min(4, Math.floor(roundIndex || 0)));
    const n = FIGURE_COUNTS[safeRoundIndex] || 4;

    // Divide 10-90% into n equal slots
    const slotSpan = 90 - 10;
    const slotWidth = slotSpan / n;
    const figures = [];

    for (let i = 0; i < n; i++) {
      const slotCenter = 10 + (i + 0.5) * slotWidth;
      // Random offset of ±3
      const offset = (Math.random() * 6) - 3;
      // Round to 1 decimal place to keep layout clean and predictable
      const x = Math.round((slotCenter + offset) * 10) / 10;
      figures.push({
        x: x,
        y: 70
      });
    }

    // Ensure figures are sorted left to right
    figures.sort((a, b) => a.x - b.x);

    // Pick one figure index uniformly at random as the answer
    const answerIndex = Math.floor(Math.random() * n);
    const lift = Math.floor(Math.random() * (18 - 12 + 1)) + 12; // integer in [12, 18]

    // Assign IDs and lift
    for (let i = 0; i < n; i++) {
      figures[i].id = `f${i + 1}`;
      figures[i].lift = (i === answerIndex) ? lift : 0;
    }

    const answerId = `f${answerIndex + 1}`;
    const positionWord = TEMPLATES.positions[answerIndex] || 'floating';
    const explanation = TEMPLATES.explanation(positionWord);

    const scene = {
      id: `gravity-${safeRoundIndex + 1}`,
      challenge: TEMPLATES.challenge,
      rule: TEMPLATES.rule,
      timeLimitSec: 20,
      answerId: answerId,
      explanation: explanation,
      figures: figures
    };

    if (validateScene(scene)) {
      return scene;
    }

    console.warn('makeScene: Invalid scene generated on attempt', attempt + 1, scene);
  }

  // Fallback safe scene if random generation somehow failed
  console.warn('makeScene: Max attempts reached, using fallback safe scene for round', roundIndex);
  const n = FIGURE_COUNTS[roundIndex] || 4;
  const figures = [];
  const slotWidth = 80 / n;
  for (let i = 0; i < n; i++) {
    figures.push({
      id: `f${i + 1}`,
      x: 10 + (i + 0.5) * slotWidth,
      y: 70,
      lift: (i === 0) ? 15 : 0
    });
  }
  return {
    id: `gravity-${(roundIndex || 0) + 1}`,
    challenge: 'gravity',
    rule: TEMPLATES.rule,
    timeLimitSec: 20,
    answerId: 'f1',
    explanation: TEMPLATES.explanation(TEMPLATES.positions[0]),
    figures: figures
  };
}

/**
 * Returns an array of five scenes for a full run.
 * @returns {Array<Object>}
 */
function makeRun() {
  const run = [];
  for (let i = 0; i < 5; i++) {
    run.push(makeScene(i));
  }
  return run;
}

/**
 * Validates n runs (5 * n scenes) and logs results.
 * @param {number} [n=200]
 * @returns {Object} validation report
 */
function validateRuns(n = 200) {
  let totalScenes = 0;
  let invalidCount = 0;
  const failures = [];

  for (let r = 0; r < n; r++) {
    const run = makeRun();
    if (!Array.isArray(run) || run.length !== 5) {
      invalidCount += 5;
      failures.push({ runIndex: r, reason: 'Run length is not 5' });
      continue;
    }

    for (let s = 0; s < run.length; s++) {
      totalScenes++;
      const scene = run[s];
      if (!validateScene(scene)) {
        invalidCount++;
        failures.push({ runIndex: r, sceneIndex: s, scene: scene });
      }
    }
  }

  const result = {
    totalRuns: n,
    totalScenes: totalScenes,
    invalidCount: invalidCount,
    valid: invalidCount === 0,
    failures: failures
  };

  if (result.valid) {
    console.log(`[PASS] validateRuns(${n}): Tested ${totalScenes} scenes across ${n} runs with 0 invalid scenes.`);
  } else {
    console.error(`[FAIL] validateRuns(${n}): Found ${invalidCount} invalid scenes!`, failures);
  }

  return result;
}

// Global exports
if (typeof window !== 'undefined') {
  window.TEMPLATES = TEMPLATES;
  window.makeScene = makeScene;
  window.makeRun = makeRun;
  window.validateScene = validateScene;
  window.validateRuns = validateRuns;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TEMPLATES,
    FIGURE_COUNTS,
    makeScene,
    makeRun,
    validateScene,
    validateRuns
  };
}
