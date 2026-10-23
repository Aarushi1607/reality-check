// js/game.js
// Reality Check - Game Engine and State Machine
// Owned by Aarushi

(function() {
  'use strict';

  // Game state object adhering to FILE_STRUCTURE.md section 3 + multi-discipline support
  const state = {
    screen: 'start',      // 'start' | 'round' | 'feedback' | 'results'
    gameMode: 'investigation', // 'investigation' (full 5-round trial) | 'gravity' (classic)
    run: [],              // five scenes from makeRun()
    roundIndex: 0,        // 0–4
    score: 0,
    locked: false,        // true once a round is resolved
    timerId: null,
    timeLeft: 0,
    // Mini-game memory tracking
    memoryPlaybackTimers: [],
    memoryInputActive: false,
    userMemorySequence: []
  };

  // DOM element references
  let screens = {};
  let el = {};

  /**
   * Initializes DOM references and attaches event listeners.
   */
  function init() {
    screens = {
      start: document.getElementById('screen-start'),
      round: document.getElementById('screen-round'),
      results: document.getElementById('screen-results')
    };

    el = {
      btnStart: document.getElementById('btn-start'),
      btnRestart: document.getElementById('btn-restart'),
      btnNext: document.getElementById('btn-next'),
      modeInvestigation: document.getElementById('mode-investigation'),
      modeGravity: document.getElementById('mode-gravity'),
      roundCounter: document.getElementById('round-counter'),
      challengeBadge: document.getElementById('challenge-badge'),
      timerBox: document.getElementById('timer-box'),
      timerCount: document.getElementById('timer-count'),
      scoreDisplay: document.getElementById('score-display'),
      ruleText: document.getElementById('rule-text'),
      scene: document.getElementById('scene'),
      feedback: document.getElementById('feedback'),
      feedbackMessage: document.getElementById('feedback-message'),
      feedbackExplanation: document.getElementById('feedback-explanation'),
      finalScore: document.getElementById('final-score'),
      verdictText: document.getElementById('verdict-text'),
      progressNodes: document.querySelectorAll('.progress-node')
    };

    // Mode Selector on Start Screen
    if (el.modeInvestigation) {
      el.modeInvestigation.addEventListener('click', () => setMode('investigation'));
    }
    if (el.modeGravity) {
      el.modeGravity.addEventListener('click', () => setMode('gravity'));
    }

    // Attach button listeners
    if (el.btnStart) {
      el.btnStart.addEventListener('click', () => startNewGame(state.gameMode));
    }

    if (el.btnRestart) {
      el.btnRestart.addEventListener('click', restart);
    }

    if (el.btnNext) {
      el.btnNext.addEventListener('click', handleNext);
    }

    // Delegated event listener for scene interactions (clicks and keyboard)
    if (el.scene) {
      el.scene.addEventListener('click', handleSceneClick);
      el.scene.addEventListener('keydown', handleSceneKeyDown);
    }

    // Initial screen
    showScreen('start');
  }

  /**
   * Switches the active game mode from the start screen.
   * @param {string} mode - 'investigation' | 'gravity'
   */
  function setMode(mode) {
    state.gameMode = mode;
    if (el.modeInvestigation && el.modeGravity) {
      if (mode === 'investigation') {
        el.modeInvestigation.classList.add('mode-selected');
        el.modeGravity.classList.remove('mode-selected');
        el.modeInvestigation.setAttribute('aria-pressed', 'true');
        el.modeGravity.setAttribute('aria-pressed', 'false');
      } else {
        el.modeGravity.classList.add('mode-selected');
        el.modeInvestigation.classList.remove('mode-selected');
        el.modeGravity.setAttribute('aria-pressed', 'true');
        el.modeInvestigation.setAttribute('aria-pressed', 'false');
      }
    }
  }

  /**
   * Displays the specified screen and hides all others.
   * @param {string} screenName - 'start' | 'round' | 'results'
   */
  function showScreen(screenName) {
    state.screen = screenName;
    Object.keys(screens).forEach(key => {
      const section = screens[key];
      if (section) {
        if (key === screenName) {
          section.classList.remove('hidden');
        } else {
          section.classList.add('hidden');
        }
      }
    });
  }

  /**
   * Stops any currently running timers and memory sequence playback.
   */
  function stopTimer() {
    if (state.timerId !== null) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
    clearMemoryTimers();
  }

  function clearMemoryTimers() {
    if (state.memoryPlaybackTimers && state.memoryPlaybackTimers.length > 0) {
      state.memoryPlaybackTimers.forEach(id => clearTimeout(id));
      state.memoryPlaybackTimers = [];
    }
  }

  /**
   * Starts the countdown timer for the active round.
   * @param {number} seconds
   */
  function startTimer(seconds) {
    stopTimer();
    state.timeLeft = seconds;
    updateTimerDisplay();

    state.timerId = setInterval(() => {
      state.timeLeft -= 1;
      updateTimerDisplay();

      if (state.timeLeft <= 0) {
        stopTimer();
        handleTimeout();
      }
    }, 1000);
  }

  /**
   * Updates the timer display element and urgent visual state.
   */
  function updateTimerDisplay() {
    if (el.timerCount) {
      el.timerCount.textContent = Math.max(0, state.timeLeft);
    }
    if (el.timerBox) {
      if (state.timeLeft <= 5) {
        el.timerBox.classList.add('timer-urgent');
      } else {
        el.timerBox.classList.remove('timer-urgent');
      }
    }
  }

  /**
   * Updates the 5 dimensional progress nodes in the HUD.
   * @param {number} currentRound
   */
  function updateProgressNodes(currentRound) {
    const nodes = document.querySelectorAll('.progress-node');
    nodes.forEach((node, idx) => {
      if (idx < currentRound) {
        node.className = 'progress-node node-completed';
      } else if (idx === currentRound) {
        node.className = 'progress-node node-active';
      } else {
        node.className = 'progress-node node-pending';
      }
    });
  }

  /**
   * Starts a brand new game run of 5 scenes.
   * @param {string} [mode]
   */
  function startNewGame(mode) {
    stopTimer();
    const activeMode = mode || state.gameMode || 'investigation';
    state.gameMode = activeMode;
    state.run = (typeof makeRun === 'function') ? makeRun(activeMode) : [];
    state.roundIndex = 0;
    state.score = 0;
    state.locked = false;

    renderRound(0);
  }

  /**
   * Renders the specified round index (0 to 4).
   * @param {number} roundIndex
   */
  function renderRound(roundIndex) {
    stopTimer();
    state.screen = 'round';
    state.roundIndex = roundIndex;
    state.locked = false;
    state.userMemorySequence = [];
    state.memoryInputActive = false;

    showScreen('round');

    const scene = state.run[roundIndex];
    if (!scene) {
      console.warn('renderRound: No scene found for round', roundIndex);
      return;
    }

    // Update HUD items
    if (el.roundCounter) {
      el.roundCounter.textContent = `Round ${roundIndex + 1} of 5`;
    }
    if (el.challengeBadge) {
      el.challengeBadge.textContent = scene.title || `PROTOCOL: ${scene.challenge.toUpperCase()}`;
    }
    if (el.scoreDisplay) {
      el.scoreDisplay.textContent = `Score: ${state.score}`;
    }
    updateProgressNodes(roundIndex);

    // Update Rule Text (real text, screen-reader readable)
    if (el.ruleText) {
      el.ruleText.textContent = scene.rule;
    }

    // Reset feedback live region and next button
    if (el.feedback) {
      el.feedback.classList.add('hidden');
    }
    if (el.feedbackMessage) {
      el.feedbackMessage.textContent = '';
      el.feedbackMessage.className = 'feedback-message';
    }
    if (el.feedbackExplanation) {
      el.feedbackExplanation.textContent = '';
    }
    if (el.btnNext) {
      el.btnNext.classList.add('hidden');
      el.btnNext.textContent = (roundIndex === 4) ? 'View Results' : 'Next';
    }

    // Dispatch scene rendering based on challenge type
    if (scene.challenge === 'memory') {
      renderMemoryScene(scene);
    } else if (scene.challenge === 'cipher') {
      renderCipherScene(scene);
    } else if (scene.challenge === 'signal') {
      renderSignalScene(scene);
    } else {
      renderGravityScene(scene);
      startTimer(scene.timeLimitSec || 20);
    }
  }

  // =========================================================================
  // SCENE RENDERERS
  // =========================================================================

  /**
   * Renders the classic Gravity Glitch spatial anomaly scene.
   * @param {Object} scene
   */
  function renderGravityScene(scene) {
    if (!el.scene) return;
    el.scene.innerHTML = '';

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'scene-svg');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-label', `Round ${state.roundIndex + 1} Gravity Glitch anomaly scene`);

    // Ground line drawn once per scene by game.js (FILE_STRUCTURE.md section 5)
    const groundLine = document.createElementNS(svgNS, 'line');
    groundLine.setAttribute('x1', '0');
    groundLine.setAttribute('y1', '70');
    groundLine.setAttribute('x2', '100');
    groundLine.setAttribute('y2', '70');
    groundLine.setAttribute('class', 'ground-line');
    svg.appendChild(groundLine);

    // Render each figure via Purvesh's renderFigure contract
    scene.figures.forEach((figure, index) => {
      const positionLabel = `Figure ${index + 1} of ${scene.figures.length}`;
      let figureNode;

      if (typeof renderFigure === 'function') {
        figureNode = renderFigure(figure, positionLabel);
      } else {
        // Fallback plain-rectangle stub if figures.js is missing
        figureNode = document.createElementNS(svgNS, 'g');
        figureNode.setAttribute('class', 'figure-container');
        figureNode.setAttribute('data-figure-id', figure.id);
        figureNode.setAttribute('transform', `translate(${figure.x}, ${figure.y})`);

        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('x', '-5');
        rect.setAttribute('y', `${-20 - (figure.lift || 0)}`);
        rect.setAttribute('width', '10');
        rect.setAttribute('height', '20');
        rect.setAttribute('fill', '#f0e6d6');
        rect.setAttribute('class', 'figure-part');

        const hit = document.createElementNS(svgNS, 'rect');
        hit.setAttribute('x', '-7');
        hit.setAttribute('y', `${-25 - (figure.lift || 0)}`);
        hit.setAttribute('width', '14');
        hit.setAttribute('height', '30');
        hit.setAttribute('class', 'figure-hotspot');
        hit.setAttribute('data-figure-id', figure.id);
        hit.setAttribute('role', 'button');
        hit.setAttribute('tabindex', '0');
        hit.setAttribute('aria-label', positionLabel);
        hit.setAttribute('fill', 'transparent');

        figureNode.appendChild(rect);
        figureNode.appendChild(hit);
      }

      svg.appendChild(figureNode);
    });

    el.scene.appendChild(svg);
  }

  /**
   * Renders the Hawkins Lab Memory Sequence scene and handles illumination playback.
   * @param {Object} scene
   */
  function renderMemoryScene(scene) {
    if (!el.scene) return;
    el.scene.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'memory-game-container';

    // Status / instructions bar
    const statusBar = document.createElement('div');
    statusBar.className = 'memory-status-bar';
    statusBar.id = 'memory-status';
    statusBar.textContent = '[ TRANSMITTING PSYCHIC SEQUENCE: STAND BY ]';

    // Sequence progress dots
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'memory-dots-container';
    scene.sequence.forEach((_, idx) => {
      const dot = document.createElement('span');
      dot.className = 'memory-dot';
      dot.id = `memory-dot-${idx}`;
      dot.textContent = '◇';
      dotsContainer.appendChild(dot);
    });

    // 4 Sensory CRT Panels
    const panelsGrid = document.createElement('div');
    panelsGrid.className = 'memory-panels-grid';

    scene.panels.forEach((p, idx) => {
      const panelBtn = document.createElement('button');
      panelBtn.type = 'button';
      panelBtn.className = `memory-panel memory-panel-${p.color}`;
      panelBtn.id = `panel-${p.id}`;
      panelBtn.setAttribute('data-panel-id', p.id);
      panelBtn.setAttribute('role', 'button');
      panelBtn.setAttribute('tabindex', '0');
      panelBtn.setAttribute('aria-label', `Sensory Panel ${p.num}: ${p.code}`);

      panelBtn.innerHTML = `
        <div class="panel-lamp" aria-hidden="true"></div>
        <div class="panel-code">${p.code}</div>
        <div class="panel-number">${p.num}</div>
      `;

      panelsGrid.appendChild(panelBtn);
    });

    container.appendChild(statusBar);
    container.appendChild(dotsContainer);
    container.appendChild(panelsGrid);
    el.scene.appendChild(container);

    // Playback sequence automatically after short initial pause
    state.memoryInputActive = false;
    clearMemoryTimers();

    const initialDelay = 600;
    const stepDuration = 500;
    const gap = 200;

    scene.sequence.forEach((panelId, idx) => {
      const timerOn = setTimeout(() => {
        flashPanel(panelId, 450);
      }, initialDelay + idx * (stepDuration + gap));
      state.memoryPlaybackTimers.push(timerOn);
    });

    // Enable player input and start 20s timer after sequence playback finishes
    const totalPlaybackTime = initialDelay + scene.sequence.length * (stepDuration + gap);
    const startTimerId = setTimeout(() => {
      state.memoryInputActive = true;
      if (statusBar) {
        statusBar.textContent = '[ YOUR TURN: REPEAT SENSORY SEQUENCE ]';
        statusBar.classList.add('status-ready');
      }
      startTimer(scene.timeLimitSec || 20);
    }, totalPlaybackTime);
    state.memoryPlaybackTimers.push(startTimerId);
  }

  /**
   * Flashes a memory panel with illuminated pulse effect.
   * @param {string} panelId
   * @param {number} durationMs
   */
  function flashPanel(panelId, durationMs = 400) {
    const panel = document.getElementById(`panel-${panelId}`);
    if (panel) {
      panel.classList.add('panel-lit');
      setTimeout(() => {
        panel.classList.remove('panel-lit');
      }, durationMs);
    }
  }

  /**
   * Handles user interaction with a sensory memory panel.
   * @param {string} panelId
   */
  function handleMemoryPanelInput(panelId) {
    if (state.locked || !state.memoryInputActive) return;

    const scene = state.run[state.roundIndex];
    if (!scene || scene.challenge !== 'memory') return;

    // Flash the panel on user press
    flashPanel(panelId, 250);

    const stepIndex = state.userMemorySequence.length;
    const expectedPanel = scene.sequence[stepIndex];

    if (panelId === expectedPanel) {
      // Correct step
      state.userMemorySequence.push(panelId);
      const dot = document.getElementById(`memory-dot-${stepIndex}`);
      if (dot) {
        dot.textContent = '◆';
        dot.classList.add('dot-filled');
      }

      // Check if full sequence completed
      if (state.userMemorySequence.length === scene.sequence.length) {
        state.memoryInputActive = false;
        handleSelection(scene.answerId);
      }
    } else {
      // Wrong step
      state.memoryInputActive = false;
      const dot = document.getElementById(`memory-dot-${stepIndex}`);
      if (dot) {
        dot.textContent = '✕';
        dot.classList.add('dot-wrong');
      }
      handleSelection('wrong-sequence');
    }
  }

  /**
   * Renders the Gate Cipher Pattern Logic scene.
   * @param {Object} scene
   */
  function renderCipherScene(scene) {
    if (!el.scene) return;
    el.scene.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'cipher-game-container';

    // Sequence display banner
    const seqBanner = document.createElement('div');
    seqBanner.className = 'cipher-sequence-banner';
    seqBanner.setAttribute('aria-label', 'Pattern sequence display');

    scene.displaySequence.forEach(item => {
      const node = document.createElement('div');
      if (item === '?') {
        node.className = 'cipher-node cipher-node-missing';
        node.innerHTML = `<span>?</span><div class="node-glow" aria-hidden="true"></div>`;
      } else {
        node.className = 'cipher-node';
        node.textContent = item;
      }
      seqBanner.appendChild(node);
    });

    // Option cards grid (4 choices)
    const optionsGrid = document.createElement('div');
    optionsGrid.className = 'cipher-options-grid';
    optionsGrid.setAttribute('role', 'group');
    optionsGrid.setAttribute('aria-label', 'Decryption options');

    scene.options.forEach((opt, idx) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'cipher-card';
      card.id = `opt-${opt.id}`;
      card.setAttribute('data-cipher-id', opt.id);
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Option ${idx + 1}: ${opt.label} (${opt.symbol})`);

      card.innerHTML = `
        <div class="card-badge">DECRYPT [ ${String.fromCharCode(65 + idx)} ]</div>
        <div class="cipher-symbol">${opt.symbol}</div>
        <div class="cipher-label">${opt.label}</div>
      `;

      optionsGrid.appendChild(card);
    });

    container.appendChild(seqBanner);
    container.appendChild(optionsGrid);
    el.scene.appendChild(container);

    startTimer(scene.timeLimitSec || 20);
  }

  /**
   * Renders the Radio Interference Signal Deduction scene.
   * @param {Object} scene
   */
  function renderSignalScene(scene) {
    if (!el.scene) return;
    el.scene.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'signal-game-container';

    const signalsGrid = document.createElement('div');
    signalsGrid.className = 'signal-grid';
    signalsGrid.setAttribute('role', 'group');
    signalsGrid.setAttribute('aria-label', 'Radio frequency channels');

    scene.signals.forEach((sig, idx) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'signal-card';
      card.id = `sig-${sig.id}`;
      card.setAttribute('data-signal-id', sig.id);
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `${sig.label}: Frequency ${sig.freq}`);

      const waveSvg = generateOscilloscopeSVG(sig.type);

      card.innerHTML = `
        <div class="signal-header">
          <span class="signal-tag">${sig.label}</span>
          <span class="signal-freq">${sig.freq}</span>
        </div>
        <div class="oscilloscope-screen">
          <div class="oscilloscope-grid" aria-hidden="true"></div>
          ${waveSvg}
        </div>
        <div class="signal-action">SELECT ANOMALY</div>
      `;

      signalsGrid.appendChild(card);
    });

    container.appendChild(signalsGrid);
    el.scene.appendChild(container);

    startTimer(scene.timeLimitSec || 20);
  }

  /**
   * Generates inline SVG waveform path based on signal type.
   * @param {string} waveType
   * @returns {string} SVG string
   */
  function generateOscilloscopeSVG(waveType) {
    let pathD = '';

    if (waveType === 'sine-5') {
      // 5 cycles sine wave (anomalous high frequency)
      pathD = 'M 0 35 Q 10 10, 20 35 T 40 35 T 60 35 T 80 35 T 100 35 T 120 35 T 140 35 T 160 35 T 180 35 T 200 35';
    } else if (waveType === 'amp-surge') {
      // Extreme high-amplitude surge
      pathD = 'M 0 35 Q 25 -5, 50 35 T 100 35 Q 125 75, 150 35 T 200 35';
    } else if (waveType === 'amp-low') {
      // Steady low-amplitude wave
      pathD = 'M 0 35 Q 25 25, 50 35 T 100 35 T 150 35 T 200 35';
    } else if (waveType === 'glitch-square') {
      // Unnatural digital square / stepped glitch
      pathD = 'M 0 35 L 25 35 L 25 15 L 50 15 L 50 55 L 75 55 L 75 35 L 125 35 L 125 10 L 150 10 L 150 60 L 175 60 L 175 35 L 200 35';
    } else if (waveType === 'phase-inverted') {
      // Starts with downward negative trough first
      pathD = 'M 0 35 Q 25 55, 50 35 T 100 35 T 150 35 T 200 35';
    } else {
      // Standard 3-cycle harmonic sine wave
      pathD = 'M 0 35 Q 16.6 15, 33.3 35 T 66.6 35 T 100 35 T 133.3 35 T 166.6 35 T 200 35';
    }

    return `
      <svg viewBox="0 0 200 70" class="oscilloscope-svg" preserveAspectRatio="none" aria-hidden="true">
        <path d="${pathD}" class="oscilloscope-trace" />
      </svg>
    `;
  }

  // =========================================================================
  // INTERACTION DISPATCH
  // =========================================================================

  /**
   * Handles click events across all challenge types.
   * @param {MouseEvent} event
   */
  function handleSceneClick(event) {
    if (state.locked) return;

    // 1. Gravity figure hotspot
    const figureTarget = event.target.closest('[data-figure-id]');
    if (figureTarget) {
      const figureId = figureTarget.getAttribute('data-figure-id');
      handleSelection(figureId);
      return;
    }

    // 2. Memory panel
    const panelTarget = event.target.closest('[data-panel-id]');
    if (panelTarget) {
      const panelId = panelTarget.getAttribute('data-panel-id');
      handleMemoryPanelInput(panelId);
      return;
    }

    // 3. Gate Cipher card
    const cipherTarget = event.target.closest('[data-cipher-id]');
    if (cipherTarget) {
      const optId = cipherTarget.getAttribute('data-cipher-id');
      handleSelection(optId);
      return;
    }

    // 4. Radio Signal card
    const signalTarget = event.target.closest('[data-signal-id]');
    if (signalTarget) {
      const sigId = signalTarget.getAttribute('data-signal-id');
      handleSelection(sigId);
      return;
    }
  }

  /**
   * Handles keyboard Enter/Space activation across all challenge types.
   * @param {KeyboardEvent} event
   */
  function handleSceneKeyDown(event) {
    if (state.locked) return;

    if (event.key === 'Enter' || event.key === ' ' || event.code === 'Space') {
      const activeEl = document.activeElement;
      if (!activeEl) return;

      const figureTarget = activeEl.closest('[data-figure-id]');
      if (figureTarget) {
        event.preventDefault();
        handleSelection(figureTarget.getAttribute('data-figure-id'));
        return;
      }

      const panelTarget = activeEl.closest('[data-panel-id]');
      if (panelTarget) {
        event.preventDefault();
        handleMemoryPanelInput(panelTarget.getAttribute('data-panel-id'));
        return;
      }

      const cipherTarget = activeEl.closest('[data-cipher-id]');
      if (cipherTarget) {
        event.preventDefault();
        handleSelection(cipherTarget.getAttribute('data-cipher-id'));
        return;
      }

      const signalTarget = activeEl.closest('[data-signal-id]');
      if (signalTarget) {
        event.preventDefault();
        handleSelection(signalTarget.getAttribute('data-signal-id'));
        return;
      }
    }
  }

  /**
   * Processes player selection across all challenge types.
   * @param {string} selectionId
   */
  function handleSelection(selectionId) {
    if (state.locked) return;
    state.locked = true;

    stopTimer();

    const scene = state.run[state.roundIndex];
    if (!scene) return;

    const isCorrect = (selectionId === scene.answerId);

    if (isCorrect) {
      state.score += 1;
      if (el.feedbackMessage) {
        el.feedbackMessage.textContent = 'Correct';
        el.feedbackMessage.className = 'feedback-message feedback-correct';
      }
    } else {
      if (el.feedbackMessage) {
        el.feedbackMessage.textContent = 'Not this one';
        el.feedbackMessage.className = 'feedback-message feedback-incorrect';
      }
    }

    // Highlight anomalies based on challenge type
    highlightSceneResults(scene, selectionId, isCorrect);

    // Provide explanation in designated live region
    if (el.feedbackExplanation) {
      el.feedbackExplanation.textContent = scene.explanation;
    }

    // Update running score display
    if (el.scoreDisplay) {
      el.scoreDisplay.textContent = `Score: ${state.score}`;
    }

    // Reveal feedback live region and Next button
    if (el.feedback) {
      el.feedback.classList.remove('hidden');
    }
    if (el.btnNext) {
      el.btnNext.classList.remove('hidden');
      el.btnNext.focus();
    }
  }

  /**
   * Highlights target and chosen elements according to challenge type.
   * @param {Object} scene
   * @param {string} selectionId
   * @param {boolean} isCorrect
   */
  function highlightSceneResults(scene, selectionId, isCorrect) {
    if (scene.challenge === 'gravity') {
      const answerEl = el.scene.querySelector(`.figure-container[data-figure-id="${scene.answerId}"]`);
      if (answerEl) {
        answerEl.classList.add('highlight-anomaly');
      }
      if (!isCorrect) {
        const wrongEl = el.scene.querySelector(`.figure-container[data-figure-id="${selectionId}"]`);
        if (wrongEl) wrongEl.classList.add('figure-selected-wrong');
      }
    } else if (scene.challenge === 'cipher') {
      const answerEl = document.getElementById(`opt-${scene.answerId}`);
      if (answerEl) answerEl.classList.add('cipher-card-correct');
      if (!isCorrect) {
        const wrongEl = document.getElementById(`opt-${selectionId}`);
        if (wrongEl) wrongEl.classList.add('cipher-card-wrong');
      }
    } else if (scene.challenge === 'signal') {
      const answerEl = document.getElementById(`sig-${scene.answerId}`);
      if (answerEl) answerEl.classList.add('signal-card-anomaly');
      if (!isCorrect) {
        const wrongEl = document.getElementById(`sig-${selectionId}`);
        if (wrongEl) wrongEl.classList.add('signal-card-wrong');
      }
    } else if (scene.challenge === 'memory') {
      const panels = el.scene.querySelectorAll('.memory-panel');
      if (isCorrect) {
        panels.forEach(p => p.classList.add('panel-sequence-correct'));
      } else {
        panels.forEach(p => p.classList.add('panel-sequence-wrong'));
      }
    }
  }

  /**
   * Handles round expiration when the 20-second timer reaches 0.
   */
  function handleTimeout() {
    if (state.locked) return;
    state.locked = true;

    stopTimer();
    state.timeLeft = 0;
    updateTimerDisplay();

    const scene = state.run[state.roundIndex];
    if (!scene) return;

    if (el.feedbackMessage) {
      el.feedbackMessage.textContent = "Time's up";
      el.feedbackMessage.className = 'feedback-message feedback-timeout';
    }

    highlightSceneResults(scene, null, false);

    if (el.feedbackExplanation) {
      el.feedbackExplanation.textContent = scene.explanation;
    }

    if (el.feedback) {
      el.feedback.classList.remove('hidden');
    }
    if (el.btnNext) {
      el.btnNext.classList.remove('hidden');
      el.btnNext.focus();
    }
  }

  /**
   * Advances to next round or transitions to results screen.
   */
  function handleNext() {
    if (!state.locked) return;

    if (state.roundIndex < 4) {
      renderRound(state.roundIndex + 1);
    } else {
      showResults();
    }
  }

  /**
   * Displays the results screen with final score and score-band verdict.
   */
  function showResults() {
    stopTimer();
    state.screen = 'results';
    showScreen('results');

    if (el.finalScore) {
      el.finalScore.textContent = `Score: ${state.score} / 5`;
    }

    // Determine verdict by score band (PRD US-06 AC2)
    let verdict = 'Reality slipped';
    if (state.score === 5) {
      verdict = (typeof TEMPLATES !== 'undefined' && TEMPLATES.verdicts) ? TEMPLATES.verdicts.perfect : 'Clear sight';
    } else if (state.score >= 3) {
      verdict = (typeof TEMPLATES !== 'undefined' && TEMPLATES.verdicts) ? TEMPLATES.verdicts.sharp : 'Sharp eyes';
    } else {
      verdict = (typeof TEMPLATES !== 'undefined' && TEMPLATES.verdicts) ? TEMPLATES.verdicts.slipped : 'Reality slipped';
    }

    if (el.verdictText) {
      el.verdictText.textContent = verdict;
    }

    if (el.btnRestart) {
      el.btnRestart.focus();
    }
  }

  /**
   * Restarts the game with a freshly generated run without page reload.
   */
  function restart() {
    startNewGame(state.gameMode);
  }

  // Expose game controller to window adhering to AI_RULES.md section 5
  const game = {
    state: state,
    init: init,
    setMode: setMode,
    startNewGame: startNewGame,
    renderRound: renderRound,
    handleSelection: handleSelection,
    handleTimeout: handleTimeout,
    handleNext: handleNext,
    showResults: showResults,
    restart: restart
  };

  if (typeof window !== 'undefined') {
    window.game = game;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = game;
  }
})();
