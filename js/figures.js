// js/figures.js
// Figure rendering contract implementation
// TODO(purvesh): Temporary stub for figure geometry and hotspot. Replace with Purvesh's final figure art.

/**
 * Renders a single figure into an SVG <g> element according to FILE_STRUCTURE.md section 5.
 * @param {Object} figure - { id: string, x: number, y: number, lift: number }
 * @param {string} positionLabel - E.g. "Figure 1 of 4"
 * @returns {SVGGElement} SVG group containing the figure geometry and accessible hotspot
 */
function renderFigure(figure, positionLabel) {
  const svgNS = 'http://www.w3.org/2000/svg';
  
  // Outer group representing this figure
  const figureGroup = document.createElementNS(svgNS, 'g');
  figureGroup.setAttribute('class', 'figure-container');
  figureGroup.setAttribute('data-figure-id', figure.id);
  figureGroup.setAttribute('transform', `translate(${figure.x}, ${figure.y})`);

  // Subgroup with lift transform applied
  // transform="translate(0, -lift)" applied to the group (FILE_STRUCTURE.md section 5)
  const liftGroup = document.createElementNS(svgNS, 'g');
  liftGroup.setAttribute('class', 'figure-lift-group');
  liftGroup.setAttribute('transform', `translate(0, -${figure.lift || 0})`);

  // Shared humanoid shape (head, torso, arms, legs) / stub geometry
  // Geometric silhouette humanoid with retro 80s / eerie dimensional styling
  const visualGroup = document.createElementNS(svgNS, 'g');
  visualGroup.setAttribute('class', 'figure-visual');

  // Head
  const head = document.createElementNS(svgNS, 'circle');
  head.setAttribute('cx', '0');
  head.setAttribute('cy', '-18');
  head.setAttribute('r', '2.8');
  head.setAttribute('class', 'figure-part figure-head');

  // Torso / Jacket
  const torso = document.createElementNS(svgNS, 'path');
  torso.setAttribute('d', 'M -2 -15 L 2 -15 L 3 -7 L -3 -7 Z');
  torso.setAttribute('class', 'figure-part figure-torso');

  // Left Arm
  const leftArm = document.createElementNS(svgNS, 'line');
  leftArm.setAttribute('x1', '-2.5');
  leftArm.setAttribute('y1', '-14');
  leftArm.setAttribute('x2', '-4.5');
  leftArm.setAttribute('y2', '-7');
  leftArm.setAttribute('stroke-width', '1.2');
  leftArm.setAttribute('stroke-linecap', 'round');
  leftArm.setAttribute('class', 'figure-part figure-arm');

  // Right Arm
  const rightArm = document.createElementNS(svgNS, 'line');
  rightArm.setAttribute('x1', '2.5');
  rightArm.setAttribute('y1', '-14');
  rightArm.setAttribute('x2', '4.5');
  rightArm.setAttribute('y2', '-7');
  rightArm.setAttribute('stroke-width', '1.2');
  rightArm.setAttribute('stroke-linecap', 'round');
  rightArm.setAttribute('class', 'figure-part figure-arm');

  // Left Leg
  const leftLeg = document.createElementNS(svgNS, 'line');
  leftLeg.setAttribute('x1', '-1.5');
  leftLeg.setAttribute('y1', '-7');
  leftLeg.setAttribute('x2', '-2');
  leftLeg.setAttribute('y2', '0');
  leftLeg.setAttribute('stroke-width', '1.5');
  leftLeg.setAttribute('stroke-linecap', 'round');
  leftLeg.setAttribute('class', 'figure-part figure-leg');

  // Right Leg
  const rightLeg = document.createElementNS(svgNS, 'line');
  rightLeg.setAttribute('x1', '1.5');
  rightLeg.setAttribute('y1', '-7');
  rightLeg.setAttribute('x2', '2');
  rightLeg.setAttribute('y2', '0');
  rightLeg.setAttribute('stroke-width', '1.5');
  rightLeg.setAttribute('stroke-linecap', 'round');
  rightLeg.setAttribute('class', 'figure-part figure-leg');

  // Anomaly shadow / aura indicator (glows when revealed or highlighted)
  const aura = document.createElementNS(svgNS, 'ellipse');
  aura.setAttribute('cx', '0');
  aura.setAttribute('cy', '-10');
  aura.setAttribute('rx', '6');
  aura.setAttribute('ry', '12');
  aura.setAttribute('class', 'figure-aura');

  visualGroup.appendChild(aura);
  visualGroup.appendChild(head);
  visualGroup.appendChild(torso);
  visualGroup.appendChild(leftArm);
  visualGroup.appendChild(rightArm);
  visualGroup.appendChild(leftLeg);
  visualGroup.appendChild(rightLeg);

  // Ground shadow below figure
  const groundShadow = document.createElementNS(svgNS, 'ellipse');
  groundShadow.setAttribute('cx', '0');
  groundShadow.setAttribute('cy', '0.5');
  groundShadow.setAttribute('rx', figure.lift > 0 ? '1.5' : '3');
  groundShadow.setAttribute('ry', figure.lift > 0 ? '0.3' : '0.7');
  groundShadow.setAttribute('class', 'figure-ground-shadow');
  groundShadow.setAttribute('opacity', figure.lift > 0 ? '0.3' : '0.8');

  // Transparent hit element at least 44x44 px (FILE_STRUCTURE.md section 5)
  // Scaled in SVG coordinate space to exceed 44x44px in rendered pixels
  const hotspot = document.createElementNS(svgNS, 'rect');
  hotspot.setAttribute('x', '-7');
  hotspot.setAttribute('y', '-25');
  hotspot.setAttribute('width', '14');
  hotspot.setAttribute('height', '28');
  hotspot.setAttribute('class', 'figure-hotspot');
  hotspot.setAttribute('data-figure-id', figure.id);
  hotspot.setAttribute('role', 'button');
  hotspot.setAttribute('tabindex', '0');
  hotspot.setAttribute('aria-label', positionLabel);
  hotspot.setAttribute('fill', 'transparent');
  hotspot.setAttribute('pointer-events', 'all');

  liftGroup.appendChild(visualGroup);
  liftGroup.appendChild(hotspot);

  figureGroup.appendChild(groundShadow);
  figureGroup.appendChild(liftGroup);

  return figureGroup;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.renderFigure = renderFigure;
}

// Export for Node testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    renderFigure
  };
}
