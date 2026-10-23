// js/game.js
// Reality Check - Game Engine and State Machine
// Owned by Aarushi

(function() {
  'use strict';

  // Game state object adhering to FILE_STRUCTURE.md section 3
  const state = {
    screen: 'start', // 'start' | 'round' | 'feedback' | 'results'
    run: [],         // five scenes from makeRun()
    roundIndex: 0,   // 0–4
    score: 0,
    locked: false,   // true once a round is resolved
    timerId: null,
    timeLeft: 0
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
      roundCounter: document.getElementById('round-counter'),
      timerBox: document.getElementById('timer-box'),
      timerCount: document.getElementById('timer-count'),
      scoreDisplay: document.getElementById('score-display'),
      ruleText: document.getElementById('rule-text'),
      scene: document.getElementById('scene'),
      feedback: document.getElementById('feedback'),
      feedbackMessage: document.getElementById('feedback-message'),
      feedbackExplanation: document.getElementById('feedback-explanation'),
      finalScore: document.getElementById('final-score'),
      verdictText: document.getElementById('verdict-text')
    };

    // Attach button listeners
    if (el.btnStart) {
      el.btnStart.addEventListener('click', startNewGame);
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
   * Stops any currently running timer.
   */
  function stopTimer() {
    if (state.timerId !== null) {
      clearInterval(state.timerId);
      state.timerId = null;
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
   * Starts a brand new game run of 5 scenes.
   */
  function startNewGame() {
    stopTimer();
    state.run = makeRun();
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

    showScreen('round');

    const scene = state.run[roundIndex];
    if (!scene) {
      console.warn('renderRound: No scene found for round', roundIndex);
      return;
    }

    // Update HUD
    if (el.roundCounter) {
      el.roundCounter.textContent = `Round ${roundIndex + 1} of 5`;
    }
    if (el.scoreDisplay) {
      el.scoreDisplay.textContent = `Score: ${state.score}`;
    }

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

    // Render Scene SVG
    renderSceneSVG(scene);

    // Start 20-second countdown timer
    startTimer(scene.timeLimitSec || 20);
  }

  /**
   * Builds and injects the SVG scene into #scene.
   * @param {Object} scene
   */
  function renderSceneSVG(scene) {
    if (!el.scene) return;
    el.scene.innerHTML = '';

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'scene-svg');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-label', `Round ${state.roundIndex + 1} anomaly scene`);

    // Ground line drawn once per scene by game.js (FILE_STRUCTURE.md section 5)
    const groundLine = document.createElementNS(svgNS, 'line');
    groundLine.setAttribute('x1', '0');
    groundLine.setAttribute('y1', '70');
    groundLine.setAttribute('x2', '100');
    groundLine.setAttribute('y2', '70');
    groundLine.setAttribute('class', 'ground-line');
    svg.appendChild(groundLine);

    // Render each figure via figures.js renderFigure contract
    scene.figures.forEach((figure, index) => {
      const positionLabel = `Figure ${index + 1} of ${scene.figures.length}`;
      let figureNode;

      if (typeof renderFigure === 'function') {
        figureNode = renderFigure(figure, positionLabel);
      } else {
        // Fallback plain-rectangle stub if figures.js is missing
        // TODO(purvesh): Replace with Purvesh's real figure geometry
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
   * Handles click events within the scene.
   * @param {MouseEvent} event
   */
  function handleSceneClick(event) {
    if (state.locked) return;

    // Find closest element with data-figure-id
    const target = event.target.closest('[data-figure-id]');
    if (!target) return;

    const figureId = target.getAttribute('data-figure-id');
    handleSelection(figureId);
  }

  /**
   * Handles keyboard Enter/Space activation within the scene.
   * @param {KeyboardEvent} event
   */
  function handleSceneKeyDown(event) {
    if (state.locked) return;

    if (event.key === 'Enter' || event.key === ' ' || event.code === 'Space') {
      const target = event.target.closest('[data-figure-id]');
      if (target) {
        event.preventDefault();
        const figureId = target.getAttribute('data-figure-id');
        handleSelection(figureId);
      }
    }
  }

  /**
   * Processes player figure selection.
   * @param {string} figureId
   */
  function handleSelection(figureId) {
    // Prevent double selection and selection after locked
    if (state.locked) return;
    state.locked = true;

    stopTimer();

    const scene = state.run[state.roundIndex];
    if (!scene) return;

    // Check if figure exists
    const figure = scene.figures.find(f => f.id === figureId);
    if (!figure) {
      console.warn('handleSelection: Unknown figure ID:', figureId);
      return;
    }

    const isCorrect = (figureId === scene.answerId);

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
      // Visually flag the wrong selection
      const wrongEl = el.scene.querySelector(`.figure-container[data-figure-id="${figureId}"]`);
      if (wrongEl) {
        wrongEl.classList.add('figure-selected-wrong');
      }
    }

    // Highlight the correct floating figure
    const answerEl = el.scene.querySelector(`.figure-container[data-figure-id="${scene.answerId}"]`);
    if (answerEl) {
      answerEl.classList.add('highlight-anomaly');
    }

    // Provide explanation
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

    // Timeout scores 0 points
    if (el.feedbackMessage) {
      el.feedbackMessage.textContent = "Time's up";
      el.feedbackMessage.className = 'feedback-message feedback-timeout';
    }

    // Highlight the correct figure
    const answerEl = el.scene.querySelector(`.figure-container[data-figure-id="${scene.answerId}"]`);
    if (answerEl) {
      answerEl.classList.add('highlight-anomaly');
    }

    // Show explanation
    if (el.feedbackExplanation) {
      el.feedbackExplanation.textContent = scene.explanation;
    }

    // Reveal feedback and focus Next
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
    if (!state.locked) return; // Prevent advancing if round is not resolved

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
    // 5 = "Clear sight", 3-4 = "Sharp eyes", 0-2 = "Reality slipped"
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
   * Restarts the game without reloading the page.
   */
  function restart() {
    startNewGame();
  }

  // Expose game controller to window adhering to AI_RULES.md section 5
  const game = {
    state: state,
    init: init,
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
