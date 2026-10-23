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
 * Validates a single scene object according to FILE_STRUCTURE.md constraints
 * and extended multi-discipline mini-game schemas.
 * @param {Object} scene
 * @returns {boolean}
 */
function validateScene(scene) {
  if (!scene || typeof scene !== 'object') return false;
  if (!scene.id || typeof scene.id !== 'string') return false;
  if (scene.timeLimitSec !== 20) return false;
  if (typeof scene.rule !== 'string' || scene.rule.trim() === '') return false;
  if (typeof scene.explanation !== 'string' || scene.explanation.trim() === '') return false;

  // 1. Gravity Glitch validation (P0 MVP strict constraints)
  if (scene.challenge === 'gravity') {
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

    // Exactly one figure has lift > 0, and that lift must be in [12, 18]
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

  // 2. Hawkins Lab - Memory Sequence validation
  if (scene.challenge === 'memory') {
    if (!Array.isArray(scene.panels) || scene.panels.length !== 4) return false;
    if (!Array.isArray(scene.sequence) || scene.sequence.length < 3 || scene.sequence.length > 5) return false;
    if (!scene.answerId || typeof scene.answerId !== 'string') return false;
    if (scene.answerId !== scene.sequence.join('-')) return false;
    return true;
  }

  // 3. Gate Cipher - Pattern Logic validation
  if (scene.challenge === 'cipher') {
    if (!Array.isArray(scene.displaySequence) || scene.displaySequence.length < 3) return false;
    if (!Array.isArray(scene.options) || scene.options.length !== 4) return false;
    if (!scene.answerId || typeof scene.answerId !== 'string') return false;
    const hasMatchingOption = scene.options.some(opt => opt.id === scene.answerId);
    if (!hasMatchingOption) return false;
    return true;
  }

  // 4. Radio Interference - Signal Deduction validation
  if (scene.challenge === 'signal') {
    if (!Array.isArray(scene.signals) || scene.signals.length !== 4) return false;
    if (!scene.answerId || typeof scene.answerId !== 'string') return false;
    const hasMatchingSignal = scene.signals.some(sig => sig.id === scene.answerId);
    if (!hasMatchingSignal) return false;
    return true;
  }

  return false;
}

/**
 * Builds one Gravity Glitch scene for the given round index (0-4).
 * @param {number} roundIndex - 0-indexed round number (0 to 4)
 * @returns {Object} scene object
 */
function makeGravityScene(roundIndex) {
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
      challenge: 'gravity',
      title: 'GRAVITY GLITCH — SPATIAL ANOMALY',
      rule: TEMPLATES.rule,
      timeLimitSec: 20,
      answerId: answerId,
      explanation: explanation,
      figures: figures
    };

    if (validateScene(scene)) {
      return scene;
    }

    console.warn('makeGravityScene: Invalid scene generated on attempt', attempt + 1, scene);
  }

  // Fallback safe scene
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
    title: 'GRAVITY GLITCH — SPATIAL ANOMALY',
    rule: TEMPLATES.rule,
    timeLimitSec: 20,
    answerId: 'f1',
    explanation: TEMPLATES.explanation(TEMPLATES.positions[0]),
    figures: figures
  };
}

/**
 * Builds a Hawkins Lab Memory Sequence scene.
 * @param {number} roundIndex
 * @returns {Object} scene object
 */
function makeMemoryScene(roundIndex) {
  const panelDefs = [
    { id: 'p1', code: 'ALPHA', num: '1', color: 'crimson', note: 'Low Pulse' },
    { id: 'p2', code: 'BETA', num: '2', color: 'cyan', note: 'Harmonic Pulse' },
    { id: 'p3', code: 'GAMMA', num: '3', color: 'amber', note: 'Resonance Pulse' },
    { id: 'p4', code: 'DELTA', num: '4', color: 'emerald', note: 'High Pulse' }
  ];

  // Sequence length: 3 for earlier rounds, 4 for roundIndex >= 3
  const seqLength = (roundIndex >= 3) ? 4 : 3;
  const sequence = [];
  const panelIds = ['p1', 'p2', 'p3', 'p4'];

  for (let i = 0; i < seqLength; i++) {
    // Avoid 3 identical in a row
    let nextPanel;
    do {
      nextPanel = panelIds[Math.floor(Math.random() * panelIds.length)];
    } while (i >= 2 && nextPanel === sequence[i - 1] && nextPanel === sequence[i - 2]);
    sequence.push(nextPanel);
  }

  const seqNames = sequence.map(id => {
    const p = panelDefs.find(item => item.id === id);
    return `[${p.num}:${p.code}]`;
  });

  return {
    id: `memory-${(roundIndex || 0) + 1}`,
    challenge: 'memory',
    title: 'HAWKINS LAB — MEMORY SEQUENCE',
    rule: 'Memorize the psychic sensory illumination. Repeat the exact panel sequence.',
    timeLimitSec: 20,
    answerId: sequence.join('-'),
    sequence: sequence,
    panels: panelDefs,
    explanation: `Target sequence was ${seqNames.join(' → ')}. Sensory telemetry verified.`
  };
}

/**
 * Builds a Gate Cipher Pattern Logic scene.
 * @param {number} roundIndex
 * @returns {Object} scene object
 */
function makeCipherScene(roundIndex) {
  const puzzles = [
    {
      rule: 'Rift symbols rotate 90° clockwise. Deduce the missing glyph.',
      displaySequence: ['▲', '▶', '▼', '?'],
      options: [
        { id: 'opt-1', symbol: '◀', label: 'Left', isCorrect: true },
        { id: 'opt-2', symbol: '▲', label: 'Up', isCorrect: false },
        { id: 'opt-3', symbol: '▼', label: 'Down', isCorrect: false },
        { id: 'opt-4', symbol: '◈', label: 'Diamond', isCorrect: false }
      ],
      explanation: 'The sequence rotates 90° clockwise at each step (Up → Right → Down → Left). The missing glyph is ◀.'
    },
    {
      rule: 'Dimensional nodes increase by one vertex per transmission. Find the 5-point rift node.',
      displaySequence: ['—', '△', '◇', '?'],
      options: [
        { id: 'opt-1', symbol: '⬟', label: 'Pentagon (5)', isCorrect: true },
        { id: 'opt-2', symbol: '△', label: 'Triangle (3)', isCorrect: false },
        { id: 'opt-3', symbol: '◯', label: 'Circle (0)', isCorrect: false },
        { id: 'opt-4', symbol: '—', label: 'Line (2)', isCorrect: false }
      ],
      explanation: 'Each step adds one vertex (2-line, 3-triangle, 4-diamond). The next node has 5 vertices (⬟).'
    },
    {
      rule: 'Electromagnetic rift pulses alternate between solid core and hollow core. Complete the sequence.',
      displaySequence: ['◈', '◇', '◈', '◇', '?'],
      options: [
        { id: 'opt-1', symbol: '◈', label: 'Solid Core', isCorrect: true },
        { id: 'opt-2', symbol: '◇', label: 'Hollow Core', isCorrect: false },
        { id: 'opt-3', symbol: '○', label: 'Empty Ring', isCorrect: false },
        { id: 'opt-4', symbol: '✕', label: 'Null Signal', isCorrect: false }
      ],
      explanation: 'The transmission strictly alternates between solid (◈) and hollow (◇) cores. The next node must be solid (◈).'
    },
    {
      rule: 'Interference frequency bars increment by 1. Select the missing harmonic signal strength.',
      displaySequence: ['|', '||', '|||', '?'],
      options: [
        { id: 'opt-1', symbol: '||||', label: '4 Bars', isCorrect: true },
        { id: 'opt-2', symbol: '||', label: '2 Bars', isCorrect: false },
        { id: 'opt-3', symbol: '|||||', label: '5 Bars', isCorrect: false },
        { id: 'opt-4', symbol: '|', label: '1 Bar', isCorrect: false }
      ],
      explanation: 'Signal bars increment linearly (+1) at each step (1 → 2 → 3 → 4). The missing signal has 4 bars (||||).'
    },
    {
      rule: 'Spatial curvature traces clockwise around the portal quadrant. Identify the missing sector.',
      displaySequence: ['◜', '◝', '◞', '?'],
      options: [
        { id: 'opt-1', symbol: '◟', label: 'Bottom-Left', isCorrect: true },
        { id: 'opt-2', symbol: '◜', label: 'Top-Left', isCorrect: false },
        { id: 'opt-3', symbol: '◝', label: 'Top-Right', isCorrect: false },
        { id: 'opt-4', symbol: '◯', label: 'Closed Loop', isCorrect: false }
      ],
      explanation: 'The curve sweeps clockwise through quadrants (Top-Left → Top-Right → Bottom-Right → Bottom-Left). The missing glyph is ◟.'
    }
  ];

  // Pick puzzle based on roundIndex or uniform random
  const pIndex = Math.floor(Math.random() * puzzles.length);
  const p = puzzles[pIndex];

  // Shuffle options so correct answer position varies
  const shuffledOptions = p.options.map(opt => ({ ...opt }));
  for (let i = shuffledOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
  }

  // Re-index options opt-1..opt-4
  let answerId = '';
  const finalOptions = shuffledOptions.map((opt, idx) => {
    const id = `opt-${idx + 1}`;
    if (opt.isCorrect) answerId = id;
    return {
      id: id,
      symbol: opt.symbol,
      label: opt.label
    };
  });

  return {
    id: `cipher-${(roundIndex || 0) + 1}`,
    challenge: 'cipher',
    title: 'GATE CIPHER — PATTERN LOGIC',
    rule: p.rule,
    timeLimitSec: 20,
    answerId: answerId,
    displaySequence: p.displaySequence,
    options: finalOptions,
    explanation: p.explanation
  };
}

/**
 * Builds a Radio Interference Signal Deduction scene.
 * @param {number} roundIndex
 * @returns {Object} scene object
 */
function makeSignalScene(roundIndex) {
  const signalPuzzles = [
    {
      rule: 'Three frequencies resonate on a 3 Hz carrier band. One is anomalous interference. Identify the outlier.',
      anomalyIndex: 2, // 0-based
      waveforms: [
        { id: 'sig-1', label: 'CH-A', freq: '3.0 MHz', type: 'sine-3', isAnomaly: false },
        { id: 'sig-2', label: 'CH-B', freq: '3.0 MHz', type: 'sine-3', isAnomaly: false },
        { id: 'sig-3', label: 'CH-C', freq: '5.0 MHz', type: 'sine-5', isAnomaly: true },
        { id: 'sig-4', label: 'CH-D', freq: '3.0 MHz', type: 'sine-3', isAnomaly: false }
      ],
      explanation: 'Channels A, B, and D oscillate at standard 3 Hz. Channel C is anomalous interference oscillating at 5 Hz.'
    },
    {
      rule: 'Standard receiver channels hold steady low amplitude. One channel surges with supernatural voltage. Identify the outlier.',
      anomalyIndex: 1,
      waveforms: [
        { id: 'sig-1', label: 'CH-A', freq: '2.5 MHz', type: 'amp-low', isAnomaly: false },
        { id: 'sig-2', label: 'CH-B', freq: '2.5 MHz (SURGE)', type: 'amp-surge', isAnomaly: true },
        { id: 'sig-3', label: 'CH-C', freq: '2.5 MHz', type: 'amp-low', isAnomaly: false },
        { id: 'sig-4', label: 'CH-D', freq: '2.5 MHz', type: 'amp-low', isAnomaly: false }
      ],
      explanation: 'Channels A, C, and D remain within standard safe voltage. Channel B has severe high-amplitude spikes.'
    },
    {
      rule: 'Analog signals produce smooth harmonic waves. One channel suffers stepped glitch interference from the rift. Identify the outlier.',
      anomalyIndex: 3,
      waveforms: [
        { id: 'sig-1', label: 'CH-A', freq: '4.0 MHz', type: 'sine-harmonic', isAnomaly: false },
        { id: 'sig-2', label: 'CH-B', freq: '4.0 MHz', type: 'sine-harmonic', isAnomaly: false },
        { id: 'sig-3', label: 'CH-C', freq: '4.0 MHz', type: 'sine-harmonic', isAnomaly: false },
        { id: 'sig-4', label: 'CH-D', freq: '4.0 MHz (DISTORTED)', type: 'glitch-square', isAnomaly: true }
      ],
      explanation: 'Channels A, B, and C are smooth analog sine waves. Channel D exhibits unnatural digital square quantization.'
    },
    {
      rule: 'Receiver channels are calibrated to positive initial crest phase. One channel is phase-inverted. Identify the outlier.',
      anomalyIndex: 0,
      waveforms: [
        { id: 'sig-1', label: 'CH-A', freq: '3.2 MHz (INVERTED)', type: 'phase-inverted', isAnomaly: true },
        { id: 'sig-2', label: 'CH-B', freq: '3.2 MHz', type: 'phase-normal', isAnomaly: false },
        { id: 'sig-3', label: 'CH-C', freq: '3.2 MHz', type: 'phase-normal', isAnomaly: false },
        { id: 'sig-4', label: 'CH-D', freq: '3.2 MHz', type: 'phase-normal', isAnomaly: false }
      ],
      explanation: 'Channels B, C, and D initiate with upward positive crest (+). Channel A is phase-inverted with a downward trough (-).'
    }
  ];

  const p = signalPuzzles[Math.floor(Math.random() * signalPuzzles.length)];

  // Shuffle the waveforms so the outlier isn't always in the same position
  const shuffled = p.waveforms.map(w => ({ ...w }));
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  let answerId = '';
  const finalSignals = shuffled.map((sig, idx) => {
    const id = `sig-${idx + 1}`;
    const label = `CH-${String.fromCharCode(65 + idx)}`; // CH-A, CH-B, CH-C, CH-D
    if (sig.isAnomaly) answerId = id;
    return {
      id: id,
      label: label,
      freq: sig.freq.replace(/CH-[A-D]/, label),
      type: sig.type
    };
  });

  return {
    id: `signal-${(roundIndex || 0) + 1}`,
    challenge: 'signal',
    title: 'RADIO INTERFERENCE — SIGNAL DEDUCTION',
    rule: p.rule,
    timeLimitSec: 20,
    answerId: answerId,
    signals: finalSignals,
    explanation: p.explanation
  };
}

/**
 * Builds one scene based on challenge type and round index.
 * Preserves FILE_STRUCTURE.md makeScene(roundIndex) signature for gravity scenes.
 * @param {number} roundIndex - 0 to 4
 * @param {string} [challengeType='gravity'] - 'gravity' | 'memory' | 'cipher' | 'signal'
 * @returns {Object} scene object
 */
function makeScene(roundIndex, challengeType = 'gravity') {
  if (challengeType === 'memory') {
    return makeMemoryScene(roundIndex);
  } else if (challengeType === 'cipher') {
    return makeCipherScene(roundIndex);
  } else if (challengeType === 'signal') {
    return makeSignalScene(roundIndex);
  } else {
    return makeGravityScene(roundIndex);
  }
}

/**
 * Returns an array of five scenes for a full run.
 * Defaults to 'gravity' when called with no arguments to strictly preserve P0 acceptance tests.
 * Supports 'investigation' / 'mixed' for the full multi-discipline trial.
 * @param {string} [mode='gravity'] - 'gravity' | 'investigation' | 'memory' | 'cipher' | 'signal'
 * @returns {Array<Object>}
 */
function makeRun(mode = 'gravity') {
  const run = [];

  if (mode === 'investigation' || mode === 'mixed') {
    // 5-round multi-discipline campaign:
    // Round 1: Memory Sequence
    // Round 2: Gate Cipher
    // Round 3: Gravity Glitch Anomaly
    // Round 4: Radio Interference
    // Round 5: Gate Cipher (High Frequency)
    run.push(makeMemoryScene(0));
    run.push(makeCipherScene(1));
    run.push(makeGravityScene(2));
    run.push(makeSignalScene(3));
    run.push(makeCipherScene(4));
  } else if (mode === 'memory') {
    for (let i = 0; i < 5; i++) run.push(makeMemoryScene(i));
  } else if (mode === 'cipher') {
    for (let i = 0; i < 5; i++) run.push(makeCipherScene(i));
  } else if (mode === 'signal') {
    for (let i = 0; i < 5; i++) run.push(makeSignalScene(i));
  } else {
    // Default P0: 5 Gravity Glitch scenes
    for (let i = 0; i < 5; i++) {
      run.push(makeGravityScene(i));
    }
  }

  return run;
}

/**
 * Validates n runs (5 * n scenes) and logs results.
 * @param {number} [n=200]
 * @param {string} [mode='gravity'] - 'gravity' | 'investigation' | 'memory' | 'cipher' | 'signal'
 * @returns {Object} validation report
 */
function validateRuns(n = 200, mode = 'gravity') {
  let totalScenes = 0;
  let invalidCount = 0;
  const failures = [];

  for (let r = 0; r < n; r++) {
    const run = makeRun(mode);
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
    mode: mode,
    totalScenes: totalScenes,
    invalidCount: invalidCount,
    valid: invalidCount === 0,
    failures: failures
  };

  if (result.valid) {
    console.log(`[PASS] validateRuns(${n}, mode="${mode}"): Tested ${totalScenes} scenes with 0 invalid scenes.`);
  } else {
    console.error(`[FAIL] validateRuns(${n}, mode="${mode}"): Found ${invalidCount} invalid scenes!`, failures);
  }

  return result;
}

// Global exports
if (typeof window !== 'undefined') {
  window.TEMPLATES = TEMPLATES;
  window.FIGURE_COUNTS = FIGURE_COUNTS;
  window.makeGravityScene = makeGravityScene;
  window.makeMemoryScene = makeMemoryScene;
  window.makeCipherScene = makeCipherScene;
  window.makeSignalScene = makeSignalScene;
  window.makeScene = makeScene;
  window.makeRun = makeRun;
  window.validateScene = validateScene;
  window.validateRuns = validateRuns;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
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
  };
}
