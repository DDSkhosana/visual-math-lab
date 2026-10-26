/**
 * @file trig-core.js
 * Unified 2D Canvas, 3D Three.js (BaseScene3DView + LabelOverlay3D), Telemetry,
 * Tokenized Collapsible Derivation Cards, and WorkspaceDockManager Controller
 * for the Trigonometry Suite.
 *
 * Strictly aligned with the Circle Theorems Suite in:
 * - Mathematical drawing conventions (sharp vector arrowheads with zero apex globes,
 *   discrete 0.18 3D vertex markers, radial outward halo labels, vector-bisector angle badges).
 * - 2D & 3D Angle & Area Shading (makeAngleWedgeMesh, setAngleWedgeVertices3D,
 *   makeRightAngleMesh, setRightAngle3DVertices, 2D/3D conjugate reflex wedges).
 * - Bidirectional 2D & 3D Canvas interactivity (vertex hit-testing, direct circumference
 *   radius drag, canvas background pan + double-click reset, wheel zoom, 3D raycast drag).
 * - UnitSystemConverter-aware numerical deductions and cardTemplate derivation cards.
 */

import {
  PALETTE,
  clamp,
  toRadians,
  toDegrees,
  normalizeAngle,
  pointerToAngle,
  isNearCircumference,
  createStore,
  Panel,
  DraggableToolbar,
  TelemetryPanel,
  bindFullscreen,
  initCollapsibleSections,
  bindStandardToggles,
  PlaybackController,
  UnitSystemConverter,
  draw2DCartesianGrid,
  drawHaloText,
  drawLabelledPoint,
  drawRadialLabelledPoint,
  drawTextBadge,
  drawRightAngle,
  drawAngleWedge,
  drawReflexWedge,
  drawArrow,
  getRadialLabelCoords,
  getPointLabel,
  createDefaultVisState,
  computeOptimalViewportRadius,
} from '../../../js/circle-core.js';

export { computeOptimalViewportRadius };

import {
  loadThree,
  NullScene3DView,
  ViewModeController,
  BaseScene3DView,
  AXES_3D_LABELS,
  makeAngleWedgeMesh,
  makeRightAngleMesh,
  setAngleWedgeVertices3D,
  setRightAngle3DVertices,
  get3DAngleBisector,
  get3DReflexBisector,
  get3DAngleDegrees,
} from '../../../js/circle-3d.js';

import { cardTemplate, tag, fmtAngle, fmtLength } from '../../../js/circle-derivations.js';

import {
  TAU,
  computeUnitCircleHelix,
  computeLawOfSines,
  computeSphericalLawOfSines,
  computeLawOfCosines,
  computeSphericalLawOfCosines,
  computeAngleSumIdentities,
  computeSpatialAngleSumEuler,
} from './trig-math.js';

import { HarmonicSonifier } from './harmonic-sonifier.js';

/* ============================================================================
   1. INITIAL STATE FACTORY & GEOMETRY HELPERS
   ============================================================================ */

export function createTrigInitialState(visualId) {
  const baseVis = createDefaultVisState();
  const common = {
    visualId,
    radius: 175,
    playing: false,
    viewMode: 'split',
    splitDirection: 'horizontal',
    splitRatio: 50,
    ...baseVis,
  };

  if (visualId === 'unit-circle-helix') {
    return {
      ...common,
      angleTheta: toRadians(48),
      helixPitch: 0.35,
      showProjections: true,
      showTanSec: true,
      showCotCsc: true,
      showHelixWalls: true,
    };
  }
  if (visualId === 'law-of-sines') {
    return {
      ...common,
      angleA: toRadians(205),
      angleB: toRadians(335),
      angleC: toRadians(80),
      dimensionMode: 'planar',
      latA: Math.PI / 2,
      latB: Math.PI / 2,
      latC: Math.PI / 2,
      showCircumcircleDiameter: true,
      showAltitude: true,
      showRadii: true,
    };
  }
  if (visualId === 'law-of-cosines') {
    return {
      ...common,
      sideA: 8.0,
      sideB: 10.0,
      angleC: toRadians(62),
      dimensionMode: 'planar',
      showProjection: true,
      showSquares3D: true,
      showInteractionRect: true,
      showRatioBadge: true,
    };
  }
  // angle-sum-identities
  return {
    ...common,
    angleAlpha: toRadians(32),
    angleBeta: toRadians(43),
    angleGamma: 0,
    dimensionMode: 'planar',
    showDifferenceRay: true,
    showStackedTriangles: true,
    showMatrixVectors: true,
  };
}

/**
 * Single source of truth for the model (world-unit) radius shared by the 2D canvas, the 3D scene,
 * the telemetry panels and the derivations: 175 px ↔ R = 10 world units.
 */
export const PX_PER_WORLD_UNIT = 17.5;
export function getModelRadius(state) {
  return (state?.radius || 175) / PX_PER_WORLD_UNIT;
}

/**
 * Sweeps the interior acute/obtuse angle <= 180° between rays a1 and a2 at vertex.
 */
function sweepInteriorWedge(ctx, vertex, a1, a2, radius, fill, stroke) {
  let diff = (a2 - a1) % TAU;
  if (diff < 0) diff += TAU;
  const anticlockwise = diff > Math.PI;
  drawAngleWedge(ctx, vertex, a1, a2, radius, fill, stroke, anticlockwise);
}

/**
 * Computes the unit bisector direction vector between two canvas ray angles a1, a2
 * for non-overlapping angle badge placement.
 */
function get2DBisectorOffset(vertex, a1, a2, dist = 46, flip = false) {
  const ux = Math.cos(a1) + Math.cos(a2);
  const uy = Math.sin(a1) + Math.sin(a2);
  const len = Math.hypot(ux, uy);
  const sign = flip ? -1 : 1;
  if (len < 1e-4) {
    return {
      x: vertex.x + sign * dist * Math.cos(a1 + Math.PI / 2),
      y: vertex.y + sign * dist * Math.sin(a1 + Math.PI / 2),
    };
  }
  return {
    x: vertex.x + sign * dist * (ux / len),
    y: vertex.y + sign * dist * (uy / len),
  };
}

/**
 * Badge position for a DIRECTED angle that sweeps `sweep` radians counter-clockwise (mathematical
 * orientation) from the canvas ray `startCanvas`. Canvas y points down, so a mathematical CCW sweep
 * decreases the canvas angle. Correct for any sweep in [0, 2π), including reflex sweeps > π,
 * unlike a minor-angle bisector.
 */
function getDirectedAngleBadge(vertex, startCanvas, sweep, dist) {
  const mid = startCanvas - sweep / 2;
  return { x: vertex.x + dist * Math.cos(mid), y: vertex.y + dist * Math.sin(mid) };
}

/**
 * Shades the conjugate (explementary) angle 360° − φ of a DIRECTED angle φ that sweeps
 * counter-clockwise from the canvas ray `startCanvas`. The conjugate begins at the terminal ray
 * and continues counter-clockwise back to the initial ray, so it is correct for φ on either side
 * of 180° (drawReflexWedge always shades the larger arc, which is only right for interior angles).
 */
function drawConjugateWedge(ctx, vertex, startCanvas, sweep, radius, fill, stroke) {
  const phi = ((sweep % TAU) + TAU) % TAU;
  if (phi < 1e-6) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(vertex.x, vertex.y);
  ctx.arc(vertex.x, vertex.y, radius, startCanvas - phi, startCanvas, true);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * 3D label anchor for a directed angle measured counter-clockwise from +X in the XZ ground plane
 * (mathematical (x, y) ↦ three.js (x, 0, y)), placed at the angular midpoint `midAngle`.
 */
function getPolarLabel3D(midAngle, dist, lift = 0.25) {
  return { x: dist * Math.cos(midAngle), y: lift, z: dist * Math.sin(midAngle) };
}

/**
 * Draws a crisp mathematical vector ray from `from` to `to` with a sharp arrowhead
 * and an outward radial halo label — strictly NO heavy globe on the vector apex.
 */
function drawVectorWithApexLabel(ctx, from, to, color, label = '', width = 2.5, head = 10, labelDist = 18) {
  drawArrow(ctx, from, to, color, width, head);
  if (label) {
    const { x, y, ux } = getRadialLabelCoords(to, from, labelDist);
    const align = ux > 0.35 ? 'left' : ux < -0.35 ? 'right' : 'center';
    drawHaloText(ctx, label, x, y, color, 'bold 13px monospace', align);
  }
}

/* ============================================================================
   2. UNIFIED 2D CANVAS VIEW
   ============================================================================ */

export class TrigCanvas2DView {
  constructor(canvas, container, visualId) {
    this.canvas = canvas;
    this.container = container;
    this.visualId = visualId;
    this.ctx = canvas.getContext('2d');
    this.state = null;
    this.hoverHandle = null;
    this.hoverCircumference = false;
    this.activeDrag = null;
    this.selectedVertexId = 'C';

    if (this.canvas && typeof this.canvas.setAttribute === 'function') {
      if (!this.canvas.hasAttribute('tabindex')) this.canvas.setAttribute('tabindex', '0');
      if (!this.canvas.hasAttribute('aria-label')) {
        this.canvas.setAttribute('aria-label', 'Interactive 2D Geometric Proof Canvas');
      }
    }

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(container);
    }
    this.resize();
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
    if (this.state) this.render(this.state);
  }

  getCenterAndRadius(state) {
    const pan = state?.pan || { x: 0, y: 0 };
    const cx = this.width / 2 + (pan.x || 0);
    const cy = this.height / 2 + (pan.y || 0);
    const isNarrow = (this.width > 0 && this.width <= 320) || (this.height > 0 && this.height <= 240);
    const maxSafe = isNarrow ? Math.max(50, Math.min(this.width, this.height) * 0.40) : Infinity;
    const r = Math.min(Number(state?.radius) > 0 ? Number(state.radius) : 175, maxSafe);
    return { cx, cy, r };
  }

  /**
   * Computes interactive 2D screen coordinates for hit-testing and dragging.
   */
  getInteractiveHandles2D(state) {
    const { cx, cy, r } = this.getCenterAndRadius(state);
    if (this.visualId === 'unit-circle-helix') {
      const m = computeUnitCircleHelix(state.angleTheta, 1.0, state.helixPitch);
      return {
        cx,
        cy,
        r,
        handles: [
          { id: 'theta', x: cx + m.points2D.P.x * r, y: cy - m.points2D.P.y * r, field: 'angleTheta' },
        ],
      };
    }
    if (this.visualId === 'law-of-sines') {
      const m = computeLawOfSines(state.angleA, state.angleB, state.angleC, getModelRadius(state));
      const scale = r / getModelRadius(state);
      const handles = [
        { id: 'A', x: cx + m.vertices2D.A.x * scale, y: cy - m.vertices2D.A.y * scale, field: 'angleA', color: PALETTE.red, label: 'A', polarAngle: state.angleA },
        { id: 'B', x: cx + m.vertices2D.B.x * scale, y: cy - m.vertices2D.B.y * scale, field: 'angleB', color: PALETTE.green, label: 'B', polarAngle: state.angleB },
        { id: 'C', x: cx + m.vertices2D.C.x * scale, y: cy - m.vertices2D.C.y * scale, field: 'angleC', color: PALETTE.violet, label: 'C', polarAngle: state.angleC },
      ];
      if (state.showCircumcircleDiameter !== false) {
        handles.push({
          id: 'antipodeA',
          x: cx + m.vertices2D.antipodeA.x * scale,
          y: cy - m.vertices2D.antipodeA.y * scale,
          field: 'antipodeA',
          color: PALETTE.amber,
          label: "A'",
          polarAngle: normalizeAngle((state.angleB || 0) + Math.PI),
        });
      }
      return {
        cx,
        cy,
        r,
        handles,
      };
    }
    if (this.visualId === 'law-of-cosines') {
      const m = computeLawOfCosines(state.sideA, state.sideB, state.angleC);
      const scale = (r * 1.15) / Math.max(m.a, m.b, m.c, 10);
      const originX = cx - m.b * scale * 0.42;
      const originY = cy;
      return {
        cx: originX,
        cy: originY,
        r: m.a * scale,
        circleCx: cx,
        circleCy: cy,
        circleR: r,
        handles: [
          {
            id: 'B',
            x: originX + m.vertices2D.B.x * scale,
            y: originY - m.vertices2D.B.y * scale,
            field: 'angleC',
            scale,
          },
          {
            id: 'A',
            x: originX + m.vertices2D.A.x * scale,
            y: originY - m.vertices2D.A.y * scale,
            field: 'sideB',
            scale,
          },
        ],
      };
    }
    // angle-sum-identities
    const m = computeAngleSumIdentities(state.angleAlpha, state.angleBeta, 1.0);
    const handles = [
      { id: 'P', x: cx + m.points2D.P.x * r, y: cy - m.points2D.P.y * r, field: 'angleBeta' },
      { id: 'A', x: cx + m.points2D.A_ray.x * r, y: cy - m.points2D.A_ray.y * r, field: 'angleAlpha' },
    ];
    if (state.showDifferenceRay !== false) {
      handles.push({
        id: 'D',
        x: cx + m.points2D.P_diff.x * r,
        y: cy - m.points2D.P_diff.y * r,
        field: 'diffBeta',
      });
    }
    return {
      cx,
      cy,
      r,
      handles,
    };
  }

  render(state) {
    this.state = state;
    const { ctx, width, height } = this;
    if (!width || !height) return;

    ctx.clearRect(0, 0, width, height);
    const { cx, cy, r } = this.getCenterAndRadius(state);

    // 1. Standard 2D Cartesian Grid, Coordinate Axes & Perspective Watermark
    // Note: draw2DCartesianGrid also applies ctx._pendingAffineState when Affine Conic Mode is active
    draw2DCartesianGrid(ctx, width, height, cx, cy, state.vis2d, 40, state.cameraPerspective);

    if (this.visualId === 'unit-circle-helix') {
      this.#renderUnitCircle(ctx, state, cx, cy, r);
    } else if (this.visualId === 'law-of-sines') {
      this.#renderLawOfSines(ctx, state, cx, cy, r);
    } else if (this.visualId === 'law-of-cosines') {
      this.#renderLawOfCosines(ctx, state, cx, cy, r);
    } else {
      this.#renderAngleSum(ctx, state, cx, cy, r);
    }
  }

  #renderUnitCircle(ctx, state, cx, cy, r) {
    const m = computeUnitCircleHelix(state.angleTheta, 1.0, state.helixPitch);
    const vis = state.vis2d || {};
    const showArea = vis.area !== false;
    const showAngles = vis.angles !== false;
    const showLabels = vis.labels !== false;
    const showLengths = vis.lengths !== false;
    const showPoints = vis.points !== false;
    const showReflex = Boolean(vis.reflex);
    const angUnit = state.angleUnit || 'deg';

    const toScreen = (pt) => ({ x: cx + pt.x * r, y: cy - pt.y * r });
    const O = toScreen(m.points2D.O);
    const P = toScreen(m.points2D.P);
    const projX = toScreen(m.points2D.projX);
    const projY = toScreen(m.points2D.projY);
    const secPt = toScreen(m.points2D.secPoint);
    const cscPt = toScreen(m.points2D.cscPoint);
    const tanBase = toScreen(m.points2D.tanLineBase);
    const tanTip = toScreen(m.points2D.tanLineTip);
    const cotBase = toScreen(m.points2D.cotLineBase);
    const cotTip = toScreen(m.points2D.cotLineTip);

    // Main Circle
    ctx.strokeStyle = PALETTE.sky;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();

    // Relevant Area Shading (Circular Sector + Orthogonal Right Triangle)
    if (showArea) {
      const canvasAngP = Math.atan2(P.y - O.y, P.x - O.x);
      ctx.save();
      ctx.fillStyle = 'rgba(234, 179, 8, 0.11)';
      ctx.beginPath();
      ctx.moveTo(O.x, O.y);
      ctx.arc(O.x, O.y, r, 0, canvasAngP, true);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Decomposed Pythagorean Right Triangle (Amber along cos θ, Teal at projX, Emerald along sin θ)
      const pythagGrad = ctx.createLinearGradient(O.x, O.y, P.x, P.y);
      pythagGrad.addColorStop(0, 'rgba(251, 191, 36, 0.20)');  // Amber at origin O (cos θ span)
      pythagGrad.addColorStop(0.5, 'rgba(20, 184, 166, 0.18)'); // Teal at right-angle corner projX
      pythagGrad.addColorStop(1, 'rgba(16, 185, 129, 0.22)');  // Emerald at apex P (sin θ span)
      ctx.fillStyle = pythagGrad;
      ctx.beginPath();
      ctx.moveTo(O.x, O.y);
      ctx.lineTo(projX.x, projX.y);
      ctx.lineTo(P.x, P.y);
      ctx.closePath();
      ctx.fill();

      // Decomposed Secant-Tangent Right Triangle (Indigo at O -> Rose at tanBase -> Sky at tanTip)
      if (state.showTanSec !== false && Math.abs(m.tan) < 4.0) {
        const tanGrad = ctx.createLinearGradient(O.x, O.y, tanTip.x, tanTip.y);
        tanGrad.addColorStop(0, 'rgba(99, 102, 241, 0.16)');  // Indigo at origin O (r=1)
        tanGrad.addColorStop(0.6, 'rgba(244, 63, 94, 0.18)'); // Rose at tangent baseline (tan θ)
        tanGrad.addColorStop(1, 'rgba(2, 132, 199, 0.18)');   // Sky along secant hypotenuse (sec θ)
        ctx.fillStyle = tanGrad;
        ctx.beginPath();
        ctx.moveTo(O.x, O.y);
        ctx.lineTo(tanBase.x, tanBase.y);
        ctx.lineTo(tanTip.x, tanTip.y);
        ctx.closePath();
        ctx.fill();
      }

      // Decomposed Cotangent-Cosecant Right Triangle (Indigo at O -> Orange at cotBase -> Fuchsia at cotTip)
      if (state.showCotCsc !== false && Math.abs(m.cot) < 4.0) {
        const cotGrad = ctx.createLinearGradient(O.x, O.y, cotTip.x, cotTip.y);
        cotGrad.addColorStop(0, 'rgba(99, 102, 241, 0.16)');  // Indigo at origin O (r=1)
        cotGrad.addColorStop(0.6, 'rgba(249, 115, 22, 0.18)'); // Orange at cotangent baseline (cot θ)
        cotGrad.addColorStop(1, 'rgba(217, 70, 239, 0.18)'); // Fuchsia along cosecant hypotenuse (csc θ)
        ctx.fillStyle = cotGrad;
        ctx.beginPath();
        ctx.moveTo(O.x, O.y);
        ctx.lineTo(cotBase.x, cotBase.y);
        ctx.lineTo(cotTip.x, cotTip.y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Angle Wedge theta & Right Angle Marker
    const canvasAngP = Math.atan2(P.y - O.y, P.x - O.x);
    if (showAngles) {
      drawAngleWedge(ctx, O, 0, canvasAngP, 36, 'rgba(251, 191, 36, 0.25)', PALETTE.amber, true);
      drawRightAngle(ctx, projX, O, P, 12, PALETTE.teal);
      if (state.showTanSec !== false) {
        drawRightAngle(ctx, P, O, secPt, 11, PALETTE.rose);
      }
    }

    // Conjugate Reflex Angle (Perigon 360° − θ), correct on both sides of θ = 180°
    if (showReflex) {
      drawConjugateWedge(ctx, O, 0, m.theta, 44, 'rgba(20, 184, 166, 0.15)', PALETTE.teal);
      if (showLabels) {
        const rb = getDirectedAngleBadge(O, -m.theta, TAU - m.theta, 64);
        drawTextBadge(ctx, `θ* = ${fmtAngle(360 - m.thetaDeg, angUnit)}`, rb.x, rb.y, PALETTE.teal);
      }
    }

    // Cosine (amber) & Sine (emerald) orthogonal projections
    if (state.showProjections !== false) {
      ctx.lineWidth = 2.8;
      ctx.strokeStyle = PALETTE.amber;
      ctx.beginPath();
      ctx.moveTo(O.x, O.y);
      ctx.lineTo(projX.x, projX.y);
      ctx.stroke();

      ctx.strokeStyle = PALETTE.emerald;
      ctx.beginPath();
      ctx.moveTo(projX.x, projX.y);
      ctx.lineTo(P.x, P.y);
      ctx.stroke();

      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = PALETTE.emerald;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(O.x, O.y);
      ctx.lineTo(projY.x, projY.y);
      ctx.lineTo(P.x, P.y);
      ctx.stroke();
      ctx.restore();
    }

    // Exterior Tangent (rose) & Secant (violet)
    if (state.showTanSec !== false) {
      ctx.strokeStyle = PALETTE.rose;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(tanBase.x, tanBase.y);
      ctx.lineTo(tanTip.x, tanTip.y);
      ctx.stroke();

      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = PALETTE.violet;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(O.x, O.y);
      ctx.lineTo(tanTip.x, tanTip.y);
      ctx.moveTo(P.x, P.y);
      ctx.lineTo(secPt.x, secPt.y);
      ctx.stroke();
      ctx.restore();
    }

    // Exterior Cotangent (orange) & Cosecant (fuchsia)
    if (state.showCotCsc !== false) {
      ctx.strokeStyle = PALETTE.orange;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cotBase.x, cotBase.y);
      ctx.lineTo(cotTip.x, cotTip.y);
      ctx.stroke();

      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = PALETTE.fuchsia;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(O.x, O.y);
      ctx.lineTo(cotTip.x, cotTip.y);
      ctx.moveTo(P.x, P.y);
      ctx.lineTo(cscPt.x, cscPt.y);
      ctx.stroke();
      ctx.restore();
    }

    // Radius vector OP (indigo) with sharp arrowhead (no globe on vector apex)
    drawArrow(ctx, O, P, PALETTE.indigo, 2.6, 10);

    // Numerical Deductions & Angle Annotations
    if (showLabels) {
      if (showAngles) {
        const bisAng = -m.theta / 2;
        drawTextBadge(
          ctx,
          `θ = ${fmtAngle(m.thetaDeg, angUnit)}`,
          cx + 56 * Math.cos(bisAng),
          cy + 56 * Math.sin(bisAng),
          PALETTE.amber
        );
      }
      if (state.showProjections !== false && showLengths) {
        drawTextBadge(
          ctx,
          `cos θ = ${m.cos.toFixed(3)}`,
          (O.x + projX.x) / 2,
          O.y + (m.sin >= 0 ? 18 : -18),
          PALETTE.amber
        );
        drawTextBadge(
          ctx,
          `sin θ = ${m.sin.toFixed(3)}`,
          projX.x + 44 * (m.cos >= 0 ? 1 : -1),
          (projX.y + P.y) / 2,
          PALETTE.emerald
        );
      }
      if (state.showTanSec !== false && showLengths) {
        if (Math.abs(m.tan) < 3.5) {
          drawTextBadge(
            ctx,
            `tan θ = ${m.tan.toFixed(2)}`,
            tanTip.x + 38 * (m.cos >= 0 ? 1 : -1),
            (tanBase.y + tanTip.y) / 2,
            PALETTE.rose
          );
        }
        if (Math.abs(m.sec) < 4.5) {
          drawTextBadge(
            ctx,
            `sec θ = ${m.sec.toFixed(2)}`,
            (O.x + secPt.x) / 2,
            O.y + (m.sin >= 0 ? -22 : 22),
            PALETTE.violet
          );
        }
      }
      if (state.showCotCsc !== false && showLengths) {
        if (Math.abs(m.cot) < 3.5) {
          drawTextBadge(
            ctx,
            `cot θ = ${m.cot.toFixed(2)}`,
            (cotBase.x + cotTip.x) / 2,
            cotTip.y + 18 * (m.sin >= 0 ? 1 : -1),
            PALETTE.orange
          );
        }
        if (Math.abs(m.csc) < 4.5) {
          drawTextBadge(
            ctx,
            `csc θ = ${m.csc.toFixed(2)}`,
            O.x + (m.cos >= 0 ? -44 : 44),
            (O.y + cscPt.y) / 2,
            PALETTE.fuchsia
          );
        }
      }
    }

    // Discrete Euclidean Vertex Markers & Outward Radial Labels (no heavy globe on vector apex P)
    if (showPoints) {
      const lblO = getPointLabel('O', 0, 0, vis);
      const lblP = getPointLabel('P', m.cos * r, m.sin * r, vis);
      const lblX = getPointLabel('Cx', m.cos * r, 0, vis);
      drawLabelledPoint(ctx, O, PALETTE.indigo, lblO, -12, 16, 4.5);
      drawLabelledPoint(ctx, projX, PALETTE.amber, lblX, 0, m.sin >= 0 ? 16 : -16, 4);
      if (state.showTanSec !== false) {
        drawLabelledPoint(ctx, tanBase, PALETTE.rose, showLabels ? 'T₀' : '', 0, 16, 3.5);
        if (Math.abs(m.tan) < 3.5) {
          drawLabelledPoint(ctx, tanTip, PALETTE.rose, showLabels ? 'T' : '', 14, 0, 3.5);
        }
        if (Math.abs(m.sec) < 4.5) {
          drawLabelledPoint(ctx, secPt, PALETTE.violet, showLabels ? 'Sec' : '', 0, -14, 3.5);
        }
      }
      if (state.showCotCsc !== false) {
        drawLabelledPoint(ctx, cotBase, PALETTE.orange, showLabels ? 'C₀' : '', -16, 0, 3.5);
        if (Math.abs(m.cot) < 3.5) {
          drawLabelledPoint(ctx, cotTip, PALETTE.orange, showLabels ? 'Cot' : '', 0, -14, 3.5);
        }
        if (Math.abs(m.csc) < 4.5) {
          drawLabelledPoint(ctx, cscPt, PALETTE.fuchsia, showLabels ? 'Csc' : '', 16, 0, 3.5);
        }
      }
      // Outward radial label for P without covering the sharp arrowhead at P
      if (lblP) {
        const { x, y, ux } = getRadialLabelCoords(P, O, 20);
        drawHaloText(ctx, lblP, x, y, PALETTE.violet, 'bold 13px monospace', ux > 0.35 ? 'left' : ux < -0.35 ? 'right' : 'center');
      }
    }
  }

  #renderLawOfSines(ctx, state, cx, cy, r) {
    const m = computeLawOfSines(state.angleA, state.angleB, state.angleC, getModelRadius(state));
    const scale = r / getModelRadius(state);
    const vis = state.vis2d || {};
    const showArea = vis.area !== false;
    const showAngles = vis.angles !== false;
    const showLabels = vis.labels !== false;
    const showLengths = vis.lengths !== false;
    const showPoints = vis.points !== false;
    const showReflex = Boolean(vis.reflex);
    const angUnit = state.angleUnit || 'deg';

    const toScreen = (pt) => ({ x: cx + pt.x * scale, y: cy - pt.y * scale });
    const O = { x: cx, y: cy };
    const A = toScreen(m.vertices2D.A);
    const B = toScreen(m.vertices2D.B);
    const C = toScreen(m.vertices2D.C);
    const antipodeA = toScreen(m.vertices2D.antipodeA);
    const footHc = toScreen(m.vertices2D.footHc);

    // Circumcircle
    ctx.strokeStyle = PALETTE.sky;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();

    // Inscribed Triangle & Thales Right Triangle Shading (Multi-Color Altitude Decomposition)
    if (showArea) {
      if (state.showAltitude !== false) {
        // Left sub-triangle CAD (or C-Hc-A): Hypotenuse b in Green/Emerald, altitude hc in Teal
        const gradCAD = ctx.createLinearGradient(A.x, A.y, footHc.x, footHc.y);
        gradCAD.addColorStop(0, 'rgba(16, 185, 129, 0.20)'); // Emerald along side b
        gradCAD.addColorStop(1, 'rgba(20, 184, 166, 0.20)'); // Teal along altitude hc
        ctx.fillStyle = gradCAD;
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(footHc.x, footHc.y);
        ctx.lineTo(C.x, C.y);
        ctx.closePath();
        ctx.fill();

        // Right sub-triangle CBD (or C-Hc-B): Hypotenuse a in Red, altitude hc in Teal
        const gradCBD = ctx.createLinearGradient(B.x, B.y, footHc.x, footHc.y);
        gradCBD.addColorStop(0, 'rgba(239, 68, 68, 0.20)'); // Red along side a
        gradCBD.addColorStop(1, 'rgba(20, 184, 166, 0.20)'); // Teal along altitude hc
        ctx.fillStyle = gradCBD;
        ctx.beginPath();
        ctx.moveTo(B.x, B.y);
        ctx.lineTo(footHc.x, footHc.y);
        ctx.lineTo(C.x, C.y);
        ctx.closePath();
        ctx.fill();
      } else {
        const triGrad = ctx.createLinearGradient(A.x, A.y, B.x, B.y);
        triGrad.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
        triGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.16)');
        triGrad.addColorStop(1, 'rgba(239, 68, 68, 0.18)');
        ctx.fillStyle = triGrad;
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.lineTo(C.x, C.y);
        ctx.closePath();
        ctx.fill();
      }

      if (state.showCircumcircleDiameter !== false) {
        const diamGrad = ctx.createLinearGradient(antipodeA.x, antipodeA.y, C.x, C.y);
        diamGrad.addColorStop(0, 'rgba(251, 191, 36, 0.16)'); // Amber along 2R hypotenuse A'B
        diamGrad.addColorStop(1, 'rgba(20, 184, 166, 0.16)'); // Teal at right-angle C
        ctx.fillStyle = diamGrad;
        ctx.beginPath();
        ctx.moveTo(antipodeA.x, antipodeA.y);
        ctx.lineTo(B.x, B.y);
        ctx.lineTo(C.x, C.y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Circumradii OA, OB, OC
    if (state.showRadii !== false) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = PALETTE.indigo;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(O.x, O.y);
      ctx.lineTo(A.x, A.y);
      ctx.moveTo(O.x, O.y);
      ctx.lineTo(B.x, B.y);
      ctx.moveTo(O.x, O.y);
      ctx.lineTo(C.x, C.y);
      ctx.stroke();
      ctx.restore();
    }

    // Thales Antipodal Diameter Bridge A'B = 2R
    if (state.showCircumcircleDiameter !== false) {
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = PALETTE.amber;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(B.x, B.y);
      ctx.lineTo(antipodeA.x, antipodeA.y);
      ctx.lineTo(C.x, C.y);
      ctx.stroke();
      ctx.restore();

      if (showAngles) {
        drawRightAngle(ctx, C, antipodeA, B, 12, PALETTE.amber);
      }
      if (showPoints) {
        drawRadialLabelledPoint(
          ctx,
          antipodeA,
          O,
          PALETTE.amber,
          getPointLabel("A'", m.vertices2D.antipodeA.x * scale, m.vertices2D.antipodeA.y * scale, vis),
          18,
          4.5
        );
      }
      if (showLabels && showLengths) {
        drawTextBadge(
          ctx,
          `2R = ${m.diameter2R.toFixed(1)}`,
          (B.x + antipodeA.x) / 2 - 14,
          (B.y + antipodeA.y) / 2 - 10,
          PALETTE.amber
        );
      }
    }

    // Altitude h_c from C onto AB
    if (state.showAltitude !== false) {
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = PALETTE.teal;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(C.x, C.y);
      ctx.lineTo(footHc.x, footHc.y);
      ctx.stroke();
      ctx.restore();

      if (showAngles) {
        drawRightAngle(ctx, footHc, C, B, 10, PALETTE.teal);
        drawRightAngle(ctx, footHc, C, A, 10, PALETTE.teal);
      }
      if (showPoints) {
        drawLabelledPoint(ctx, footHc, PALETTE.teal, showLabels ? 'Hc' : '', 0, 15, 4);
      }
      if (showLabels && showLengths) {
        drawTextBadge(
          ctx,
          `hc = ${m.altitudeHc.toFixed(2)}`,
          (C.x + footHc.x) / 2 + 28,
          (C.y + footHc.y) / 2,
          PALETTE.teal
        );
      }
    }

    // Interior Angle Wedges & Bisector Badges at A, B, C
    const angAB = Math.atan2(B.y - A.y, B.x - A.x);
    const angAC = Math.atan2(C.y - A.y, C.x - A.x);
    const angBA = Math.atan2(A.y - B.y, A.x - B.x);
    const angBC = Math.atan2(C.y - B.y, C.x - B.x);
    const angCA = Math.atan2(A.y - C.y, A.x - C.x);
    const angCB = Math.atan2(B.y - C.y, B.x - C.x);

    if (showAngles) {
      sweepInteriorWedge(ctx, A, angAB, angAC, 28, 'rgba(239, 68, 68, 0.25)', PALETTE.red);
      sweepInteriorWedge(ctx, B, angBC, angBA, 28, 'rgba(34, 197, 94, 0.25)', PALETTE.green);
      sweepInteriorWedge(ctx, C, angCA, angCB, 28, 'rgba(168, 85, 247, 0.25)', PALETTE.violet);

      if (showLabels) {
        const bA = get2DBisectorOffset(A, angAB, angAC, 46);
        const bB = get2DBisectorOffset(B, angBC, angBA, 46);
        const bC = get2DBisectorOffset(C, angCA, angCB, 46);
        drawTextBadge(ctx, `∠A = ${fmtAngle(m.interiorAngles.degA, angUnit)}`, bA.x, bA.y, PALETTE.red);
        drawTextBadge(ctx, `∠B = ${fmtAngle(m.interiorAngles.degB, angUnit)}`, bB.x, bB.y, PALETTE.green);
        drawTextBadge(ctx, `∠C = ${fmtAngle(m.interiorAngles.degC, angUnit)}`, bC.x, bC.y, PALETTE.violet);
      }
    }

    if (showReflex) {
      drawReflexWedge(ctx, A, angAB, angAC, 36, 'rgba(239, 68, 68, 0.12)', PALETTE.red);
      drawReflexWedge(ctx, B, angBC, angBA, 36, 'rgba(34, 197, 94, 0.12)', PALETTE.green);
      drawReflexWedge(ctx, C, angCA, angCB, 36, 'rgba(20, 184, 166, 0.15)', PALETTE.teal);
      if (showLabels) {
        const rC = get2DBisectorOffset(C, angCA, angCB, 54, true);
        drawTextBadge(ctx, `∠C* = ${fmtAngle(360 - m.interiorAngles.degC, angUnit)}`, rC.x, rC.y, PALETTE.teal);
      }
    }

    // Chords a (BC - red), b (AC - green), c (AB - violet)
    if (vis.chords !== false) {
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = PALETTE.red;
      ctx.beginPath();
      ctx.moveTo(B.x, B.y);
      ctx.lineTo(C.x, C.y);
      ctx.stroke();

      ctx.strokeStyle = PALETTE.green;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(C.x, C.y);
      ctx.stroke();

      ctx.strokeStyle = PALETTE.violet;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
    }

    // Chord Length & Ratio Deductions
    if (showLabels && showLengths) {
      const midBC = getRadialLabelCoords({ x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 }, O, 18);
      const midAC = getRadialLabelCoords({ x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 }, O, 18);
      const midAB = getRadialLabelCoords({ x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }, O, 18);
      drawTextBadge(ctx, `a = ${m.sides.a.toFixed(2)}`, midBC.x, midBC.y, PALETTE.red);
      drawTextBadge(ctx, `b = ${m.sides.b.toFixed(2)}`, midAC.x, midAC.y, PALETTE.green);
      drawTextBadge(ctx, `c = ${m.sides.c.toFixed(2)}`, midAB.x, midAB.y, PALETTE.violet);
    }

    // Discrete Euclidean Vertices & Outward Radial Labels
    if (showPoints) {
      drawLabelledPoint(ctx, O, PALETTE.indigo, getPointLabel('O', 0, 0, vis), 10, 15, 4.5);
      drawRadialLabelledPoint(ctx, A, O, PALETTE.red, getPointLabel('A', m.vertices2D.A.x * scale, m.vertices2D.A.y * scale, vis), 20, 5);
      drawRadialLabelledPoint(ctx, B, O, PALETTE.green, getPointLabel('B', m.vertices2D.B.x * scale, m.vertices2D.B.y * scale, vis), 20, 5);
      drawRadialLabelledPoint(ctx, C, O, PALETTE.violet, getPointLabel('C', m.vertices2D.C.x * scale, m.vertices2D.C.y * scale, vis), 20, 5);
    }

    // 2D Interactive Affordances: Circumference Hover Highlight, Handle Hover Halos & Active Drag Rings
    if (this.hoverCircumference && !this.hoverHandle && !this.activeDrag) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    if (this.hoverHandle && !this.activeDrag) {
      const hh = this.hoverHandle;
      ctx.save();
      ctx.beginPath();
      ctx.arc(hh.x, hh.y, 14, 0, TAU);
      ctx.fillStyle = hh.color ? `${hh.color}44` : 'rgba(56, 189, 248, 0.35)';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    if (this.activeDrag && this.activeDrag.type === 'handle' && this.activeDrag.handle) {
      const adh = this.activeDrag.handle;
      const curInfo = this.getInteractiveHandles2D(state);
      const activeH = curInfo.handles.find((h) => h.id === adh.id) || adh;
      ctx.save();
      ctx.beginPath();
      ctx.arc(activeH.x, activeH.y, 18, 0, TAU);
      ctx.fillStyle = activeH.color ? `${activeH.color}55` : 'rgba(245, 158, 11, 0.4)';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();

      const curAngDeg = Math.round(((toDegrees(state[adh.field] ?? 0) % 360) + 360) % 360);
      drawTextBadge(ctx, `${adh.label || adh.id}: ${curAngDeg}°`, activeH.x, activeH.y - 28, activeH.color || PALETTE.amber);
    } else if (this.activeDrag && this.activeDrag.type === 'radius') {
      drawTextBadge(ctx, `r = ${Math.round(r)}px`, cx + r, cy - 14, PALETTE.sky);
    }
  }

  #renderLawOfCosines(ctx, state, cx, cy, r) {
    const m = computeLawOfCosines(state.sideA, state.sideB, state.angleC);
    const scale = (r * 1.15) / Math.max(m.a, m.b, m.c, 10);
    const vis = state.vis2d || {};
    const showArea = vis.area !== false;
    const showAngles = vis.angles !== false;
    const showLabels = vis.labels !== false;
    const showLengths = vis.lengths !== false;
    const showPoints = vis.points !== false;
    const showReflex = Boolean(vis.reflex);
    const angUnit = state.angleUnit || 'deg';

    const originX = cx - m.b * scale * 0.42;
    const originY = cy + m.projection.hAlt * scale * 0.35;
    const toScreen = (pt) => ({ x: originX + pt.x * scale, y: originY - pt.y * scale });

    const C = toScreen(m.vertices2D.C);
    const A = toScreen(m.vertices2D.A);
    const B = toScreen(m.vertices2D.B);
    const D = toScreen(m.vertices2D.D);
    const centroid = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };

    // Reference Circle centered at C with radius a = BC (shows locus of B as angle C sweeps)
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(C.x, C.y, m.a * scale, 0, TAU);
    ctx.stroke();
    ctx.restore();

    // Sub-triangle Area Shading (△CDB and △ADB)
    if (showArea) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.13)';
      ctx.beginPath();
      ctx.moveTo(C.x, C.y);
      ctx.lineTo(D.x, D.y);
      ctx.lineTo(B.x, B.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(20, 184, 166, 0.15)';
      ctx.beginPath();
      ctx.moveTo(D.x, D.y);
      ctx.lineTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.closePath();
      ctx.fill();
    }

    // Bilinear Interaction Rectangle (2ab cos C) below AC (multi-color tensor decomposition: a=Sky, b=Emerald, cos C=Rose)
    if (state.showInteractionRect !== false && showArea) {
      const rectW = m.projection.pProj * scale;
      const rectH = Math.min(68, m.b * scale * 0.3);
      const grad = ctx.createLinearGradient(C.x, C.y + 10, C.x + rectW, C.y + 10 + rectH);
      grad.addColorStop(0, 'rgba(244, 63, 94, 0.22)'); // Rose at origin vertex C
      grad.addColorStop(0.5, 'rgba(2, 132, 199, 0.20)'); // Sky along width projection a cos C
      grad.addColorStop(1, 'rgba(16, 185, 129, 0.22)'); // Emerald along vertical depth b
      ctx.fillStyle = grad;
      ctx.fillRect(C.x, C.y + 10, rectW, rectH);

      // Perimeter Edge Stroke Decomposition:
      // Horizontal edges (X-span = |a cos C| from C to D): Stroked in Sky (PALETTE.sky, width 1.8)
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = PALETTE.sky;
      ctx.beginPath();
      ctx.moveTo(C.x, C.y + 10); ctx.lineTo(C.x + rectW, C.y + 10);
      ctx.moveTo(C.x, C.y + 10 + rectH); ctx.lineTo(C.x + rectW, C.y + 10 + rectH);
      ctx.stroke();

      // Vertical edges (Y-span = |b| down from baseline): Stroked in Emerald (PALETTE.emerald, width 1.8)
      ctx.strokeStyle = PALETTE.emerald;
      ctx.beginPath();
      ctx.moveTo(C.x, C.y + 10); ctx.lineTo(C.x, C.y + 10 + rectH);
      ctx.moveTo(C.x + rectW, C.y + 10); ctx.lineTo(C.x + rectW, C.y + 10 + rectH);
      ctx.stroke();

      // Vertex C anchor point: Accent dot in Rose (PALETTE.rose)
      ctx.fillStyle = PALETTE.rose;
      ctx.beginPath();
      ctx.arc(C.x, C.y + 10, 3.5, 0, TAU);
      ctx.fill();

      if (showLabels) {
        drawTextBadge(
          ctx,
          `2ab cos C = ${m.squares.interaction2abCosC.toFixed(1)}`,
          C.x + rectW / 2,
          C.y + 10 + rectH / 2,
          PALETTE.amber
        );
      }
    }

    // Idempotent Orthogonal Projection BD and CD
    if (state.showProjection !== false) {
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = PALETTE.amber;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(B.x, B.y);
      ctx.lineTo(D.x, D.y);
      ctx.moveTo(C.x, C.y);
      ctx.lineTo(D.x, D.y);
      ctx.stroke();
      ctx.restore();

      if (showAngles) {
        drawRightAngle(ctx, D, B, A, 11, PALETTE.amber);
      }
      if (showPoints) {
        drawLabelledPoint(ctx, D, PALETTE.amber, showLabels ? 'D' : '', 0, -14, 4);
      }
      if (showLabels && showLengths) {
        drawTextBadge(ctx, `a cos C = ${m.projection.pProj.toFixed(2)}`, (C.x + D.x) / 2, C.y - 14, PALETTE.amber);
        drawTextBadge(ctx, `h = ${m.projection.hAlt.toFixed(2)}`, D.x + 38, (B.y + D.y) / 2, PALETTE.amber);
      }
    }

    // Interior Angle Wedges at C, A, B
    const angCB = Math.atan2(B.y - C.y, B.x - C.x);
    const angCA = Math.atan2(A.y - C.y, A.x - C.x);
    const angAC = Math.atan2(C.y - A.y, C.x - A.x);
    const angAB = Math.atan2(B.y - A.y, B.x - A.x);
    const angBC = Math.atan2(C.y - B.y, C.x - B.x);
    const angBA = Math.atan2(A.y - B.y, A.x - B.x);

    // Colour grammar (same as Law of Sines): each vertex shares the colour of its OPPOSITE side —
    // A ↔ a = BC (sky), B ↔ b = CA (emerald), C ↔ c = AB (rose).
    if (showAngles) {
      sweepInteriorWedge(ctx, C, angCA, angCB, 32, 'rgba(244, 63, 94, 0.25)', PALETTE.rose);
      sweepInteriorWedge(ctx, A, angAB, angAC, 26, 'rgba(2, 132, 199, 0.22)', PALETTE.sky);
      sweepInteriorWedge(ctx, B, angBC, angBA, 26, 'rgba(16, 185, 129, 0.22)', PALETTE.emerald);
      if (showLabels) {
        const bC = get2DBisectorOffset(C, angCA, angCB, 48);
        const bA = get2DBisectorOffset(A, angAB, angAC, 44);
        const bB = get2DBisectorOffset(B, angBC, angBA, 44);
        drawTextBadge(ctx, `∠C = ${fmtAngle(m.angleCDeg, angUnit)}`, bC.x, bC.y, PALETTE.rose);
        drawTextBadge(ctx, `∠A = ${fmtAngle(toDegrees(m.angleA), angUnit)}`, bA.x, bA.y, PALETTE.sky);
        drawTextBadge(ctx, `∠B = ${fmtAngle(toDegrees(m.angleB), angUnit)}`, bB.x, bB.y, PALETTE.emerald);
      }
    }

    if (showReflex) {
      drawReflexWedge(ctx, C, angCA, angCB, 40, 'rgba(20, 184, 166, 0.15)', PALETTE.teal);
      if (showLabels) {
        const rC = get2DBisectorOffset(C, angCA, angCB, 56, true);
        drawTextBadge(ctx, `∠C* = ${fmtAngle(360 - m.angleCDeg, angUnit)}`, rC.x, rC.y, PALETTE.teal);
      }
    }

    // Sides: b = AC (emerald), a = BC (sky), c = AB (rose)
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = PALETTE.emerald;
    ctx.beginPath();
    ctx.moveTo(C.x, C.y);
    ctx.lineTo(A.x, A.y);
    ctx.stroke();

    ctx.strokeStyle = PALETTE.sky;
    ctx.beginPath();
    ctx.moveTo(C.x, C.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();

    ctx.strokeStyle = PALETTE.rose;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();

    if (showLabels && showLengths) {
      drawTextBadge(ctx, `a = ${m.a.toFixed(2)}`, (C.x + B.x) / 2 - 24, (C.y + B.y) / 2 - 12, PALETTE.sky);
      drawTextBadge(ctx, `b = ${m.b.toFixed(2)}`, (C.x + A.x) / 2, C.y + 24, PALETTE.emerald);
      drawTextBadge(ctx, `c = ${m.c.toFixed(2)}`, (A.x + B.x) / 2 + 26, (A.y + B.y) / 2 - 12, PALETTE.rose);
    }

    if (showPoints) {
      drawRadialLabelledPoint(ctx, C, centroid, PALETTE.rose, getPointLabel('C', 0, 0, vis), 20, 5);
      drawRadialLabelledPoint(ctx, A, centroid, PALETTE.sky, getPointLabel('A', m.b * scale, 0, vis), 20, 5);
      drawRadialLabelledPoint(
        ctx,
        B,
        centroid,
        PALETTE.emerald,
        getPointLabel('B', m.vertices2D.B.x * scale, m.vertices2D.B.y * scale, vis),
        20,
        5
      );
    }

    // Dynamic Ratio Evaluation Badge and Proportional Projection Bar along baseline b (locked to PALETTE.amber invariant)
    if (state.showRatioBadge !== false) {
      const barColor = PALETTE.amber;

      // 1. Dynamic Evaluation Ratio Badge near Vertex C / Angle C
      if (showLabels) {
        const ratioBadgeX = Math.max(95, C.x - 72);
        const ratioBadgeY = Math.max(25, C.y - 36);
        drawTextBadge(
          ctx,
          `cos C = (a²+b²−c²)/(2ab) = ${m.cosC.toFixed(3)}`,
          ratioBadgeX,
          ratioBadgeY,
          barColor
        );
      }

      // 2. Normalized Proportional Projection Bar/Gauge along baseline AC (segment CD)
      const hasRect = state.showInteractionRect !== false && showArea;
      const rectH = hasRect ? Math.min(68, m.b * scale * 0.3) : 0;
      const gaugeY = C.y + (hasRect ? rectH + 24 : 38);
      const trackW = A.x - C.x;
      const barH = 6;

      ctx.save();
      // Baseline track (represents full b = AC)
      ctx.fillStyle = 'rgba(51, 65, 85, 0.45)';
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.6)';
      ctx.lineWidth = 1;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(C.x, gaugeY - barH / 2, trackW, barH, 3);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(C.x, gaugeY - barH / 2, trackW, barH);
        ctx.strokeRect(C.x, gaugeY - barH / 2, trackW, barH);
      }

      // Filled proportional segment: from C to D (a cos C)
      const projW = D.x - C.x;
      if (Math.abs(projW) > 1) {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.65)';
        ctx.beginPath();
        if (ctx.roundRect) {
          if (projW >= 0) {
            ctx.roundRect(C.x, gaugeY - barH / 2, Math.min(projW, trackW), barH, 3);
          } else {
            ctx.roundRect(C.x + projW, gaugeY - barH / 2, Math.abs(projW), barH, 3);
          }
        } else {
          if (projW >= 0) {
            ctx.fillRect(C.x, gaugeY - barH / 2, Math.min(projW, trackW), barH);
          } else {
            ctx.fillRect(C.x + projW, gaugeY - barH / 2, Math.abs(projW), barH);
          }
        }
        ctx.fill();
      }

      // Ticks at C (0), A (b), and D (a cos C)
      ctx.strokeStyle = PALETTE.emerald;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(C.x, gaugeY - 6);
      ctx.lineTo(C.x, gaugeY + 6);
      ctx.moveTo(A.x, gaugeY - 6);
      ctx.lineTo(A.x, gaugeY + 6);
      ctx.stroke();

      ctx.strokeStyle = barColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(D.x, gaugeY - 8);
      ctx.lineTo(D.x, gaugeY + 8);
      ctx.stroke();

      if (showLabels && showLengths) {
        const projFrac = m.b > 0 ? (m.projection.pProj / m.b) : 0;
        drawTextBadge(
          ctx,
          `Proj Ratio (a cos C)/b = ${projFrac.toFixed(3)} (${(projFrac * 100).toFixed(1)}%)`,
          (C.x + A.x) / 2,
          gaugeY + 16,
          barColor
        );
      }
      ctx.restore();
    }
  }

  #renderAngleSum(ctx, state, cx, cy, r) {
    const m = computeAngleSumIdentities(state.angleAlpha, state.angleBeta, 1.0);
    const vis = state.vis2d || {};
    const showArea = vis.area !== false;
    const showAngles = vis.angles !== false;
    const showLabels = vis.labels !== false;
    const showLengths = vis.lengths !== false;
    const showPoints = vis.points !== false;
    const showReflex = Boolean(vis.reflex);
    const angUnit = state.angleUnit || 'deg';

    const toScreen = (pt) => ({ x: cx + pt.x * r, y: cy - pt.y * r });
    const O = toScreen(m.points2D.O);
    const P = toScreen(m.points2D.P);
    const Pdiff = toScreen(m.points2D.P_diff);
    const Aray = toScreen(m.points2D.A_ray);
    const Q = toScreen(m.points2D.Q);
    const M = toScreen(m.points2D.M);
    const N = toScreen(m.points2D.N);
    const Ndiff = toScreen(m.points2D.N_diff);
    const S = toScreen(m.points2D.S_corner);

    // Unit Circle
    ctx.strokeStyle = PALETTE.sky;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();

    // Stacked Right Triangles Shading (△OMQ, △OQP, and △PSQ)
    if (state.showStackedTriangles !== false && showArea) {
      // △OMQ (Sky Blue to Amber to Violet) - Base OM = cos α cos β, Height MQ = sin α cos β
      const gradOMQ = ctx.createLinearGradient(O.x, O.y, Q.x, Q.y);
      gradOMQ.addColorStop(0, 'rgba(2, 132, 199, 0.20)');   // Sky at origin O
      gradOMQ.addColorStop(0.5, 'rgba(251, 191, 36, 0.18)'); // Amber along horizontal projection OM
      gradOMQ.addColorStop(1, 'rgba(168, 85, 247, 0.20)');  // Violet at vertex Q
      ctx.fillStyle = gradOMQ;
      ctx.beginPath();
      ctx.moveTo(O.x, O.y);
      ctx.lineTo(M.x, M.y);
      ctx.lineTo(Q.x, Q.y);
      ctx.closePath();
      ctx.fill();

      // △OQP (Sky to Violet to Emerald) - Base OQ = cos β, Perpendicular leg QP = sin β
      const gradOQP = ctx.createLinearGradient(O.x, O.y, P.x, P.y);
      gradOQP.addColorStop(0, 'rgba(2, 132, 199, 0.20)');   // Sky at origin O
      gradOQP.addColorStop(0.5, 'rgba(168, 85, 247, 0.20)'); // Violet at vertex Q
      gradOQP.addColorStop(1, 'rgba(16, 185, 129, 0.22)');  // Emerald at apex P
      ctx.fillStyle = gradOQP;
      ctx.beginPath();
      ctx.moveTo(O.x, O.y);
      ctx.lineTo(Q.x, Q.y);
      ctx.lineTo(P.x, P.y);
      ctx.closePath();
      ctx.fill();

      // Upper Right Triangle △PSQ (Amber) - Multi-color tensor gradient (Violet at Q, Amber along QS, Emerald at P)
      const gradPSQ = ctx.createLinearGradient(Q.x, Q.y, P.x, P.y);
      gradPSQ.addColorStop(0, 'rgba(168, 85, 247, 0.18)');  // Violet at leg base Q
      gradPSQ.addColorStop(0.5, 'rgba(251, 191, 36, 0.14)'); // Amber along horizontal leg QS
      gradPSQ.addColorStop(1, 'rgba(16, 185, 129, 0.22)');  // Emerald at vertical apex P
      ctx.fillStyle = gradPSQ;
      ctx.beginPath();
      ctx.moveTo(P.x, P.y);
      ctx.lineTo(S.x, S.y);
      ctx.lineTo(Q.x, Q.y);
      ctx.closePath();
      ctx.fill();
    }

    // Difference Right Triangle Shading (△OQD)
    if (state.showDifferenceRay !== false && showArea) {
      // △OQD (Rose) - Multi-color gradient (Sky at O, Violet along shared leg OQ, Rose at D)
      const gradOQD = ctx.createLinearGradient(O.x, O.y, Pdiff.x, Pdiff.y);
      gradOQD.addColorStop(0, 'rgba(2, 132, 199, 0.18)');   // Sky at origin O
      gradOQD.addColorStop(0.5, 'rgba(168, 85, 247, 0.18)'); // Violet along shared leg OQ
      gradOQD.addColorStop(1, 'rgba(244, 63, 94, 0.14)');   // Rose at difference point D
      ctx.fillStyle = gradOQD;
      ctx.beginPath();
      ctx.moveTo(O.x, O.y);
      ctx.lineTo(Q.x, Q.y);
      ctx.lineTo(Pdiff.x, Pdiff.y);
      ctx.closePath();
      ctx.fill();
    }

    if (state.showStackedTriangles !== false && showLengths) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = PALETTE.amber;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(Q.x, Q.y);
      ctx.lineTo(M.x, M.y);
      ctx.moveTo(Q.x, Q.y);
      ctx.lineTo(S.x, S.y);
      ctx.moveTo(P.x, P.y);
      ctx.lineTo(S.x, S.y);
      ctx.moveTo(M.x, M.y);
      ctx.lineTo(N.x, N.y);
      ctx.stroke();

      // Dropped perpendicular from P to X-axis at N (sin(α+β) altitude - emerald matching 3D)
      ctx.strokeStyle = PALETTE.emerald;
      ctx.beginPath();
      ctx.moveTo(P.x, P.y);
      ctx.lineTo(N.x, N.y);
      ctx.stroke();

      if (state.showDifferenceRay !== false) {
        // Dropped perpendicular from Pdiff to X-axis at Ndiff (sin(α−β) altitude - rose matching 3D)
        ctx.strokeStyle = PALETTE.rose;
        ctx.beginPath();
        ctx.moveTo(Pdiff.x, Pdiff.y);
        ctx.lineTo(Ndiff.x, Ndiff.y);
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = PALETTE.violet;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(Q.x, Q.y);
      ctx.lineTo(P.x, P.y);
      ctx.stroke();

      if (showAngles) {
        drawRightAngle(ctx, Q, O, P, 11, PALETTE.violet);
        drawRightAngle(ctx, M, O, Q, 10, PALETTE.amber);
        if (Math.abs(P.x - Q.x) > 6 && Math.abs(P.y - Q.y) > 6) {
          drawRightAngle(ctx, S, P, Q, 9, PALETTE.amber);
        }
        if (Math.abs(m.trig.sinSum) > 0.05 && Math.abs(m.trig.cosSum) > 0.05) {
          drawRightAngle(ctx, N, O, P, 10, PALETTE.emerald);
        }
        if (state.showDifferenceRay !== false) {
          if (Math.abs(m.trig.sinDiff) > 0.05 && Math.abs(m.trig.cosDiff) > 0.05) {
            drawRightAngle(ctx, Ndiff, O, Pdiff, 10, PALETTE.rose);
          }
          if (Math.abs(Math.sin(m.beta)) > 0.05) {
            drawRightAngle(ctx, Q, O, Pdiff, 11, PALETTE.rose);
          }
        }
      }
    }

    // Angle wedges alpha and beta
    const angA = Math.atan2(Aray.y - O.y, Aray.x - O.x);
    const angP = Math.atan2(P.y - O.y, P.x - O.x);
    if (showAngles) {
      drawAngleWedge(ctx, O, 0, angA, 34, 'rgba(56, 189, 248, 0.24)', PALETTE.sky, true);
      drawAngleWedge(ctx, O, angA, angP, 48, 'rgba(168, 85, 247, 0.24)', PALETTE.violet, true);
      if (showLabels) {
        // Directed-angle badges stay inside their wedges even when α or β exceeds 180°
        const bAlpha = getDirectedAngleBadge(O, 0, m.alpha, 52);
        const bBeta = getDirectedAngleBadge(O, angA, m.beta, 64);
        drawTextBadge(ctx, `α = ${fmtAngle(m.alphaDeg, angUnit)}`, bAlpha.x, bAlpha.y, PALETTE.sky);
        drawTextBadge(ctx, `β = ${fmtAngle(m.betaDeg, angUnit)}`, bBeta.x, bBeta.y, PALETTE.violet);
      }
    }
    if (showReflex) {
      // Conjugate of the wrapped compound angle (α+β) mod 360°, correct on both sides of 180°
      drawConjugateWedge(ctx, O, 0, m.sumAngle, 56, 'rgba(20, 184, 166, 0.14)', PALETTE.teal);
      if (showLabels) {
        const rb = getDirectedAngleBadge(O, -m.sumAngle, TAU - m.sumAngle, 72);
        drawTextBadge(ctx, `(α+β)* = ${fmtAngle(360 - m.sumAngleDeg, angUnit)}`, rb.x, rb.y, PALETTE.teal);
      }
    }

    // Crisp Mathematical Vectors WITHOUT heavy globes on vector apexes:
    const lblA = showPoints ? getPointLabel('A(α)', m.points2D.A_ray.x * r, m.points2D.A_ray.y * r, vis) : '';
    const lblP = showPoints ? getPointLabel('P(α+β)', m.points2D.P.x * r, m.points2D.P.y * r, vis) : '';
    drawVectorWithApexLabel(ctx, O, Aray, PALETTE.sky, lblA, 2.4, 10, 20);
    drawVectorWithApexLabel(ctx, O, P, PALETTE.emerald, lblP, 2.8, 11, 22);

    if (state.showDifferenceRay !== false) {
      const lblDiff = showPoints
        ? getPointLabel('D(α−β)', m.points2D.P_diff.x * r, m.points2D.P_diff.y * r, vis)
        : (showLabels ? 'D(α−β)' : '');
      drawVectorWithApexLabel(ctx, O, Pdiff, PALETTE.rose, lblDiff, 2.2, 9, 20);
    }

    if (showLabels && showLengths) {
      drawTextBadge(ctx, `cos(α+β) = ${m.trig.cosSum.toFixed(3)}`, (O.x + N.x) / 2, O.y + 18, PALETTE.amber);
      drawTextBadge(ctx, `sin(α+β) = ${m.trig.sinSum.toFixed(3)}`, N.x - 44, (N.y + P.y) / 2, PALETTE.emerald);
      if (state.showDifferenceRay !== false) {
        // Chord PD bisected perpendicularly at Q by ray OA
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.75)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(P.x, P.y);
        ctx.lineTo(Pdiff.x, Pdiff.y);
        ctx.stroke();
        ctx.restore();

        // Horizontal cosine projection badge along ON_diff (Amber matching cos(α+β))
        drawTextBadge(
          ctx,
          `cos(α−β) = ${m.trig.cosDiff.toFixed(3)}`,
          (O.x + Ndiff.x) / 2,
          O.y + (Pdiff.y > O.y ? -18 : 34),
          PALETTE.amber
        );
        // Vertical sine projection badge along N_diff -> P_diff (Rose matching sin(α−β) altitude)
        drawTextBadge(
          ctx,
          `sin(α−β) = ${m.trig.sinDiff.toFixed(3)}`,
          Ndiff.x + 48 * (Ndiff.x >= O.x ? 1 : -1),
          (Ndiff.y + Pdiff.y) / 2,
          PALETTE.rose
        );
        drawTextBadge(
          ctx,
          `|PD| = 2 sin β = ${(2 * Math.sin(m.beta)).toFixed(3)}`,
          (P.x + Pdiff.x) / 2 - 40,
          (P.y + Pdiff.y) / 2 - 12,
          PALETTE.violet
        );
      }
    }

    // Discrete Euclidean Markers for Origin O and internal foot Q (NOT on vector apexes)
    if (showPoints) {
      drawLabelledPoint(ctx, O, PALETTE.indigo, getPointLabel('O', 0, 0, vis), -12, 16, 4.5);
      if (state.showStackedTriangles !== false) {
        drawLabelledPoint(ctx, Q, PALETTE.amber, getPointLabel('Q', m.points2D.Q.x * r, m.points2D.Q.y * r, vis), 12, -10, 4);
        drawLabelledPoint(ctx, M, PALETTE.amber, getPointLabel('M', m.points2D.M.x * r, m.points2D.M.y * r, vis), -10, 15, 3.5);
        drawLabelledPoint(ctx, N, PALETTE.amber, getPointLabel('N', m.points2D.N.x * r, m.points2D.N.y * r, vis), 10, 15, 3.5);
      }
      if (state.showDifferenceRay !== false) {
        drawLabelledPoint(ctx, Ndiff, PALETTE.amber, getPointLabel('N_D', m.points2D.N_diff.x * r, m.points2D.N_diff.y * r, vis), -10, -12, 3.5);
      }
    }
  }

  exportPNG() {
    const a = document.createElement('a');
    a.download = `${this.visualId}.png`;
    a.href = this.canvas.toDataURL('image/png');
    a.click();
  }

  exportSVG() {
    const { cx, cy, r } = this.getCenterAndRadius(this.state || {});
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}" style="background:#0f172a;font-family:monospace;">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${PALETTE.sky}" stroke-width="2.5"/>
  <text x="16" y="${this.height - 16}" fill="#94a3b8" font-size="12">${this.visualId} | Visual Mathematics Lab</text>
</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `${this.visualId}.svg`;
    a.href = url;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/* ============================================================================
   3. UNIFIED 3D SCENE VIEW (Extends BaseScene3DView + 3D Angle Wedges + Crisp Vectors)
   ============================================================================ */

export class TrigScene3DView extends BaseScene3DView {
  constructor(THREE, container, visualId) {
    super(THREE, container);
    this.visualId = visualId;
    this.R = 10;

    this.sphere.scale.setScalar(this.R);
    this.circleWire.scale.setScalar(this.R);

    // Trigonometry 3D scene framing: proportional distance (d ≈ 44) to provide
    // clear headroom below top header mode buttons for the +Y zenith axis label
    this.camera.position.set(29, 21, 29);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);

    this.dynamicGroup = new THREE.Group();
    this.scene.add(this.dynamicGroup);

    // Discrete Euclidean vertex markers (radius 0.18, matching Circle Theorems makeMarker)
    const makeMarker3D = (col, radius = 0.18) =>
      new THREE.Mesh(
        new THREE.SphereGeometry(radius, 24, 24),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.25, metalness: 0.1 })
      );

    this.markerO = makeMarker3D(PALETTE.indigo, 0.16);
    this.handleP = makeMarker3D(PALETTE.violet, 0.18);
    this.handleHelix = makeMarker3D(PALETTE.violet, 0.18);
    this.handleA = makeMarker3D(PALETTE.red, 0.18);
    this.handleB = makeMarker3D(PALETTE.green, 0.18);
    this.handleC = makeMarker3D(PALETTE.violet, 0.18);
    this.scene.add(this.markerO, this.handleP, this.handleHelix, this.handleA, this.handleB, this.handleC);

    // Reusable 3D Angle Wedge & Right-Angle Meshes (matching Circle Theorems)
    this.wedge1 = makeAngleWedgeMesh(THREE, PALETTE.amber, 0.28);
    this.wedge2 = makeAngleWedgeMesh(THREE, PALETTE.green, 0.28);
    this.wedge3 = makeAngleWedgeMesh(THREE, PALETTE.violet, 0.28);
    this.reflexWedge1 = makeAngleWedgeMesh(THREE, PALETTE.teal, 0.22);
    this.rightAngle1 = makeRightAngleMesh(THREE, PALETTE.teal, 0.75);
    this.rightAngle2 = makeRightAngleMesh(THREE, PALETTE.amber, 0.75);
    this.rightAngle3 = makeRightAngleMesh(THREE, PALETTE.emerald, 0.75);
    this.rightAngle4 = makeRightAngleMesh(THREE, PALETTE.rose, 0.75);
    this.scene.add(this.wedge1, this.wedge2, this.wedge3, this.reflexWedge1, this.rightAngle1, this.rightAngle2, this.rightAngle3, this.rightAngle4);

    this.#configureDraggableTargets();
  }

  #configureDraggableTargets() {
    // Note: BaseScene3DView.enableInteraction calls onDrag(angle, hit, store, lat)
    // or sets activeTarget.field = angle!
    if (this.visualId === 'unit-circle-helix') {
      this.handleA.visible = false;
      this.handleB.visible = false;
      this.handleC.visible = false;
      this.draggableTargets = [
        {
          id: 'P',
          mesh: this.handleP,
          field: 'angleTheta',
        },
        {
          id: 'HelixP',
          mesh: this.handleHelix,
          field: 'angleTheta',
        },
      ];
    } else if (this.visualId === 'law-of-sines') {
      this.handleP.visible = false;
      const makeLawOfSinesTarget = (id, mesh, angleField, latField) => ({
        id,
        mesh,
        field: angleField,
        latField: latField,
        onDrag: (angle, hit, store, lat) => {
          const st = store.get();
          if (st.dimensionMode === 'spatial') {
            store.set({ [angleField]: angle, [latField]: lat });
          } else {
            store.set({ [angleField]: angle, [latField]: Math.PI / 2 });
          }
        },
      });
      this.draggableTargets = [
        makeLawOfSinesTarget('A', this.handleA, 'angleA', 'latA'),
        makeLawOfSinesTarget('B', this.handleB, 'angleB', 'latB'),
        makeLawOfSinesTarget('C', this.handleC, 'angleC', 'latC'),
      ];
    } else if (this.visualId === 'law-of-cosines') {
      this.handleP.visible = false;
      this.draggableTargets = [
        {
          id: 'B',
          mesh: this.handleB,
          onDrag: (angle, hit, store) => {
            let ang = Math.atan2(hit.z, hit.x);
            if (ang < 0) ang += Math.PI * 2;
            store.set({ angleC: ang });
          },
        },
      ];
    } else {
      // angle-sum-identities: vector apexes have invisible pick targets (no visible globes)
      this.handleB.visible = false;
      this.handleC.visible = false;
      this.handleA.material.transparent = true;
      this.handleA.material.opacity = 0.01;
      this.handleP.material.transparent = true;
      this.handleP.material.opacity = 0.01;
      this.handleC.material.transparent = true;
      this.handleC.material.opacity = 0.01;
      this.draggableTargets = [
        { id: 'A', mesh: this.handleA, field: 'angleAlpha' },
        {
          id: 'P',
          mesh: this.handleP,
          onDrag: (angle, _hit, store) => {
            const alpha = store.get().angleAlpha || 0;
            store.set({ angleBeta: normalizeAngle(angle - alpha) });
          },
        },
        {
          id: 'D',
          mesh: this.handleC,
          onDrag: (angle, _hit, store) => {
            const alpha = store.get().angleAlpha || 0;
            store.set({ angleBeta: normalizeAngle(alpha - angle) });
          },
        },
      ];
    }
  }

  #clearDynamicGroup() {
    while (this.dynamicGroup.children.length > 0) {
      const child = this.dynamicGroup.children.pop();
      if (child.geometry) child.geometry.dispose();
    }
  }

  /**
   * Colour grammar for the shared 3D markers: each marker takes the colour of the 2D point it
   * represents on this visual, so 2D ↔ 3D colours always agree.
   */
  #applyVisualPalette() {
    const set = (obj, col) => obj?.material?.color?.set(col);
    const byVisual = {
      'unit-circle-helix': {
        markerO: PALETTE.indigo,
        handleP: PALETTE.violet,
        rightAngle1: PALETTE.teal,
        rightAngle2: PALETTE.rose,
        rightAngle3: PALETTE.orange,
      },
      'law-of-sines': {
        markerO: PALETTE.indigo, handleA: PALETTE.red, handleB: PALETTE.green, handleC: PALETTE.violet,
        rightAngle1: PALETTE.teal, rightAngle2: PALETTE.amber,
      },
      // C at origin (rose), A ↔ a (sky), B ↔ b (emerald), projection foot D (amber)
      'law-of-cosines': {
        markerO: PALETTE.rose, handleA: PALETTE.sky, handleB: PALETTE.emerald, handleC: PALETTE.amber,
        rightAngle2: PALETTE.amber,
      },
      // A(α) sky, P(α+β) emerald, D(α-β) rose, right angle at Q violet, at M amber, at N emerald, at N_D rose
      'angle-sum-identities': {
        markerO: PALETTE.indigo, handleA: PALETTE.sky, handleP: PALETTE.emerald, handleC: PALETTE.rose,
        rightAngle1: PALETTE.violet, rightAngle2: PALETTE.amber, rightAngle3: PALETTE.emerald, rightAngle4: PALETTE.rose,
      },
    };
    const map = byVisual[this.visualId] || {};
    for (const [key, col] of Object.entries(map)) set(this[key], col);
  }

  render(state) {
    if (!state) return;
    this.R = getModelRadius(state);
    this.sphere.scale.setScalar(this.R);
    this.circleWire.scale.setScalar(this.R);

    this.applyCommonVis(state);
    this.#clearDynamicGroup();
    this.#applyVisualPalette();

    const THREE = this.THREE;
    const R = this.R;
    const vis3d = state.vis3d || {};
    const showPoints = vis3d.points !== false;
    const showLabels = vis3d.labels !== false;
    const showLengths = vis3d.lengths !== false;
    const showArea = vis3d.area !== false;
    const showAngles = vis3d.angles !== false;
    const showReflex = Boolean(vis3d.reflex);
    const angUnit = state.angleUnit || 'deg';
    const labels = [...AXES_3D_LABELS];

    // Reset reusable angle/right-angle meshes
    this.wedge1.visible = false;
    this.wedge2.visible = false;
    this.wedge3.visible = false;
    this.reflexWedge1.visible = false;
    this.rightAngle1.visible = false;
    this.rightAngle2.visible = false;
    this.rightAngle3.visible = false;
    this.rightAngle4.visible = false;

    const addSeg = (p1, p2, color, dashed = false) => {
      const geom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const mat = dashed
        ? new THREE.LineDashedMaterial({ color, dashSize: 0.45, gapSize: 0.28 })
        : new THREE.LineBasicMaterial({ color, linewidth: 2.2 });
      const line = new THREE.Line(geom, mat);
      if (dashed) line.computeLineDistances();
      this.dynamicGroup.add(line);
    };

    const addVectorArrow = (origin, target, color) => {
      const diff = new THREE.Vector3().subVectors(target, origin);
      const len = diff.length();
      if (len < 1e-4) return;
      const dir = diff.normalize();
      const arrow = new THREE.ArrowHelper(dir, origin, len, color, 0.65, 0.32);
      this.dynamicGroup.add(arrow);
    };

    if (this.visualId === 'unit-circle-helix') {
      const pitch = state.helixPitch || 0.35;
      const m = computeUnitCircleHelix(state.angleTheta, R, pitch);
      const O = new THREE.Vector3(0, 0, 0);
      const X_ref = new THREE.Vector3(R, 0, 0);
      const P_eq = new THREE.Vector3(R * m.cos, 0, R * m.sin);
      const projX = new THREE.Vector3(R * m.cos, 0, 0);
      const projZ = new THREE.Vector3(0, 0, R * m.sin);

      this.markerO.position.copy(O);
      this.handleP.position.copy(P_eq);
      this.handleP.visible = true;

      // 1. Structural 3D Cylinder Mesh & Vertical Generator Ribs
      const H_cyl = R * pitch * TAU;
      const yTop = H_cyl / 2;
      const yBot = -H_cyl / 2;
      if (state.vis3d?.cylinder !== false && state.showCylinder !== false) {
        const cylGeom = new THREE.CylinderGeometry(R, R, H_cyl, 48, 1, true);
        this.dynamicGroup.add(
          new THREE.Mesh(
            cylGeom,
            new THREE.MeshBasicMaterial({
              color: PALETTE.sky,
              transparent: true,
              opacity: 0.05,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          )
        );

        // Top & Bottom circular rim dashed wireframes
        const topPts = [];
        const botPts = [];
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * TAU;
          topPts.push(new THREE.Vector3(R * Math.cos(a), yTop, R * Math.sin(a)));
          botPts.push(new THREE.Vector3(R * Math.cos(a), yBot, R * Math.sin(a)));
        }
        const rimMat = new THREE.LineDashedMaterial({ color: PALETTE.sky, transparent: true, opacity: 0.35, dashSize: 0.5, gapSize: 0.3 });
        const topRim = new THREE.Line(new THREE.BufferGeometry().setFromPoints(topPts), rimMat);
        const botRim = new THREE.Line(new THREE.BufferGeometry().setFromPoints(botPts), rimMat);
        topRim.computeLineDistances();
        botRim.computeLineDistances();
        this.dynamicGroup.add(topRim, botRim);

        // Cardinal Vertical Generator Ribs (0°, 90°, 180°, 270°)
        for (const ang of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
          const rx = R * Math.cos(ang);
          const rz = R * Math.sin(ang);
          addSeg(new THREE.Vector3(rx, yBot, rz), new THREE.Vector3(rx, yTop, rz), PALETTE.slate600, true);
        }
      }

      // 2. 3D Cylindrical Helix Curve r(t) = (R cos t, y(t), R sin t)
      const helixPts = [];
      const cosWallPts = [];
      const sinWallPts = [];
      const wallDist = R * 1.35;
      for (let i = 0; i <= 140; i++) {
        const t = (i / 140) * TAU;
        const yH = R * pitch * (t - Math.PI);
        const hx = R * Math.cos(t);
        const hz = R * Math.sin(t);
        helixPts.push(new THREE.Vector3(hx, yH, hz));
        cosWallPts.push(new THREE.Vector3(hx, yH, -wallDist));
        sinWallPts.push(new THREE.Vector3(-wallDist, yH, hz));
      }
      this.dynamicGroup.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(helixPts),
          new THREE.LineBasicMaterial({ color: PALETTE.violet, linewidth: 2.5 })
        )
      );

      const yNow = R * pitch * (m.theta - Math.PI);
      const P_helix = new THREE.Vector3(R * m.cos, yNow, R * m.sin);
      this.handleHelix.position.copy(P_helix);
      this.handleHelix.visible = true;

      // 3. Dynamic Harmonic Wave Projections from P_helix to Cosine & Sine Walls
      if (state.showHelixWalls !== false) {
        this.dynamicGroup.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(cosWallPts),
            new THREE.LineBasicMaterial({ color: PALETTE.amber, transparent: true, opacity: 0.85 })
          ),
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(sinWallPts),
            new THREE.LineBasicMaterial({ color: PALETTE.emerald, transparent: true, opacity: 0.85 })
          )
        );

        const W_cos = new THREE.Vector3(R * m.cos, yNow, -wallDist);
        const W_sin = new THREE.Vector3(-wallDist, yNow, R * m.sin);

        // Harmonic projection rays linking helix point to continuous wave walls
        addSeg(P_helix, W_cos, PALETTE.amber, true);
        addSeg(P_helix, W_sin, PALETTE.emerald, true);

        // Reference baselines on walls
        addSeg(new THREE.Vector3(-R * 1.15, yNow, -wallDist), new THREE.Vector3(R * 1.15, yNow, -wallDist), PALETTE.slate700, true);
        addSeg(new THREE.Vector3(-wallDist, yNow, -R * 1.15), new THREE.Vector3(-wallDist, yNow, R * 1.15), PALETTE.slate700, true);

        // Wall tracking markers
        const makeMarkerMesh = (col, rad = 0.16) => {
          return new THREE.Mesh(
            new THREE.SphereGeometry(rad, 16, 16),
            new THREE.MeshStandardMaterial({ color: col, roughness: 0.25 })
          );
        };
        const mCos = makeMarkerMesh(PALETTE.amber, 0.16);
        mCos.position.copy(W_cos);
        const mSin = makeMarkerMesh(PALETTE.emerald, 0.16);
        mSin.position.copy(W_sin);
        this.dynamicGroup.add(mCos, mSin);

        labels.push(
          { key: 'W_cos', text: `cos θ = ${m.cos.toFixed(3)}`, at: { x: W_cos.x, y: W_cos.y + 0.45, z: W_cos.z }, color: 'color-amber', isAngle: true, show: true },
          { key: 'W_sin', text: `sin θ = ${m.sin.toFixed(3)}`, at: { x: W_sin.x, y: W_sin.y + 0.45, z: W_sin.z }, color: 'color-emerald', isAngle: true, show: true }
        );
      }

      // 4. Primary Radius Vector & Orthogonal Projections
      addVectorArrow(O, P_eq, PALETTE.indigo);
      if (state.showProjections !== false) {
        addSeg(O, projX, PALETTE.amber);
        addSeg(projX, P_eq, PALETTE.emerald);
        addSeg(O, projZ, PALETTE.emerald, true);
        addSeg(projZ, P_eq, PALETTE.amber, true);
      }
      addSeg(P_eq, P_helix, PALETTE.violet, true);

      // 5. Exterior Tangent & Secant (1 + tan²θ = sec²θ) in 3D
      if (state.showTanSec !== false) {
        const clampedTan = clamp(m.tan, -3.5, 3.5);
        const clampedSec = clamp(m.sec, -4.5, 4.5);
        const T_base = new THREE.Vector3(R, 0, 0);
        const T_tip = new THREE.Vector3(R, 0, R * clampedTan);
        const Sec_pt = new THREE.Vector3(R * clampedSec, 0, 0);

        addSeg(T_base, T_tip, PALETTE.rose);
        addSeg(O, T_tip, PALETTE.violet, true);
        addSeg(P_eq, Sec_pt, PALETTE.violet, true);

        setRightAngle3DVertices(this.rightAngle2, T_base, O, T_tip, 0.85, THREE);
        this.rightAngle2.visible = showAngles && Math.abs(clampedTan) > 0.15;

        if (showArea && Math.abs(m.tan) < 3.2) {
          const tanTri = new THREE.BufferGeometry().setFromPoints([O, T_base, T_tip]);
          tanTri.setIndex([0, 1, 2]);
          const tanColors = [
            0.388, 0.400, 0.945, // Indigo at O (r=1)
            0.957, 0.247, 0.369, // Rose at T_base (tan θ)
            0.008, 0.518, 0.780, // Sky at T_tip (sec θ)
          ];
          tanTri.setAttribute('color', new THREE.Float32BufferAttribute(tanColors, 3));
          this.dynamicGroup.add(
            new THREE.Mesh(
              tanTri,
              new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
            )
          );
        }

        if (showLengths) {
          if (Math.abs(m.tan) < 3.2) {
            labels.push({
              key: 'tan-len-3d',
              text: `tan θ = ${m.tan.toFixed(2)}`,
              at: { x: R + 1.2, y: 0.35, z: (R * clampedTan) / 2 },
              color: 'color-rose',
              isAngle: true,
              show: true,
            });
          }
          if (Math.abs(m.sec) < 4.5) {
            labels.push({
              key: 'sec-len-3d',
              text: `sec θ = ${m.sec.toFixed(2)}`,
              at: { x: Sec_pt.x / 2, y: 0.35, z: 0 },
              color: 'color-violet',
              isAngle: true,
              show: true,
            });
          }
        }
        if (showPoints) {
          labels.push(
            { key: 'T_base', name: 'T₀', at: { x: T_base.x + 0.6, y: 0.35, z: 0 }, coords: T_base, color: 'color-rose', show: true },
            { key: 'T_tip', name: 'T', at: { x: T_tip.x + 0.6, y: 0.35, z: T_tip.z + 0.6 }, coords: T_tip, color: 'color-rose', show: Math.abs(m.tan) < 3.5 },
            { key: 'Sec_pt', name: 'Sec', at: { x: Sec_pt.x + 0.6, y: 0.35, z: 0 }, coords: Sec_pt, color: 'color-violet', show: Math.abs(m.sec) < 4.5 }
          );
        }
      }

      // 6. Exterior Cotangent & Cosecant (1 + cot²θ = csc²θ) in 3D
      if (state.showCotCsc !== false) {
        const clampedCot = clamp(m.cot, -3.5, 3.5);
        const clampedCsc = clamp(m.csc, -4.5, 4.5);
        const C_base = new THREE.Vector3(0, 0, R);
        const C_tip = new THREE.Vector3(R * clampedCot, 0, R);
        const Csc_pt = new THREE.Vector3(0, 0, R * clampedCsc);

        addSeg(C_base, C_tip, PALETTE.orange);
        addSeg(O, C_tip, PALETTE.fuchsia, true);
        addSeg(P_eq, Csc_pt, PALETTE.fuchsia, true);

        setRightAngle3DVertices(this.rightAngle3, C_base, O, C_tip, 0.85, THREE);
        this.rightAngle3.visible = showAngles && Math.abs(clampedCot) > 0.15;

        if (showArea && Math.abs(m.cot) < 3.2) {
          const cotTri = new THREE.BufferGeometry().setFromPoints([O, C_base, C_tip]);
          cotTri.setIndex([0, 1, 2]);
          const cotColors = [
            0.388, 0.400, 0.945, // Indigo at O (r=1)
            0.976, 0.451, 0.086, // Orange at C_base (cot θ)
            0.851, 0.275, 0.937, // Fuchsia at C_tip (csc θ)
          ];
          cotTri.setAttribute('color', new THREE.Float32BufferAttribute(cotColors, 3));
          this.dynamicGroup.add(
            new THREE.Mesh(
              cotTri,
              new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
            )
          );
        }

        if (showLengths) {
          if (Math.abs(m.cot) < 3.2) {
            labels.push({
              key: 'cot-len-3d',
              text: `cot θ = ${m.cot.toFixed(2)}`,
              at: { x: (R * clampedCot) / 2, y: 0.35, z: R + 1.2 },
              color: 'color-orange',
              isAngle: true,
              show: true,
            });
          }
          if (Math.abs(m.csc) < 4.5) {
            labels.push({
              key: 'csc-len-3d',
              text: `csc θ = ${m.csc.toFixed(2)}`,
              at: { x: 0, y: 0.35, z: Csc_pt.z / 2 },
              color: 'color-fuchsia',
              isAngle: true,
              show: true,
            });
          }
        }
        if (showPoints) {
          labels.push(
            { key: 'C_base', name: 'C₀', at: { x: 0, y: 0.35, z: C_base.z + 0.6 }, coords: C_base, color: 'color-orange', show: true },
            { key: 'C_tip', name: 'Cot', at: { x: C_tip.x + 0.6, y: 0.35, z: C_tip.z + 0.6 }, coords: C_tip, color: 'color-orange', show: Math.abs(m.cot) < 3.5 },
            { key: 'Csc_pt', name: 'Csc', at: { x: 0, y: 0.35, z: Csc_pt.z + 0.6 }, coords: Csc_pt, color: 'color-fuchsia', show: Math.abs(m.csc) < 4.5 }
          );
        }
      }

      // 7. 3D Angle Wedge theta, Right-Angle Marker, and Reflex Wedge
      const wedgeR = Math.min(3.6, R * 0.36);
      setAngleWedgeVertices3D(this.wedge1, O, X_ref, P_eq, wedgeR, 24, THREE, m.theta > Math.PI);
      this.wedge1.visible = showAngles;
      setRightAngle3DVertices(this.rightAngle1, projX, O, P_eq, 0.9, THREE);
      this.rightAngle1.visible = showAngles && Math.abs(m.cos) > 0.1 && Math.abs(m.sin) > 0.1;

      setAngleWedgeVertices3D(this.reflexWedge1, O, X_ref, P_eq, wedgeR * 1.3, 32, THREE, m.theta <= Math.PI);
      this.reflexWedge1.visible = showReflex;

      if (showArea) {
        const triGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(O.x, 0.02, O.z),
          new THREE.Vector3(projX.x, 0.02, projX.z),
          new THREE.Vector3(P_eq.x, 0.02, P_eq.z),
        ]);
        triGeom.setIndex([0, 1, 2]);
        const triColors = [
          0.984, 0.749, 0.141, // Amber at origin O (cos θ span)
          0.078, 0.722, 0.651, // Teal at right-angle projX
          0.063, 0.725, 0.506, // Emerald at apex P_eq (sin θ span)
        ];
        triGeom.setAttribute('color', new THREE.Float32BufferAttribute(triColors, 3));
        this.dynamicGroup.add(
          new THREE.Mesh(
            triGeom,
            new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })
          )
        );
      }

      // Directed-angle label anchors: θ at θ/2, conjugate θ* at θ/2 + π (valid for θ on either side of 180°)
      const bisPos = getPolarLabel3D(m.theta / 2, 3.4);
      const refPos = getPolarLabel3D(m.theta / 2 + Math.PI, 4.0);

      labels.push(
        { key: 'O', name: 'O', at: { x: 0, y: 0.6, z: 0 }, coords: { x: 0, y: 0, z: 0 }, color: 'color-indigo' },
        { key: 'P', name: 'P(θ)', at: { x: P_eq.x * 1.15, y: 0.4, z: P_eq.z * 1.15 }, coords: { x: P_eq.x, y: 0, z: P_eq.z }, color: 'color-violet' },
        { key: 'Cx', name: 'Cx', at: { x: projX.x, y: 0.4, z: 0 }, coords: { x: projX.x, y: 0, z: 0 }, color: 'color-amber', show: state.showProjections !== false },
        { key: 'H', name: 'Helix(θ)', at: { x: P_helix.x * 1.12, y: P_helix.y + 0.6, z: P_helix.z * 1.12 }, coords: { x: P_helix.x, y: P_helix.y, z: P_helix.z }, color: 'color-teal' },
        { key: 'ang-theta', text: `θ = ${fmtAngle(m.thetaDeg, angUnit)}`, at: bisPos, color: 'color-amber', isAngle: true, show: showAngles },
        { key: 'ref-theta', text: `θ* = ${fmtAngle(360 - m.thetaDeg, angUnit)}`, at: refPos, color: 'color-teal', isAngle: true, show: showReflex }
      );

      if (Math.abs(yNow) > 0.8) {
        labels.push({
          key: 'helix-y',
          text: `y(θ) = ${yNow.toFixed(2)}`,
          at: { x: P_eq.x + 0.8 * Math.cos(m.theta), y: yNow / 2, z: P_eq.z + 0.8 * Math.sin(m.theta) },
          color: 'color-violet',
          isAngle: true,
          show: true,
        });
      }

      if (state.showProjections !== false && showLengths) {
        labels.push(
          { key: 'cos-len-3d', text: `cos θ = ${m.cos.toFixed(3)}`, at: { x: projX.x / 2, y: 0.35, z: m.sin >= 0 ? -0.8 : 0.8 }, color: 'color-amber', isAngle: true, show: true },
          { key: 'sin-len-3d', text: `sin θ = ${m.sin.toFixed(3)}`, at: { x: projX.x + 1.2 * (m.cos >= 0 ? 1 : -1), y: 0.35, z: P_eq.z / 2 }, color: 'color-emerald', isAngle: true, show: true }
        );
      }
    } else if (this.visualId === 'law-of-sines') {
      const isSpatial = state.dimensionMode === 'spatial';
      if (isSpatial) {
        // --- TRUE 3D SPHERICAL GEOMETRY ON S² ---
        const sM = computeSphericalLawOfSines(state, R);
        const O = new THREE.Vector3(0, 0, 0);
        const A = new THREE.Vector3(sM.vertices3D.A.x, sM.vertices3D.A.y, sM.vertices3D.A.z);
        const B = new THREE.Vector3(sM.vertices3D.B.x, sM.vertices3D.B.y, sM.vertices3D.B.z);
        const C = new THREE.Vector3(sM.vertices3D.C.x, sM.vertices3D.C.y, sM.vertices3D.C.z);

        this.markerO.position.copy(O);
        this.handleA.position.copy(A);
        this.handleB.position.copy(B);
        this.handleC.position.copy(C);

        // Spherical Great-Circle Geodesic Arcs on S²
        const addGeodesicArc = (p1, p2, col, numSegs = 40) => {
          const u1 = p1.clone().normalize();
          const u2 = p2.clone().normalize();
          const dotVal = clamp(u1.dot(u2), -1, 1);
          const theta = Math.acos(dotVal);
          const pts = [];
          if (theta < 1e-4) {
            pts.push(p1.clone(), p2.clone());
          } else {
            const sinTh = Math.sin(theta);
            for (let i = 0; i <= numSegs; i++) {
              const t = i / numSegs;
              const w1 = Math.sin((1 - t) * theta) / sinTh;
              const w2 = Math.sin(t * theta) / sinTh;
              const p = new THREE.Vector3()
                .addScaledVector(u1, w1)
                .addScaledVector(u2, w2)
                .normalize()
                .multiplyScalar(R);
              pts.push(p);
            }
          }
          const geom = new THREE.BufferGeometry().setFromPoints(pts);
          const mat = new THREE.LineBasicMaterial({ color: col, linewidth: 2.6 });
          this.dynamicGroup.add(new THREE.Line(geom, mat));
        };

        // Geodesic Arcs: BC = a (red), AC = b (green), AB = c (violet)
        addGeodesicArc(B, C, PALETTE.red);
        addGeodesicArc(A, C, PALETTE.green);
        addGeodesicArc(A, B, PALETTE.violet);

        // Subtended central rays from origin O to vertices A, B, C
        if (state.showRadii !== false) {
          addSeg(O, A, PALETTE.indigo, true);
          addSeg(O, B, PALETTE.indigo, true);
          addSeg(O, C, PALETTE.indigo, true);
        }

        // Spherical Triangle Curved Mesh Cap on S²
        if (showArea) {
          const uA = sM.unitVectors.uA;
          const uB = sM.unitVectors.uB;
          const uC = sM.unitVectors.uC;
          const N = 18;
          const positions = [];
          const indices = [];
          const grid = [];

          let idx = 0;
          for (let i = 0; i <= N; i++) {
            grid[i] = [];
            for (let j = 0; j <= N - i; j++) {
              const k = N - i - j;
              const wA = k / N;
              const wB = i / N;
              const wC = j / N;
              const vx = wA * uA.x + wB * uB.x + wC * uC.x;
              const vy = wA * uA.y + wB * uB.y + wC * uC.y;
              const vz = wA * uA.z + wB * uB.z + wC * uC.z;
              const len = Math.hypot(vx, vy, vz) || 1;
              const rLift = R * 1.002;
              positions.push((vx / len) * rLift, (vy / len) * rLift, (vz / len) * rLift);
              grid[i][j] = idx++;
            }
          }

          for (let i = 0; i < N; i++) {
            for (let j = 0; j < N - i; j++) {
              const p0 = grid[i][j];
              const p1 = grid[i + 1][j];
              const p2 = grid[i][j + 1];
              indices.push(p0, p1, p2);
              if (j < N - i - 1) {
                const p3 = grid[i + 1][j + 1];
                indices.push(p1, p3, p2);
              }
            }
          }

          const sphCapGeom = new THREE.BufferGeometry();
          sphCapGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
          sphCapGeom.setIndex(indices);
          sphCapGeom.computeVertexNormals();

          this.dynamicGroup.add(
            new THREE.Mesh(
              sphCapGeom,
              new THREE.MeshBasicMaterial({
                color: PALETTE.sky,
                transparent: true,
                opacity: 0.28,
                side: THREE.DoubleSide,
                depthWrite: false,
              })
            )
          );

          // Subtle Trihedral Cone internal face planes O-AB, O-BC, O-CA
          const addConeFace = (v1, v2) => {
            const coneGeom = new THREE.BufferGeometry().setFromPoints([O, v1, v2]);
            coneGeom.setIndex([0, 1, 2]);
            this.dynamicGroup.add(
              new THREE.Mesh(
                coneGeom,
                new THREE.MeshBasicMaterial({
                  color: PALETTE.indigo,
                  transparent: true,
                  opacity: 0.08,
                  side: THREE.DoubleSide,
                  depthWrite: false,
                })
              )
            );
          };
          addConeFace(A, B);
          addConeFace(B, C);
          addConeFace(C, A);
        }

        // Tangent directions at each vertex along geodesic edges for angle wedges:
        const tangentAt = (fromPt, toPt) => {
          const uF = fromPt.clone().normalize();
          const uT = toPt.clone().normalize();
          return new THREE.Vector3().subVectors(uT, uF.clone().multiplyScalar(uF.dot(uT))).normalize();
        };

        const tAB = tangentAt(A, B);
        const tAC = tangentAt(A, C);
        const tBA = tangentAt(B, A);
        const tBC = tangentAt(B, C);
        const tCA = tangentAt(C, A);
        const tCB = tangentAt(C, B);

        // Position wedge vertices using tangent frame
        this.wedge1.material.color.set(PALETTE.red);
        this.wedge1.arcLine.material.color.set(PALETTE.red);
        setAngleWedgeVertices3D(this.wedge1, A, A.clone().addScaledVector(tAB, 2.5), A.clone().addScaledVector(tAC, 2.5), 2.2, 24, THREE);

        this.wedge2.material.color.set(PALETTE.green);
        this.wedge2.arcLine.material.color.set(PALETTE.green);
        setAngleWedgeVertices3D(this.wedge2, B, B.clone().addScaledVector(tBA, 2.5), B.clone().addScaledVector(tBC, 2.5), 2.2, 24, THREE);

        this.wedge3.material.color.set(PALETTE.violet);
        this.wedge3.arcLine.material.color.set(PALETTE.violet);
        setAngleWedgeVertices3D(this.wedge3, C, C.clone().addScaledVector(tCA, 2.5), C.clone().addScaledVector(tCB, 2.5), 2.2, 24, THREE);

        this.wedge1.visible = this.wedge2.visible = this.wedge3.visible = showAngles;

        // Centroid of spherical triangle for excess label
        const cX = (A.x + B.x + C.x) / 3;
        const cY = (A.y + B.y + C.y) / 3;
        const cZ = (A.z + B.z + C.z) / 3;
        const cLen = Math.hypot(cX, cY, cZ) || 1;
        const capCenter = new THREE.Vector3((cX / cLen) * (R * 1.08), (cY / cLen) * (R * 1.08), (cZ / cLen) * (R * 1.08));

        labels.push(
          { key: 'O', name: 'O', at: { x: 0, y: 0.6, z: 0 }, coords: O, color: 'color-indigo' },
          { key: 'A', name: 'A', at: { x: A.x * 1.15, y: A.y + 0.4, z: A.z * 1.15 }, coords: A, color: 'color-red' },
          { key: 'B', name: 'B', at: { x: B.x * 1.15, y: B.y + 0.4, z: B.z * 1.15 }, coords: B, color: 'color-green' },
          { key: 'C', name: 'C', at: { x: C.x * 1.15, y: C.y + 0.4, z: C.z * 1.15 }, coords: C, color: 'color-violet' },
          { key: 'sphA', text: `A_sph = ${fmtAngle(sM.sphericalAngles.degA, angUnit)}`, at: { x: A.x * 1.05 + tAC.x * 1.2, y: A.y + 0.8, z: A.z * 1.05 + tAC.z * 1.2 }, color: 'color-red', isAngle: true, show: showAngles },
          { key: 'sphB', text: `B_sph = ${fmtAngle(sM.sphericalAngles.degB, angUnit)}`, at: { x: B.x * 1.05 + tBC.x * 1.2, y: B.y + 0.8, z: B.z * 1.05 + tBC.z * 1.2 }, color: 'color-green', isAngle: true, show: showAngles },
          { key: 'sphC', text: `C_sph = ${fmtAngle(sM.sphericalAngles.degC, angUnit)}`, at: { x: C.x * 1.05 + tCA.x * 1.2, y: C.y + 0.8, z: C.z * 1.05 + tCA.z * 1.2 }, color: 'color-violet', isAngle: true, show: showAngles },
          { key: 'sphExcess', text: `Excess E = ${sM.sphericalExcess.excessDeg.toFixed(1)}°`, at: capCenter, color: 'color-amber', isAngle: true, show: true }
        );
      } else {
        // --- PLANAR EUCLIDEAN EMBEDDING (Y = 0) ---
        const m = computeLawOfSines(state.angleA, state.angleB, state.angleC, R);
        const O = new THREE.Vector3(0, 0, 0);
        const A = new THREE.Vector3(m.vertices2D.A.x, 0, m.vertices2D.A.y);
        const B = new THREE.Vector3(m.vertices2D.B.x, 0, m.vertices2D.B.y);
        const C = new THREE.Vector3(m.vertices2D.C.x, 0, m.vertices2D.C.y);
        const Ap = new THREE.Vector3(m.vertices2D.antipodeA.x, 0, m.vertices2D.antipodeA.y);
        const Hc = new THREE.Vector3(m.vertices2D.footHc.x, 0, m.vertices2D.footHc.y);

        this.markerO.position.copy(O);
        this.handleA.position.copy(A);
        this.handleB.position.copy(B);
        this.handleC.position.copy(C);

        addSeg(B, C, PALETTE.red);
        addSeg(A, C, PALETTE.green);
        addSeg(A, B, PALETTE.violet);

        if (state.showRadii !== false) {
          addSeg(O, A, PALETTE.indigo, true);
          addSeg(O, B, PALETTE.indigo, true);
          addSeg(O, C, PALETTE.indigo, true);
        }

        if (state.showCircumcircleDiameter !== false) {
          addSeg(B, Ap, PALETTE.amber, true);
          addSeg(Ap, C, PALETTE.amber, true);
          setRightAngle3DVertices(this.rightAngle2, C, Ap, B, 0.95, THREE);
          this.rightAngle2.visible = showAngles;
        }
        if (state.showAltitude !== false) {
          addSeg(C, Hc, PALETTE.teal, true);
          setRightAngle3DVertices(this.rightAngle1, Hc, C, B, 0.85, THREE);
          this.rightAngle1.visible = showAngles;
        }

        // 3D Interior Angle Wedges at A, B, C & Reflex Wedge at C
        this.wedge1.material.color.set(PALETTE.red);
        this.wedge1.arcLine.material.color.set(PALETTE.red);
        setAngleWedgeVertices3D(this.wedge1, A, B, C, 2.2, 24, THREE);
        this.wedge2.material.color.set(PALETTE.green);
        this.wedge2.arcLine.material.color.set(PALETTE.green);
        setAngleWedgeVertices3D(this.wedge2, B, A, C, 2.2, 24, THREE);
        this.wedge3.material.color.set(PALETTE.violet);
        this.wedge3.arcLine.material.color.set(PALETTE.violet);
        setAngleWedgeVertices3D(this.wedge3, C, A, B, 2.2, 24, THREE);
        this.wedge1.visible = this.wedge2.visible = this.wedge3.visible = showAngles;

        setAngleWedgeVertices3D(this.reflexWedge1, C, A, B, 2.9, 32, THREE, true);
        this.reflexWedge1.visible = showReflex;

        if (showArea) {
          if (state.showAltitude !== false) {
            const leftGeom = new THREE.BufferGeometry().setFromPoints([A, Hc, C]);
            leftGeom.setIndex([0, 1, 2]);
            const leftColors = [
              0.133, 0.773, 0.369, // Emerald at A
              0.078, 0.722, 0.651, // Teal at Hc
              0.133, 0.773, 0.369, // Emerald at C
            ];
            leftGeom.setAttribute('color', new THREE.Float32BufferAttribute(leftColors, 3));
            this.dynamicGroup.add(
              new THREE.Mesh(
                leftGeom,
                new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
              )
            );

            const rightGeom = new THREE.BufferGeometry().setFromPoints([B, Hc, C]);
            rightGeom.setIndex([0, 1, 2]);
            const rightColors = [
              0.937, 0.267, 0.267, // Red at B
              0.078, 0.722, 0.651, // Teal at Hc
              0.937, 0.267, 0.267, // Red at C
            ];
            rightGeom.setAttribute('color', new THREE.Float32BufferAttribute(rightColors, 3));
            this.dynamicGroup.add(
              new THREE.Mesh(
                rightGeom,
                new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
              )
            );
          } else {
            const triGeom = new THREE.BufferGeometry().setFromPoints([A, B, C]);
            triGeom.setIndex([0, 1, 2]);
            this.dynamicGroup.add(
              new THREE.Mesh(
                triGeom,
                new THREE.MeshBasicMaterial({ color: PALETTE.sky, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
              )
            );
          }

          if (state.showCircumcircleDiameter !== false) {
            const thalesGeom = new THREE.BufferGeometry().setFromPoints([Ap, B, C]);
            thalesGeom.setIndex([0, 1, 2]);
            const thalesColors = [
              0.984, 0.749, 0.141, // Amber at Ap
              0.984, 0.749, 0.141, // Amber at B
              0.078, 0.722, 0.651, // Teal at C
            ];
            thalesGeom.setAttribute('color', new THREE.Float32BufferAttribute(thalesColors, 3));
            this.dynamicGroup.add(
              new THREE.Mesh(
                thalesGeom,
                new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
              )
            );
          }
        }

        const bisA = get3DAngleBisector(A, B, C, 3.2, THREE);
        const bisB = get3DAngleBisector(B, A, C, 3.2, THREE);
        const bisC = get3DAngleBisector(C, A, B, 3.2, THREE);
        const refC = get3DReflexBisector(C, A, B, 3.8, THREE);

        labels.push(
          { key: 'O', name: 'O', at: { x: 0, y: 0.6, z: 0 }, coords: O, color: 'color-indigo' },
          { key: 'A', name: 'A', at: { x: A.x * 1.15, y: 0.4, z: A.z * 1.15 }, coords: A, color: 'color-red' },
          { key: 'B', name: 'B', at: { x: B.x * 1.15, y: 0.4, z: B.z * 1.15 }, coords: B, color: 'color-green' },
          { key: 'C', name: 'C', at: { x: C.x * 1.15, y: 0.4, z: C.z * 1.15 }, coords: C, color: 'color-violet' },
          { key: 'Ap', name: "A'", at: { x: Ap.x * 1.15, y: 0.4, z: Ap.z * 1.15 }, coords: Ap, color: 'color-amber', show: state.showCircumcircleDiameter !== false },
          { key: 'Hc', name: 'Hc', at: { x: Hc.x, y: 0.4, z: Hc.z }, coords: Hc, color: 'color-teal', show: state.showAltitude !== false },
          { key: 'angA', text: `∠A = ${fmtAngle(m.interiorAngles.degA, angUnit)}`, at: bisA, color: 'color-red', isAngle: true, show: showAngles },
          { key: 'angB', text: `∠B = ${fmtAngle(m.interiorAngles.degB, angUnit)}`, at: bisB, color: 'color-green', isAngle: true, show: showAngles },
          { key: 'angC', text: `∠C = ${fmtAngle(m.interiorAngles.degC, angUnit)}`, at: bisC, color: 'color-violet', isAngle: true, show: showAngles },
          { key: 'refC', text: `∠C* = ${fmtAngle(360 - m.interiorAngles.degC, angUnit)}`, at: refC, color: 'color-teal', isAngle: true, show: showReflex }
        );
      }
    } else if (this.visualId === 'law-of-cosines') {
      const isSpatial = state.dimensionMode === 'spatial';
      if (isSpatial) {
        const sM = computeSphericalLawOfCosines(state.sideA, state.sideB, state.angleC, R);
        const O = new THREE.Vector3(0, 0, 0);
        const C = new THREE.Vector3(sM.vertices3D.C.x, sM.vertices3D.C.y, sM.vertices3D.C.z);
        const A = new THREE.Vector3(sM.vertices3D.A.x, sM.vertices3D.A.y, sM.vertices3D.A.z);
        const B = new THREE.Vector3(sM.vertices3D.B.x, sM.vertices3D.B.y, sM.vertices3D.B.z);

        this.markerO.position.copy(O);
        this.handleA.position.copy(A);
        this.handleB.position.copy(B);
        this.handleC.position.copy(C);
        this.handleA.visible = true;
        this.handleB.visible = true;
        this.handleC.visible = true;

        if (state.showRadii !== false) {
          addSeg(O, C, PALETTE.indigo, true);
          addSeg(O, A, PALETTE.indigo, true);
          addSeg(O, B, PALETTE.indigo, true);
        }

        const addGeodesicArc = (v1, v2, color, isDashed = false, segments = 36) => {
          const pts = [];
          const u1 = v1.clone().normalize();
          const u2 = v2.clone().normalize();
          const dot = clamp(u1.dot(u2), -1, 1);
          const omega = Math.acos(dot);
          const sinOmega = Math.sin(omega);
          for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            if (sinOmega < 1e-5) {
              pts.push(v1.clone().lerp(v2, t));
            } else {
              const s1 = Math.sin((1 - t) * omega) / sinOmega;
              const s2 = Math.sin(t * omega) / sinOmega;
              const pt = new THREE.Vector3().addVectors(u1.clone().multiplyScalar(s1), u2.clone().multiplyScalar(s2)).multiplyScalar(R);
              pts.push(pt);
            }
          }
          const geom = new THREE.BufferGeometry().setFromPoints(pts);
          const mat = isDashed
            ? new THREE.LineDashedMaterial({ color, dashSize: 0.5, gapSize: 0.3 })
            : new THREE.LineBasicMaterial({ color, linewidth: 2 });
          const line = new THREE.Line(geom, mat);
          if (isDashed) line.computeLineDistances();
          this.dynamicGroup.add(line);
        };

        addGeodesicArc(C, A, PALETTE.emerald);
        addGeodesicArc(C, B, PALETTE.sky);
        addGeodesicArc(A, B, PALETTE.rose);

        if (showArea) {
          const nSub = 8;
          const verts = [];
          const indices = [];
          for (let i = 0; i <= nSub; i++) {
            for (let j = 0; j <= nSub - i; j++) {
              const k = nSub - i - j;
              const wA = i / nSub;
              const wB = j / nSub;
              const wC = k / nSub;
              const p = new THREE.Vector3()
                .addScaledVector(A, wA)
                .addScaledVector(B, wB)
                .addScaledVector(C, wC)
                .normalize()
                .multiplyScalar(R * 1.002);
              verts.push(p.x, p.y, p.z);
            }
          }
          let rowStart = 0;
          for (let i = 0; i < nSub; i++) {
            const nextRow = rowStart + (nSub - i + 1);
            for (let j = 0; j < nSub - i; j++) {
              indices.push(rowStart + j, nextRow + j, rowStart + j + 1);
              if (j < nSub - i - 1) {
                indices.push(rowStart + j + 1, nextRow + j, nextRow + j + 1);
              }
            }
            rowStart = nextRow;
          }
          const sphCapGeom = new THREE.BufferGeometry();
          sphCapGeom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
          sphCapGeom.setIndex(indices);
          sphCapGeom.computeVertexNormals();

          this.dynamicGroup.add(
            new THREE.Mesh(
              sphCapGeom,
              new THREE.MeshBasicMaterial({
                color: PALETTE.teal,
                transparent: true,
                opacity: 0.28,
                side: THREE.DoubleSide,
                depthWrite: false,
              })
            )
          );
        }

        const tangentAt = (fromPt, toPt) => {
          const uF = fromPt.clone().normalize();
          const uT = toPt.clone().normalize();
          return new THREE.Vector3().subVectors(uT, uF.clone().multiplyScalar(uF.dot(uT))).normalize();
        };

        const tCA = tangentAt(C, A);
        const tCB = tangentAt(C, B);
        const tAC = tangentAt(A, C);
        const tAB = tangentAt(A, B);
        const tBC = tangentAt(B, C);
        const tBA = tangentAt(B, A);

        this.wedge1.material.color.set(PALETTE.rose);
        this.wedge1.arcLine.material.color.set(PALETTE.rose);
        setAngleWedgeVertices3D(this.wedge1, C, C.clone().addScaledVector(tCA, 2.5), C.clone().addScaledVector(tCB, 2.5), 2.2, 24, THREE);

        this.wedge2.material.color.set(PALETTE.sky);
        this.wedge2.arcLine.material.color.set(PALETTE.sky);
        setAngleWedgeVertices3D(this.wedge2, A, A.clone().addScaledVector(tAC, 2.5), A.clone().addScaledVector(tAB, 2.5), 2.0, 24, THREE);

        this.wedge3.material.color.set(PALETTE.emerald);
        this.wedge3.arcLine.material.color.set(PALETTE.emerald);
        setAngleWedgeVertices3D(this.wedge3, B, B.clone().addScaledVector(tBC, 2.5), B.clone().addScaledVector(tBA, 2.5), 2.0, 24, THREE);

        this.wedge1.visible = this.wedge2.visible = this.wedge3.visible = showAngles;
        this.rightAngle2.visible = false;
        this.reflexWedge1.visible = false;

        const cX = (A.x + B.x + C.x) / 3;
        const cY = (A.y + B.y + C.y) / 3;
        const cZ = (A.z + B.z + C.z) / 3;
        const cLen = Math.hypot(cX, cY, cZ) || 1;
        const capCenter = new THREE.Vector3((cX / cLen) * (R * 1.08), (cY / cLen) * (R * 1.08), (cZ / cLen) * (R * 1.08));

        labels.push(
          { key: 'O', name: 'O', at: { x: 0, y: -0.6, z: 0 }, coords: O, color: 'color-indigo' },
          { key: 'C', name: 'C', at: { x: 0, y: R + 0.8, z: 0 }, coords: C, color: 'color-rose' },
          { key: 'A', name: 'A', at: { x: A.x * 1.15, y: A.y + 0.4, z: A.z * 1.15 }, coords: A, color: 'color-sky' },
          { key: 'B', name: 'B', at: { x: B.x * 1.15, y: B.y + 0.4, z: B.z * 1.15 }, coords: B, color: 'color-emerald' },
          { key: 'sph-C', text: `∠C = ${fmtAngle(sM.angleCDeg, angUnit)}`, at: { x: C.x + tCA.x * 1.4, y: C.y + 0.8, z: C.z + tCA.z * 1.4 }, color: 'color-rose', isAngle: true, show: showAngles },
          { key: 'sph-A', text: `A_sph = ${fmtAngle(sM.sphericalAngles.degA, angUnit)}`, at: { x: A.x * 1.05 + tAC.x * 1.2, y: A.y + 0.8, z: A.z * 1.05 + tAC.z * 1.2 }, color: 'color-sky', isAngle: true, show: showAngles },
          { key: 'sph-B', text: `B_sph = ${fmtAngle(sM.sphericalAngles.degB, angUnit)}`, at: { x: B.x * 1.05 + tBC.x * 1.2, y: B.y + 0.8, z: B.z * 1.05 + tBC.z * 1.2 }, color: 'color-emerald', isAngle: true, show: showAngles },
          { key: 'sph-excess', text: `Excess E = ${sM.sphericalExcess.excessDeg.toFixed(1)}°`, at: capCenter, color: 'color-amber', isAngle: true, show: true },
          ...(state.showRatioBadge !== false
            ? [
                {
                  key: 'sph-ratio-cos',
                  text: `cos C = ${Math.cos(sM.angleC).toFixed(3)}`,
                  at: { x: C.x, y: R + 1.4, z: 0 },
                  color: Math.cos(sM.angleC) >= 0 ? 'color-amber' : 'color-rose',
                  isAngle: true,
                  show: true,
                },
              ]
            : [])
        );
      } else {
        const m = computeLawOfCosines(state.sideA, state.sideB, state.angleC);
        const s = R / Math.max(m.a, m.b, m.c, 10);
        const C = new THREE.Vector3(0, 0, 0);
        const A = new THREE.Vector3(m.b * s, 0, 0);
        const B = new THREE.Vector3(m.vertices2D.B.x * s, 0, m.vertices2D.B.y * s);
        const D = new THREE.Vector3(m.vertices2D.D.x * s, 0, 0);

        this.markerO.position.copy(C);
        this.handleA.position.copy(A);
        this.handleB.position.copy(B);
        this.handleC.position.copy(D);
        this.handleA.visible = true;
        this.handleB.visible = true;
        this.handleC.visible = state.showProjection !== false;

        addSeg(C, A, PALETTE.emerald);
        addSeg(C, B, PALETTE.sky);
        addSeg(A, B, PALETTE.rose);
        if (state.showProjection !== false) {
          addSeg(B, D, PALETTE.amber, true);
          addSeg(C, D, PALETTE.amber, true);
          setRightAngle3DVertices(this.rightAngle2, D, B, A, 0.9, THREE);
          this.rightAngle2.visible = showAngles;
        }

        // 3D Angle Wedges at C, A, B (unified color grammar: A ↔ sky, B ↔ emerald, C ↔ rose)
        this.wedge1.material.color.set(PALETTE.rose);
        this.wedge1.arcLine.material.color.set(PALETTE.rose);
        setAngleWedgeVertices3D(this.wedge1, C, A, B, 2.2, 24, THREE);
        this.wedge2.material.color.set(PALETTE.sky);
        this.wedge2.arcLine.material.color.set(PALETTE.sky);
        setAngleWedgeVertices3D(this.wedge2, A, C, B, 1.9, 24, THREE);
        this.wedge3.material.color.set(PALETTE.emerald);
        this.wedge3.arcLine.material.color.set(PALETTE.emerald);
        setAngleWedgeVertices3D(this.wedge3, B, C, A, 1.9, 24, THREE);
        this.wedge1.visible = this.wedge2.visible = this.wedge3.visible = showAngles;

        setAngleWedgeVertices3D(this.reflexWedge1, C, A, B, 2.9, 32, THREE, true);
        this.reflexWedge1.visible = showReflex;

        if (showArea) {
          const triGeom = new THREE.BufferGeometry().setFromPoints([C, A, B]);
          triGeom.setIndex([0, 1, 2]);
          this.dynamicGroup.add(
            new THREE.Mesh(
              triGeom,
              new THREE.MeshBasicMaterial({ color: PALETTE.teal, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
            )
          );
        }

        // 3D Bilinear Interaction Rectangle Mesh (2ab cos C) in the XZ ground plane (locked to PALETTE.amber invariant)
        const showInteractionRect = state.showInteractionRect !== false && showArea;
        const rectDepth = Math.min(2.8, A.x * 0.28);
        if (showInteractionRect) {
          const rectColor = PALETTE.amber;
          const R0 = new THREE.Vector3(0, 0.015, 0);
          const R1 = new THREE.Vector3(D.x, 0.015, 0);
          const R2 = new THREE.Vector3(D.x, 0.015, -rectDepth);
          const R3 = new THREE.Vector3(0, 0.015, -rectDepth);

          const rectGeom = new THREE.BufferGeometry().setFromPoints([R0, R1, R2, R3]);
          rectGeom.setIndex([0, 1, 2, 0, 2, 3]);

          const colors = [
            0.957, 0.247, 0.369, // Corner R0 at Vertex C: Rose (#f43f5e)
            0.055, 0.647, 0.914, // Corner R1 at Projection Foot D (a cos C along X): Sky (#0284c7)
            0.063, 0.725, 0.506, // Corner R2 at depth -rectDepth along Z: Emerald (#10b981)
            0.063, 0.725, 0.506, // Corner R3 at depth -rectDepth along Z: Emerald (#10b981)
          ];
          rectGeom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

          this.dynamicGroup.add(
            new THREE.Mesh(
              rectGeom,
              new THREE.MeshBasicMaterial({
                color: rectColor,
                vertexColors: true,
                transparent: true,
                opacity: 0.28,
                side: THREE.DoubleSide,
              })
            )
          );

          // Dashed rectangular wireframe perimeter decomposed by tensor components
          addSeg(R0, R1, PALETTE.sky, true);
          addSeg(R3, R2, PALETTE.sky, true);
          addSeg(R0, R3, PALETTE.emerald, true);
          addSeg(R1, R2, PALETTE.emerald, true);
        }

        const bisA = get3DAngleBisector(A, C, B, 3.0, THREE);
        const bisB = get3DAngleBisector(B, C, A, 3.0, THREE);
        const bisC = get3DAngleBisector(C, A, B, 3.2, THREE);
        const refC = get3DReflexBisector(C, A, B, 3.8, THREE);

        labels.push(
          { key: 'C', name: 'C', at: { x: -0.9, y: 0.5, z: -0.9 }, coords: C, color: 'color-rose' },
          { key: 'A', name: 'A', at: { x: A.x + 0.9, y: 0.5, z: 0 }, coords: A, color: 'color-sky' },
          { key: 'B', name: 'B', at: { x: B.x, y: 0.6, z: B.z + 0.9 }, coords: B, color: 'color-emerald' },
          { key: 'D', name: 'D', at: { x: D.x, y: 0.4, z: -0.9 }, coords: D, color: 'color-amber', show: state.showProjection !== false },
          { key: 'ang-C', text: `∠C = ${fmtAngle(m.angleCDeg, angUnit)}`, at: bisC, color: 'color-rose', isAngle: true, show: showAngles },
          { key: 'ang-A', text: `∠A = ${fmtAngle(toDegrees(m.angleA), angUnit)}`, at: bisA, color: 'color-sky', isAngle: true, show: showAngles },
          { key: 'ang-B', text: `∠B = ${fmtAngle(toDegrees(m.angleB), angUnit)}`, at: bisB, color: 'color-emerald', isAngle: true, show: showAngles },
          { key: 'ref-C', text: `∠C* = ${fmtAngle(360 - m.angleCDeg, angUnit)}`, at: refC, color: 'color-teal', isAngle: true, show: showReflex },
          {
            key: 'rect-2abcos',
            text: `2ab cos C = ${m.squares.interaction2abCosC.toFixed(1)}`,
            at: { x: D.x / 2, y: 0.35, z: -rectDepth / 2 },
            color: 'color-amber',
            isAngle: true,
            show: showInteractionRect,
          },
          ...(state.showRatioBadge !== false
            ? [
                {
                  key: 'ratio-cos',
                  text: `cos C = (a²+b²−c²)/(2ab) = ${m.cosC.toFixed(3)}`,
                  at: { x: D.x / 2, y: 1.1, z: 0.6 },
                  color: 'color-amber',
                  isAngle: true,
                  show: true,
                },
              ]
            : [])
        );
      }
    } else {
      const isSpatial = state.dimensionMode === 'spatial';
      if (isSpatial) {
        const eM = computeSpatialAngleSumEuler(state.angleAlpha, state.angleBeta, state.angleGamma, R);
        const O = new THREE.Vector3(0, 0, 0);
        const e1 = new THREE.Vector3(eM.triad.e1.x, eM.triad.e1.z, eM.triad.e1.y);
        const e2 = new THREE.Vector3(eM.triad.e2.x, eM.triad.e2.z, eM.triad.e2.y);
        const e3 = new THREE.Vector3(eM.triad.e3.x, eM.triad.e3.z, eM.triad.e3.y);
        const Aray = new THREE.Vector3(eM.intermediateAlpha.e1_alpha.x, eM.intermediateAlpha.e1_alpha.z, eM.intermediateAlpha.e1_alpha.y);
        const X_ref = new THREE.Vector3(R, 0, 0);

        this.markerO.position.copy(O);
        this.handleA.position.copy(Aray);
        this.handleP.position.copy(e1);
        this.handleA.visible = true;
        this.handleP.visible = true;

        // Spatial difference vector D(α-β) under the Euler rotation frame
        const cosDiff = Math.cos(state.angleAlpha - state.angleBeta);
        const sinDiff = Math.sin(state.angleAlpha - state.angleBeta);
        const cosGamma = Math.cos(state.angleGamma || 0);
        const sinGamma = Math.sin(state.angleGamma || 0);
        const D_spatial = new THREE.Vector3(R * cosDiff, R * sinDiff * sinGamma, R * sinDiff * cosGamma);

        if (state.showDifferenceRay !== false) {
          this.handleC.position.copy(D_spatial);
          this.handleC.visible = true;
          addVectorArrow(O, D_spatial, PALETTE.rose);
          // Spatial chord PD rigidly invariant at |PD| = 2R sin β under SO(3)
          addSeg(e1, D_spatial, PALETTE.rose, true);
        } else {
          this.handleC.visible = false;
        }

        addVectorArrow(O, Aray, PALETTE.sky);
        addVectorArrow(O, e1, PALETTE.emerald);
        addVectorArrow(O, e2, PALETTE.amber);
        addVectorArrow(O, e3, PALETTE.indigo);

        const groundPts = [];
        for (let i = 0; i <= 64; i++) {
          const ang = (i / 64) * Math.PI * 2;
          groundPts.push(new THREE.Vector3(R * Math.cos(ang), 0, R * Math.sin(ang)));
        }
        const groundGeom = new THREE.BufferGeometry().setFromPoints(groundPts);
        const groundMat = new THREE.LineDashedMaterial({ color: PALETTE.slate, dashSize: 0.4, gapSize: 0.25 });
        const groundCircle = new THREE.Line(groundGeom, groundMat);
        groundCircle.computeLineDistances();
        this.dynamicGroup.add(groundCircle);

        this.wedge1.material.color.set(PALETTE.sky);
        this.wedge1.arcLine.material.color.set(PALETTE.sky);
        setAngleWedgeVertices3D(this.wedge1, O, X_ref, Aray, 2.2, 24, THREE, state.angleAlpha > Math.PI);

        this.wedge2.material.color.set(PALETTE.violet);
        this.wedge2.arcLine.material.color.set(PALETTE.violet);
        setAngleWedgeVertices3D(this.wedge2, O, Aray, e1, 3.0, 24, THREE, state.angleBeta > Math.PI);
        this.wedge1.visible = this.wedge2.visible = showAngles;
        this.wedge3.visible = false;
        this.rightAngle1.visible = this.rightAngle2.visible = this.rightAngle3.visible = this.rightAngle4.visible = false;
        this.reflexWedge1.visible = false;

        // 3D Determinant Volume Parallelepiped Shading spanned by orthonormal triad {e1, e2, e3}:
        // Signed volume V = e1 · (e2 × e3) = det(R) = +1
        if (showArea) {
          const v0 = O;
          const v1 = e1;
          const v2 = e2;
          const v3 = new THREE.Vector3().addVectors(e1, e2);
          const v4 = e3;
          const v5 = new THREE.Vector3().addVectors(e1, e3);
          const v6 = new THREE.Vector3().addVectors(e2, e3);
          const v7 = new THREE.Vector3().addVectors(v3, e3);
          const detGeom = new THREE.BufferGeometry().setFromPoints([v0, v1, v2, v3, v4, v5, v6, v7]);
          detGeom.setIndex([
            0, 1, 3,  0, 3, 2, // bottom
            4, 6, 7,  4, 7, 5, // top
            0, 4, 5,  0, 5, 1, // front
            2, 3, 7,  2, 7, 6, // back
            0, 2, 6,  0, 6, 4, // left
            1, 5, 7,  1, 7, 3  // right
          ]);
          detGeom.computeVertexNormals();
          this.dynamicGroup.add(
            new THREE.Mesh(detGeom, new THREE.MeshBasicMaterial({
              color: PALETTE.teal,
              transparent: true,
              opacity: 0.14,
              side: THREE.DoubleSide,
              depthWrite: false,
            }))
          );
          // Dashed edges of the triad determinant parallelepiped
          addSeg(e1, v3, PALETTE.teal, true);
          addSeg(e2, v3, PALETTE.teal, true);
          addSeg(e3, v5, PALETTE.teal, true);
          addSeg(e3, v6, PALETTE.teal, true);
          addSeg(v5, v7, PALETTE.teal, true);
          addSeg(v6, v7, PALETTE.teal, true);
          addSeg(v3, v7, PALETTE.teal, true);
          addSeg(e1, v5, PALETTE.teal, true);
          addSeg(e2, v6, PALETTE.teal, true);
        }

        labels.push(
          { key: 'O', name: 'O', at: { x: 0, y: 0.6, z: 0 }, coords: O, color: 'color-indigo' },
          { key: 'A', name: 'A(α)', at: { x: Aray.x * 1.15, y: Aray.y + 0.4, z: Aray.z * 1.15 }, coords: Aray, color: 'color-sky' },
          { key: 'e1', name: 'e₁: P(α+β)', at: { x: e1.x * 1.15, y: e1.y + 0.4, z: e1.z * 1.15 }, coords: e1, color: 'color-emerald' },
          { key: 'e2', name: 'e₂(γ)', at: { x: e2.x * 1.12, y: e2.y + 0.4, z: e2.z * 1.12 }, coords: e2, color: 'color-amber' },
          { key: 'e3', name: 'e₃: n(Euler)', at: { x: e3.x * 1.12, y: e3.y + 0.6, z: e3.z * 1.12 }, coords: e3, color: 'color-indigo' },
          ...(state.showDifferenceRay !== false
            ? [{ key: 'Pdiff', name: 'D(α−β)', at: { x: D_spatial.x * 1.15, y: D_spatial.y + 0.4, z: D_spatial.z * 1.15 }, coords: D_spatial, color: 'color-rose' }]
            : []),
          { key: 'angAlpha', text: `α = ${fmtAngle(eM.alphaDeg, angUnit)}`, at: { x: Aray.x * 0.5 + 0.8, y: 0.4, z: Aray.z * 0.5 }, color: 'color-sky', isAngle: true, show: showAngles },
          { key: 'angBeta', text: `β = ${fmtAngle(eM.betaDeg, angUnit)}`, at: { x: (Aray.x + e1.x) * 0.4, y: 0.4, z: (Aray.z + e1.z) * 0.4 }, color: 'color-violet', isAngle: true, show: showAngles },
          { key: 'detR', text: `det(R) = ${eM.lieAlgebra.detR.toFixed(4)}`, at: { x: e3.x * 0.5, y: e3.y * 0.5 + 0.5, z: e3.z * 0.5 }, color: 'color-teal', isAngle: true, show: true }
        );
      } else {
        // angle-sum-identities: crisp 3D ArrowHelper vectors (no visible spheres on vector apexes)
        const m = computeAngleSumIdentities(state.angleAlpha, state.angleBeta, R);
        const O = new THREE.Vector3(0, 0, 0);
        const X_ref = new THREE.Vector3(R, 0, 0);
        const Aray = new THREE.Vector3(m.points2D.A_ray.x, 0, m.points2D.A_ray.y);
        const P = new THREE.Vector3(m.points2D.P.x, 0, m.points2D.P.y);
        const Pdiff = new THREE.Vector3(m.points2D.P_diff.x, 0, m.points2D.P_diff.y);
        const Ndiff = new THREE.Vector3(m.points2D.N_diff.x, 0, 0);
        const Q = new THREE.Vector3(m.points2D.Q.x, 0, m.points2D.Q.y);
        const M = new THREE.Vector3(m.points2D.M.x, 0, 0);
        const N = new THREE.Vector3(m.points2D.N.x, 0, 0);
        const S = new THREE.Vector3(m.points2D.S_corner.x, 0, m.points2D.S_corner.y);

        this.markerO.position.copy(O);
        this.handleA.position.copy(Aray);
        this.handleP.position.copy(P);
        this.handleC.position.copy(Pdiff);
        this.handleC.visible = state.showDifferenceRay !== false;

        // Crisp 3D Conical Vector Arrows (no spherical globes on vector apexes)
        addVectorArrow(O, Aray, PALETTE.sky);
        addVectorArrow(O, P, PALETTE.emerald);
        if (state.showDifferenceRay !== false) {
          addVectorArrow(O, Pdiff, PALETTE.rose);
          // Chord PD bisected perpendicularly by ray OA at Q
          addSeg(P, Pdiff, PALETTE.rose, true);
          // Dropped perpendicular from Pdiff to X-axis at Ndiff (sin(α−β) altitude in Rose)
          addSeg(Pdiff, Ndiff, PALETTE.rose, true);
          // Horizontal projection from origin to Ndiff (cos(α−β) in Amber)
          addSeg(O, Ndiff, PALETTE.amber);
          // Right angle at Ndiff
          setRightAngle3DVertices(this.rightAngle4, Ndiff, O, Pdiff, 0.75, THREE);
          this.rightAngle4.visible = showAngles && Math.abs(m.trig.sinDiff) > 0.05 && Math.abs(m.trig.cosDiff) > 0.05;
        }

        if (state.showStackedTriangles !== false) {
          addSeg(O, Q, PALETTE.amber);
          addSeg(Q, P, PALETTE.violet);
          addSeg(O, N, PALETTE.amber); // Horizontal projection from origin to N (cos(α+β))
          // Perforated decomposition perimeter box (Q-M-N-S-P)
          addSeg(Q, M, PALETTE.amber, true);
          addSeg(P, N, PALETTE.emerald, true); // Dropped perpendicular from P to X-axis (sin(α+β))
          addSeg(Q, S, PALETTE.amber, true);
          addSeg(P, S, PALETTE.amber, true);
          addSeg(M, N, PALETTE.amber, true);
          // Right angles: at Q in △OPQ, at M in △OMQ, and at N for dropped perpendicular PN ⊥ X-axis
          setRightAngle3DVertices(this.rightAngle1, Q, O, P, 0.85, THREE);
          setRightAngle3DVertices(this.rightAngle2, M, O, Q, 0.75, THREE);
          setRightAngle3DVertices(this.rightAngle3, N, O, P, 0.75, THREE);
          this.rightAngle1.visible = showAngles;
          this.rightAngle2.visible = showAngles;
          this.rightAngle3.visible = showAngles && Math.abs(m.trig.sinSum) > 0.05 && Math.abs(m.trig.cosSum) > 0.05;
        }

        // 3D Angle Wedges alpha and beta
        this.wedge1.material.color.set(PALETTE.sky);
        this.wedge1.arcLine.material.color.set(PALETTE.sky);
        setAngleWedgeVertices3D(this.wedge1, O, X_ref, Aray, 2.2, 24, THREE, state.angleAlpha > Math.PI);
        this.wedge2.material.color.set(PALETTE.violet);
        this.wedge2.arcLine.material.color.set(PALETTE.violet);
        setAngleWedgeVertices3D(this.wedge2, O, Aray, P, 3.0, 24, THREE, state.angleBeta > Math.PI);
        this.wedge1.visible = this.wedge2.visible = showAngles;

        // Directed conjugate wedge: correctly sweeps 360° - (α+β) whether α+β is acute, obtuse or reflex
        setAngleWedgeVertices3D(this.reflexWedge1, O, X_ref, P, 3.6, 32, THREE, m.sumAngle <= Math.PI);
        this.reflexWedge1.visible = showReflex;

        if (showArea && state.showStackedTriangles !== false) {
          const g1 = new THREE.BufferGeometry().setFromPoints([O, M, Q]);
          g1.setIndex([0, 1, 2]);
          const g1Colors = [
            0.008, 0.518, 0.780, // Sky at O
            0.984, 0.749, 0.141, // Amber at M (cos α cos β)
            0.659, 0.333, 0.969, // Violet at Q (cos β)
          ];
          g1.setAttribute('color', new THREE.Float32BufferAttribute(g1Colors, 3));

          const g2 = new THREE.BufferGeometry().setFromPoints([O, Q, P]);
          g2.setIndex([0, 1, 2]);
          const g2Colors = [
            0.008, 0.518, 0.780, // Sky at O
            0.659, 0.333, 0.969, // Violet at Q
            0.063, 0.725, 0.506, // Emerald at P (sin(α+β))
          ];
          g2.setAttribute('color', new THREE.Float32BufferAttribute(g2Colors, 3));

          const g3 = new THREE.BufferGeometry().setFromPoints([P, S, Q]);
          g3.setIndex([0, 1, 2]);
          const g3Colors = [
            0.063, 0.725, 0.506, // Emerald at P
            0.984, 0.749, 0.141, // Amber at S
            0.659, 0.333, 0.969, // Violet at Q
          ];
          g3.setAttribute('color', new THREE.Float32BufferAttribute(g3Colors, 3));

          this.dynamicGroup.add(
            new THREE.Mesh(g1, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, side: THREE.DoubleSide })),
            new THREE.Mesh(g2, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, side: THREE.DoubleSide })),
            new THREE.Mesh(g3, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.20, side: THREE.DoubleSide }))
          );
        }

        if (showArea && state.showDifferenceRay !== false) {
          const gDiff = new THREE.BufferGeometry().setFromPoints([O, Q, Pdiff]);
          gDiff.setIndex([0, 1, 2]);
          const gDiffColors = [
            0.008, 0.518, 0.780, // Sky at O
            0.659, 0.333, 0.969, // Violet at Q
            0.957, 0.247, 0.369, // Rose at Pdiff
          ];
          gDiff.setAttribute('color', new THREE.Float32BufferAttribute(gDiffColors, 3));
          this.dynamicGroup.add(
            new THREE.Mesh(gDiff, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, side: THREE.DoubleSide }))
          );
        }

        // Directed angle midpoints in XZ plane
        const bisAlpha = getPolarLabel3D(m.alpha / 2, 3.2);
        const bisBeta = getPolarLabel3D(m.alpha + m.beta / 2, 4.0);
        const refSumPos = getPolarLabel3D(m.sumAngle / 2 + Math.PI, 4.2);

        labels.push(
          { key: 'O', name: 'O', at: { x: 0, y: 0.6, z: 0 }, coords: O, color: 'color-indigo' },
          { key: 'A', name: 'A(α)', at: { x: Aray.x * 1.15, y: 0.4, z: Aray.z * 1.15 }, coords: Aray, color: 'color-sky' },
          { key: 'P', name: 'P(α+β)', at: { x: P.x * 1.15, y: 0.4, z: P.z * 1.15 }, coords: P, color: 'color-emerald' },
          ...(state.showDifferenceRay !== false ? [
            { key: 'Pdiff', name: 'D(α−β)', at: { x: Pdiff.x * 1.15, y: 0.4, z: Pdiff.z * 1.15 }, coords: Pdiff, color: 'color-rose' },
            { key: 'Ndiff', name: 'N_D', at: { x: Ndiff.x, y: 0.4, z: Ndiff.z }, coords: Ndiff, color: 'color-amber', show: true },
            { key: 'cos-diff-len', text: `cos(α−β) = ${m.trig.cosDiff.toFixed(3)}`, at: { x: Ndiff.x / 2, y: 0.45, z: 0.8 * (Pdiff.z >= 0 ? 1 : -1) }, color: 'color-amber', isAngle: true, show: showLengths && showAngles },
            { key: 'sin-diff-len', text: `sin(α−β) = ${m.trig.sinDiff.toFixed(3)}`, at: { x: Ndiff.x + 1.2 * (Ndiff.x >= 0 ? -1 : 1), y: 0.45, z: Pdiff.z / 2 }, color: 'color-rose', isAngle: true, show: showLengths && showAngles },
            { key: 'chord-pd-len', text: `|PD| = 2 sin β = ${(2 * Math.sin(m.beta)).toFixed(3)}`, at: { x: (P.x + Pdiff.x) * 0.5 + 0.8, y: 0.55, z: (P.z + Pdiff.z) * 0.5 }, color: 'color-violet', isAngle: true, show: showLengths && showAngles }
          ] : []),
          { key: 'Q', name: 'Q', at: { x: Q.x, y: 0.5, z: Q.z }, coords: Q, color: 'color-amber', show: state.showStackedTriangles !== false },
          { key: 'M', name: 'M', at: { x: M.x, y: 0.4, z: M.z }, coords: M, color: 'color-amber', show: state.showStackedTriangles !== false },
          { key: 'N', name: 'N', at: { x: N.x, y: 0.4, z: N.z }, coords: N, color: 'color-amber', show: state.showStackedTriangles !== false },
          { key: 'angAlpha', text: `α = ${fmtAngle(m.alphaDeg, angUnit)}`, at: bisAlpha, color: 'color-sky', isAngle: true, show: showAngles },
          { key: 'angBeta', text: `β = ${fmtAngle(m.betaDeg, angUnit)}`, at: bisBeta, color: 'color-violet', isAngle: true, show: showAngles },
          { key: 'ref-sum', text: `(α+β)* = ${fmtAngle(360 - m.sumAngleDeg, angUnit)}`, at: refSumPos, color: 'color-teal', isAngle: true, show: showReflex },
          { key: 'cos-sum-len', text: `cos(α+β) = ${m.trig.cosSum.toFixed(3)}`, at: { x: N.x / 2, y: 0.45, z: 0.8 * (P.z >= 0 ? -1 : 1) }, color: 'color-amber', isAngle: true, show: state.showStackedTriangles !== false && showAngles },
          { key: 'sin-sum-len', text: `sin(α+β) = ${m.trig.sinSum.toFixed(3)}`, at: { x: N.x + 1.2 * (N.x >= 0 ? -1 : 1), y: 0.45, z: P.z / 2 }, color: 'color-emerald', isAngle: true, show: state.showStackedTriangles !== false && showAngles }
        );
      }
    }

    this.currentLabels = labels;
    this.overlay.render(this.currentLabels, vis3d);
  }

  setCameraPreset(preset) {
    if (this.controls?.angularVelocity) this.controls.angularVelocity.angle = 0;
    const d = 44;
    let targetPos;
    const targetUp = new this.THREE.Vector3(0, 1, 0);
    if (preset === 'top') {
      targetPos = new this.THREE.Vector3(0, d, 0.001);
    } else if (preset === 'front') {
      targetPos = new this.THREE.Vector3(0, 0, d);
    } else if (preset === 'side') {
      targetPos = new this.THREE.Vector3(d, 0, 0);
    } else {
      // iso / perspective with comfortable headroom below mode bar
      targetPos = new this.THREE.Vector3(29, 21, 29);
    }

    if (typeof requestAnimationFrame === 'function' && typeof performance !== 'undefined') {
      if (this.camAnim) cancelAnimationFrame(this.camAnim);
      const startPos = this.camera.position.clone();
      const startUp = this.camera.up.clone();
      const startTime = performance.now();
      const duration = 380;

      const step = (now) => {
        const progress = Math.min(1, (now - startTime) / duration);
        const t = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        this.camera.position.lerpVectors(startPos, targetPos, t);
        this.camera.up.lerpVectors(startUp, targetUp, t).normalize();
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        if (this.currentLabels && this.currentLabels.length) {
          this.overlay.render(this.currentLabels, this.latestVis3d);
        }
        this.renderer.render(this.scene, this.camera);
        if (progress < 1) {
          this.camAnim = requestAnimationFrame(step);
        } else {
          this.camAnim = null;
        }
      };
      this.camAnim = requestAnimationFrame(step);
    } else {
      this.camera.position.copy(targetPos);
      this.camera.up.copy(targetUp);
      this.camera.lookAt(0, 0, 0);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
      if (this.currentLabels && this.currentLabels.length) {
        this.overlay.render(this.currentLabels, this.latestVis3d);
      }
      this.renderer.render(this.scene, this.camera);
    }
  }
}

/* ============================================================================
   4. COLLAPSIBLE TOKENIZED LIVE MATH DERIVATIONS (Uses Circle Theorems cardTemplate)
   ============================================================================ */

export class TrigDerivationsView {
  constructor(container, visualId) {
    this.container = container;
    this.visualId = visualId;
    this.initialized = false;
    this.currentMode = null;
  }

  #initDOM(dimensionMode = 'planar') {
    if (!this.container) return;
    this.currentMode = dimensionMode;

    if (this.visualId === 'unit-circle-helix') {
      this.container.innerHTML = `
        ${cardTemplate(
          'uch-step-1',
          'Step 1',
          `Quotient Group Angle & Bijection (${tag('amber', 'θ')} ↦ ${tag('violet', 'P(cos θ, sin θ)')})`,
          `Modular quotient ${tag('amber', 'θ ∈ ℝ / 2πℤ')} maps bijectively onto the unit circle:<br>` +
          `${tag('violet', 'P')} = (${tag('amber', 'r cos θ')}, ${tag('emerald', 'r sin θ')}) with radius ${tag('indigo', 'r')}`
        )}
        ${cardTemplate(
          'uch-step-2',
          'Step 2',
          `Primary Pythagorean Invariant (${tag('amber', 'cos²θ')} + ${tag('emerald', 'sin²θ')} = ${tag('teal', '1')})`,
          `In right triangle ${tag('teal', '△OCₓP')} with right angle at ${tag('amber', 'Cₓ')}:<br>` +
          `${tag('amber', 'cos²θ')} + ${tag('emerald', 'sin²θ')} = (${tag('amber', 'x/r')})² + (${tag('emerald', 'y/r')})² = ${tag('teal', '1.000000')}`,
          true
        )}
        ${cardTemplate(
          'uch-step-3',
          'Step 3',
          `Exterior Tangent & Secant Duality (${tag('indigo', '1')} + ${tag('rose', 'tan²θ')} = ${tag('sky', 'sec²θ')})`,
          `At contact point ${tag('violet', 'P')}, exterior tangent ${tag('rose', 'tan θ = sin θ / cos θ')} and secant ${tag('sky', 'sec θ = 1 / cos θ')} satisfy:<br>` +
          `${tag('indigo', '1')} + ${tag('rose', 'tan²θ')} = ${tag('sky', 'sec²θ')} &nbsp;|&nbsp; ${tag('indigo', '1')} + ${tag('orange', 'cot²θ')} = ${tag('fuchsia', 'csc²θ')}`,
          true
        )}
        ${cardTemplate(
          'uch-step-4',
          'Step 4',
          `3D Cylindrical Helix & Perigon Identity (${tag('teal', '360°')})`,
          `Lifting ${tag('violet', 'P')} along pitch axis ${tag('lime', 'Y')} forms helix ${tag('violet', 'r(θ) = (R cos θ, y(θ), R sin θ)')}.<br>` +
          `Conjugate reflex angle ${tag('teal', 'θ* = 360° − θ')} completes the ${tag('teal', '360°')} perigon.`,
          true
        )}
      `;
    } else if (this.visualId === 'law-of-sines') {
      if (dimensionMode === 'spatial') {
        this.container.innerHTML = `
          ${cardTemplate(
            'los-step-1',
            'Step 1',
            `Spherical Geodesics on S² (${tag('red', 'a')}, ${tag('green', 'b')}, ${tag('violet', 'c')})`,
            `On sphere S² of radius ${tag('indigo', 'R')}, triangle edges are great-circle geodesic arcs subtending central angles ${tag('indigo', 'θa, θb, θc')} at origin ${tag('indigo', 'O')}:<br>` +
            `${tag('red', 'a = R θa')}, ${tag('green', 'b = R θb')}, ${tag('violet', 'c = R θc')}`
          )}
          ${cardTemplate(
            'los-step-2',
            'Step 2',
            `Spherical Law of Sines (${tag('red', 'sin(a/R) / sin A')} = ${tag('amber', 'const')})`,
            `Unit normal trihedral vectors satisfy the fundamental spherical sine invariant:<br>` +
            `${tag('red', 'sin(a/R) / sin A')} = ${tag('green', 'sin(b/R) / sin B')} = ${tag('violet', 'sin(c/R) / sin C')} = ${tag('amber', 'const')}`,
            true
          )}
          ${cardTemplate(
            'los-step-3',
            'Step 3',
            `Girard's Spherical Excess Theorem (${tag('amber', 'E = A + B + C − 180° > 0')})`,
            `On curved sphere S², the interior angle sum strictly exceeds 180°.<br>` +
            `Spherical excess ${tag('amber', 'E = A + B + C − π')} directly determines surface area: ${tag('sky', 'Area = R² E')}`,
            true
          )}
          ${cardTemplate(
            'los-step-4',
            'Step 4',
            `Euclidean Taylor Correspondence (${tag('teal', 'lim R→∞ R sin(a/R) = a')})`,
            `By 1st-order Taylor expansion ${tag('teal', 'sin(x) = x − x³/6 + ...')}:<br>` +
            `As ${tag('indigo', 'R → ∞')} or latitudes collapse to equator, ${tag('red', 'R sin(a/R) / sin A ⟶ a / sin A = 2R')}.`,
            true
          )}
        `;
      } else {
        this.container.innerHTML = `
          ${cardTemplate(
            'los-step-1',
            'Step 1',
            `Idempotent Altitude Bridge (${tag('teal', 'hc')} = ${tag('green', 'b')} sin ${tag('red', 'A')} = ${tag('red', 'a')} sin ${tag('green', 'B')})`,
            `Projecting vertex ${tag('violet', 'C')} orthogonally onto ${tag('violet', 'AB')} at foot ${tag('teal', 'Hc')} gives:<br>` +
            `${tag('teal', 'hc')} = ${tag('green', 'b')} sin ${tag('red', 'A')} = ${tag('red', 'a')} sin ${tag('green', 'B')} ⟹ ${tag('red', 'a / sin A')} = ${tag('green', 'b / sin B')}`
          )}
          ${cardTemplate(
            'los-step-2',
            'Step 2',
            `Thales Antipodal Diameter Bridge (${tag('red', 'a / sin A')} = ${tag('amber', '2R')})`,
            `Drawing circumdiameter ${tag('amber', "A'B = 2R")} through center ${tag('indigo', 'O')} subtends ${tag('teal', "∠A'CB = 90°")}:<br>` +
            `In right ${tag('amber', "△A'CB")}, sin ${tag('red', 'A')} = ${tag('red', 'a')} / ${tag('amber', '2R')} ⟹ ${tag('red', 'a / sin A')} = ${tag('amber', '2R')}`,
            true
          )}
          ${cardTemplate(
            'los-step-3',
            'Step 3',
            `Three-Way Circumcircle Invariant (${tag('red', 'a/sin A')} = ${tag('green', 'b/sin B')} = ${tag('violet', 'c/sin C')} = ${tag('amber', '2R')})`,
            `By symmetry across all three chords of the circumcircle:<br>` +
            `${tag('red', 'a / sin A')} = ${tag('green', 'b / sin B')} = ${tag('violet', 'c / sin C')} = ${tag('amber', '2R')}`,
            true
          )}
          ${cardTemplate(
            'los-step-4',
            'Step 4',
            `Interior Sum (${tag('emerald', '180°')}) & Conjugate Reflex Perigon (${tag('teal', '360°')})`,
            `Interior angles sum to ${tag('emerald', '∠A + ∠B + ∠C = 180°')}; each vertex forms a ${tag('teal', '360°')} perigon with its reflex conjugate.`,
            true
          )}
        `;
      }
    } else if (this.visualId === 'law-of-cosines') {
      if (dimensionMode === 'spatial') {
        this.container.innerHTML = `
          ${cardTemplate(
            'loc-step-1',
            'Step 1',
            `Spherical Great-Circle Geodesics (${tag('indigo', 'a/R, b/R, c/R')})`,
            `On 2-sphere S² of radius ${tag('indigo', 'R')}, sides are geodesic great-circle arcs subtending central angles:<br>` +
            `${tag('sky', 'θa = a/R')}, ${tag('emerald', 'θb = b/R')}, ${tag('rose', 'θc = c/R')} at center ${tag('indigo', 'O')}`
          )}
          ${cardTemplate(
            'loc-step-2',
            'Step 2',
            `Spherical Law of Cosines (${tag('rose', 'cos(c/R)')} = ${tag('sky', 'cos(a/R)')}${tag('emerald', 'cos(b/R)')} + ${tag('amber', 'sin(a/R)sin(b/R)cos C')})`,
            `From dot product of unit radial vectors ${tag('sky', 'uA')} and ${tag('emerald', 'uB')} with apex ${tag('rose', 'C')} at North Pole:<br>` +
            `${tag('rose', 'cos(c/R)')} = ${tag('sky', 'cos(a/R)')}${tag('emerald', 'cos(b/R)')} + ${tag('sky', 'sin(a/R)')}${tag('emerald', 'sin(b/R)')}${tag('amber', 'cos C')}`,
            true
          )}
          ${cardTemplate(
            'loc-step-3',
            'Step 3',
            `Curvature Contraction & Euclidean Taylor Limit (${tag('teal', 'R → ∞')})`,
            `Expanding Taylor series ${tag('teal', 'cos(x) ≈ 1 − x²/2')}, ${tag('teal', 'sin(x) ≈ x')}:<br>` +
            `1 − c²/(2R²) ≈ (1 − a²/(2R²))(1 − b²/(2R²)) + (ab/R²) cos C ⟹ ${tag('rose', 'c² = a² + b² − 2ab cos C')}`,
            true
          )}
          ${cardTemplate(
            'loc-step-4',
            'Step 4',
            `Girard Excess & Spherical Area (${tag('amber', 'E = A + B + C − π > 0')})`,
            `Curvature induces angle excess ${tag('amber', 'E = A_sph + B_sph + C − 180°')}; surface area of spherical triangle equals ${tag('sky', 'Area = R² E')}.`,
            true
          )}
        `;
      } else {
        this.container.innerHTML = `
          ${cardTemplate(
            'loc-step-1',
            'Step 1',
            `Idempotent Orthogonal Decomposition (${tag('amber', 'P∥ + P⊥ = I')}) & Cosine Ratio (${tag('amber', 'cos C = (a²+b²−c²)/(2ab)')})`,
            `Projecting ${tag('sky', 'B')} onto ${tag('emerald', 'CA')} decomposes side ${tag('sky', 'a')} at foot ${tag('amber', 'D')}:<br>` +
            `Parallel leg ${tag('amber', 'CD = a cos C')}, perpendicular altitude ${tag('amber', 'h = BD = a sin C')}, ratio ${tag('amber', 'cos C = (a² + b² − c²)/(2ab)')}`
          )}
          ${cardTemplate(
            'loc-step-2',
            'Step 2',
            `Right-Triangle Expansion in ${tag('teal', '△ADB')} (${tag('rose', 'c²')} = ${tag('sky', 'a²')} + ${tag('emerald', 'b²')} − ${tag('amber', '2')}·${tag('sky', 'a')}·${tag('emerald', 'b')}·${tag('rose', 'cos C')})`,
            `Applying Pythagoras to ${tag('teal', '△ADB')}:<br>` +
            `${tag('rose', 'c²')} = (${tag('amber', 'a sin C')})² + (${tag('emerald', 'b')} − ${tag('amber', 'a cos C')})² = ${tag('sky', 'a²')} + ${tag('emerald', 'b²')} − ${tag('amber', '2')}·${tag('sky', 'a')}·${tag('emerald', 'b')}·${tag('rose', 'cos C')}`,
            true
          )}
          ${cardTemplate(
            'loc-step-3',
            'Step 3',
            `4-Corner Mixed Partial Quotient (${tag('teal', '∂²(c²)/(∂a∂b)')} = ${tag('amber', '−2 cos C')})`,
            `Evaluating the 4-corner rectangle quotient ${tag('teal', '[f(a,b) − f(a,0) − f(0,b) + f(0,0)] / (ab)')}:<br>` +
            `Isolates the exact bilinear interaction coefficient ${tag('amber', '−2 cos C')}`,
            true
          )}
          ${cardTemplate(
            'loc-step-4',
            'Step 4',
            `Regime Classification & Reflex Conjugate (${tag('teal', '∠C* = 360° − ∠C')})`,
            `Sign of ${tag('amber', 'cos C')} classifies ${tag('teal', 'ACUTE (>0)')}, ${tag('teal', 'RIGHT (=0)')}, or ${tag('rose', 'OBTUSE (<0)')}.`,
            true
          )}
        `;
      }
    } else {
      if (dimensionMode === 'spatial') {
        this.container.innerHTML = `
          ${cardTemplate(
            'asi-step-1',
            'Step 1',
            `SO(3) Lie Group Euler Composition (${tag('emerald', 'R = Rz(α+β) Rx(γ)')})`,
            `Composing planar rotation ${tag('sky', 'Rz(α+β)')} with spatial Euler tilt ${tag('amber', 'Rx(γ)')}:<br>` +
            `${tag('emerald', 'R(α, β, γ)')} = ${tag('sky', 'Rz(α+β)')} · ${tag('amber', 'Rx(γ)')} ∈ SO(3)`
          )}
          ${cardTemplate(
            'asi-step-2',
            'Step 2',
            `Orthonormal Frame Triad & Metric Invariance (${tag('teal', 'det(R) = +1, RᵀR = I')})`,
            `The column vectors form a strictly orthonormal right-handed triad frame {e₁, e₂, e₃}:<br>` +
            `${tag('teal', 'det(R) = +1.000000')}, preserving all spatial inner products and lengths on S²`,
            true
          )}
          ${cardTemplate(
            'asi-step-3',
            'Step 3',
            `Planar SO(2) Principal Subgroup Embedding (${tag('amber', 'γ = 0 ⟹ SO(2)')})`,
            `When Euler tilt ${tag('amber', 'γ = 0')}, rotation R preserves the equatorial plane Y = 0:<br>` +
            `Recovers the standard planar 2D addition matrix ${tag('emerald', 'R(α+β) = R(α)R(β)')}`,
            true
          )}
          ${cardTemplate(
            'asi-step-4',
            'Step 4',
            `Lie Algebra Trace & Rotation Angle (${tag('violet', 'Tr(R) = 1 + 2 cos θ_rot')})`,
            `Invariant trace of SO(3) matrix isolates overall rotation angle ${tag('violet', 'θ_rot')}:<br>` +
            `${tag('violet', 'Tr(R) = R₀₀ + R₁₁ + R₂₂ = 1 + 2 cos θ_rot')}`,
            true
          )}
          ${cardTemplate(
            'asi-step-5',
            'Step 5',
            `Parallelepiped Volume & Scalar Triple Product (${tag('teal', 'Volume = det(R) = +1.000000')})`,
            `Oriented volume spanned by orthonormal triad frame {e₁, e₂, e₃}:<br>` +
            `${tag('teal', 'Volume')} = ${tag('teal', 'det(R)')} = ${tag('emerald', 'e₁')} · (${tag('amber', 'e₂')} × ${tag('indigo', 'e₃')}) ≡ ${tag('teal', '+1.000000')}`,
            true
          )}
        `;
      } else {
        this.container.innerHTML = `
          ${cardTemplate(
            'asi-step-1',
            'Step 1',
            `SO(2) Rotation Matrix Homomorphism (${tag('emerald', 'R(α)R(β) = R(α+β)')})`,
            `Composing planar rotations ${tag('sky', 'R(α)')} and ${tag('violet', 'R(β)')} on the unit circle:<br>` +
            `${tag('emerald', 'R(α + β)')} = ${tag('sky', 'R(α)')} · ${tag('violet', 'R(β)')}`,
            true
          )}
          ${cardTemplate(
            'asi-step-2',
            'Step 2',
            `Cosine Addition Identity (${tag('amber', 'cos(α + β)')})`,
            `From stacked right triangles ${tag('sky', '△OMQ')}, ${tag('violet', '△OQP')}, and upper triangle ${tag('amber', '△PSQ')}:<br>` +
            `${tag('amber', 'cos(α + β)')} = ${tag('amber', 'OM')} − ${tag('amber', 'QS')} = (${tag('sky', 'cos α')} · ${tag('violet', 'cos β')}) − (${tag('sky', 'sin α')} · ${tag('violet', 'sin β')})`,
            true
          )}
          ${cardTemplate(
            'asi-step-3',
            'Step 3',
            `Sine Addition Identity (${tag('emerald', 'sin(α + β)')})`,
            `Vertical projection of ${tag('emerald', 'P(α + β)')} decomposes across ${tag('sky', '△OMQ')} and ${tag('amber', '△PSQ')}:<br>` +
            `${tag('emerald', 'sin(α + β)')} = ${tag('amber', 'MN')} + ${tag('amber', 'PS')} = (${tag('sky', 'sin α')} · ${tag('violet', 'cos β')}) + (${tag('sky', 'cos α')} · ${tag('violet', 'sin β')})`,
            true
          )}
          ${cardTemplate(
            'asi-step-4',
            'Step 4',
            `Inverse Rotation & Difference Identities (${tag('rose', 'α − β')})`,
            `Difference ray ${tag('rose', 'D(α − β)')} reflects across ray ${tag('sky', 'OA')} forming congruent triangle ${tag('rose', '△OQD')}:<br>` +
            `${tag('amber', 'cos(α − β)')} = (${tag('sky', 'cos α')} · ${tag('violet', 'cos β')}) + (${tag('sky', 'sin α')} · ${tag('violet', 'sin β')}) &nbsp;|&nbsp; ${tag('rose', 'sin(α − β)')} = (${tag('sky', 'sin α')} · ${tag('violet', 'cos β')}) − (${tag('sky', 'cos α')} · ${tag('violet', 'sin β')})`,
            true
          )}
          ${cardTemplate(
            'asi-step-5',
            'Step 5',
            `2×2 Algebraic Determinant & Area Preserving Invariant (${tag('teal', 'det(R) = +1.000000')})`,
            `Evaluating the 2×2 algebraic determinant of composite rotation matrix ${tag('emerald', 'R(α + β)')}:<br>` +
            `${tag('teal', 'det(R)')} = ${tag('amber', 'R₀₀ R₁₁')} − ${tag('rose', 'R₀₁ R₁₀')} = ${tag('amber', 'cos²(α + β)')} + ${tag('emerald', 'sin²(α + β)')} ≡ ${tag('teal', '+1.000000')}`,
            true
          )}
        `;
      }
    }

    this.initialized = true;
  }

  render(state) {
    if (!this.container) return;
    const isModeChanged = this.currentMode !== (state.dimensionMode || 'planar');
    if (!this.initialized || !this.container.firstElementChild || isModeChanged) {
      this.#initDOM(state.dimensionMode || 'planar');
      this.initialized = true;
    }

    const angUnit = state.angleUnit || 'deg';
    const lenUnit = state.lengthUnit || 'px';
    const r = state.radius || 175;
    const setSlot = (sel, html) => {
      const el = this.container.querySelector(sel);
      if (el) el.innerHTML = html;
    };

    if (this.visualId === 'unit-circle-helix') {
      const m = computeUnitCircleHelix(state.angleTheta, 1.0, state.helixPitch);
      setSlot(
        '#uch-step-1 [data-sub]',
        `↳ ${tag('amber', `θ = ${fmtAngle(m.thetaDeg, angUnit)}`)} in ${tag('teal', `Quadrant Q${m.quadrant}`)}, Radius ${tag('indigo', `r = ${fmtLength(r, lenUnit, r)}`)}<br>` +
          `↳ ${tag('violet', 'P')} = (${tag('amber', m.cos.toFixed(4))}, ${tag('emerald', m.sin.toFixed(4))})`
      );
      setSlot(
        '#uch-step-2 [data-sub]',
        `↳ ${tag('amber', `cos²θ = ${(m.cos * m.cos).toFixed(4)}`)} + ${tag('emerald', `sin²θ = ${(m.sin * m.sin).toFixed(4)}`)} = ${tag('teal', m.invariants.pythagoreanPrimary.toFixed(6))}`
      );
      setSlot(
        '#uch-step-2 [data-eval]',
        `<span>${tag('teal', `cos²θ + sin²θ = ${m.invariants.pythagoreanPrimary.toFixed(6)}`)}</span><span class="derivation-check">✓ Unit Invariant</span>`
      );
      setSlot(
        '#uch-step-3 [data-sub]',
        `↳ ${tag('rose', `tan θ = ${m.tan.toFixed(3)}`)}, ${tag('violet', `sec θ = ${m.sec.toFixed(3)}`)} | ${tag('orange', `cot θ = ${m.cot.toFixed(3)}`)}, ${tag('fuchsia', `csc θ = ${m.csc.toFixed(3)}`)}`
      );
      setSlot(
        '#uch-step-3 [data-eval]',
        `<span>${tag('indigo', '1')} + ${tag('rose', 'tan²θ')} = ${tag('sky', 'sec²θ')} (Residual: ${tag('teal', Math.abs(m.invariants.pythagoreanTanSec).toExponential(1))})</span><span class="derivation-check">✓ Verified</span>`
      );
      setSlot(
        '#uch-step-4 [data-sub]',
        `↳ Helix height ${tag('violet', `y(θ) = ${m.points3D.point3D.z.toFixed(3)}`)} | Reflex ${tag('teal', `θ* = ${fmtAngle(360 - m.thetaDeg, angUnit)}`)}`
      );
      setSlot(
        '#uch-step-4 [data-eval]',
        `<span>${tag('teal', `Perigon: θ + θ* = ${fmtAngle(360, angUnit)}`)}</span><span class="derivation-check">✓ Perigon Invariant</span>`
      );
    } else if (this.visualId === 'law-of-sines') {
      if (state.dimensionMode === 'spatial') {
        const sM = computeSphericalLawOfSines(state, getModelRadius(state));
        setSlot(
          '#los-step-1 [data-sub]',
          `↳ Central arcs: ${tag('red', `θa = ${toDegrees(sM.centralAngles.thetaA).toFixed(1)}°`)}, ${tag('green', `θb = ${toDegrees(sM.centralAngles.thetaB).toFixed(1)}°`)}, ${tag('violet', `θc = ${toDegrees(sM.centralAngles.thetaC).toFixed(1)}°`)}<br>` +
            `↳ Geodesic lengths: ${tag('red', `a = ${sM.geodesicArcs.a.toFixed(2)}`)}, ${tag('green', `b = ${sM.geodesicArcs.b.toFixed(2)}`)}, ${tag('violet', `c = ${sM.geodesicArcs.c.toFixed(2)}`)}`
        );
        setSlot(
          '#los-step-2 [data-sub]',
          `↳ Scaled Ratios: ${tag('red', `R sin(a/R)/sin A = ${sM.ratios.ratioSphA.toFixed(3)}`)} | ${tag('green', `B = ${sM.ratios.ratioSphB.toFixed(3)}`)} | ${tag('violet', `C = ${sM.ratios.ratioSphC.toFixed(3)}`)}`
        );
        setSlot(
          '#los-step-2 [data-eval]',
          `<span>${tag('amber', `sin(a/R)/sin A = sin(b/R)/sin B = sin(c/R)/sin C = const`)}</span><span class="derivation-check">✓ Spherical Sine Invariant</span>`
        );
        setSlot(
          '#los-step-3 [data-sub]',
          `↳ ${tag('red', `A = ${sM.sphericalAngles.degA.toFixed(1)}°`)} + ${tag('green', `B = ${sM.sphericalAngles.degB.toFixed(1)}°`)} + ${tag('violet', `C = ${sM.sphericalAngles.degC.toFixed(1)}°`)} = ${tag('amber', `${sM.sphericalAngles.sumDeg.toFixed(1)}° > 180°`)}`
        );
        setSlot(
          '#los-step-3 [data-eval]',
          `<span>${tag('amber', `Excess E = ${sM.sphericalExcess.excessDeg.toFixed(2)}°`)} ⟹ ${tag('sky', `Area = R²E = ${sM.sphericalExcess.sphericalArea.toFixed(2)}`)}</span><span class="derivation-check">✓ Girard Theorem</span>`
        );
        setSlot(
          '#los-step-4 [data-sub]',
          `↳ Chords: a=${sM.chords3D.a.toFixed(2)}, b=${sM.chords3D.b.toFixed(2)}, c=${sM.chords3D.c.toFixed(2)} | Pyramid Vol = ${sM.pyramidVolume.toFixed(3)}`
        );
        setSlot(
          '#los-step-4 [data-eval]',
          `<span>${tag('teal', `Taylor limit: R sin(a/R) ⟶ a (Residual < 0.05)`)}</span><span class="derivation-check">✓ Asymptotic Limit</span>`
        );
      } else {
        const m = computeLawOfSines(state.angleA, state.angleB, state.angleC, getModelRadius(state));
        setSlot(
          '#los-step-1 [data-sub]',
          `↳ Altitude ${tag('teal', `hc = ${m.altitudeHc.toFixed(3)}`)} | ${tag('red', `a = ${m.sides.a.toFixed(2)}`)}, ${tag('green', `b = ${m.sides.b.toFixed(2)}`)}, ${tag('violet', `c = ${m.sides.c.toFixed(2)}`)}`
        );
        setSlot(
          '#los-step-2 [data-sub]',
          `↳ ${tag('red', `a / sin A`)} = ${m.sides.a.toFixed(2)} / sin(${fmtAngle(m.interiorAngles.degA, angUnit)}) = ${tag('amber', m.ratios.ratioA.toFixed(3))}`
        );
        setSlot(
          '#los-step-2 [data-eval]',
          `<span>${tag('red', `a / sin A = ${m.ratios.ratioA.toFixed(3)}`)} ≝ ${tag('amber', `2R = ${m.diameter2R.toFixed(3)}`)}</span><span class="derivation-check">✓ Thales Bridge</span>`
        );
        setSlot(
          '#los-step-3 [data-sub]',
          `↳ ${tag('red', `a/sin A = ${m.ratios.ratioA.toFixed(3)}`)} | ${tag('green', `b/sin B = ${m.ratios.ratioB.toFixed(3)}`)} | ${tag('violet', `c/sin C = ${m.ratios.ratioC.toFixed(3)}`)}`
        );
        setSlot(
          '#los-step-3 [data-eval]',
          `<span>${tag('amber', `a/sin A = b/sin B = c/sin C = 2R = ${m.diameter2R.toFixed(3)}`)}</span><span class="derivation-check">✓ 2R Invariant</span>`
        );
        setSlot(
          '#los-step-4 [data-sub]',
          `↳ ${tag('red', fmtAngle(m.interiorAngles.degA, angUnit))} + ${tag('green', fmtAngle(m.interiorAngles.degB, angUnit))} + ${tag('violet', fmtAngle(m.interiorAngles.degC, angUnit))} = ${tag('emerald', fmtAngle(m.interiorAngles.sumDeg, angUnit))}`
        );
        setSlot(
          '#los-step-4 [data-eval]',
          `<span>${tag('emerald', `Interior Sum = ${fmtAngle(m.interiorAngles.sumDeg, angUnit)}`)}</span><span class="derivation-check">✓ Euclidean Sum</span>`
        );
      }
    } else if (this.visualId === 'law-of-cosines') {
      if (state.dimensionMode === 'spatial') {
        const sM = computeSphericalLawOfCosines(state.sideA, state.sideB, state.angleC, getModelRadius(state));
        setSlot(
          '#loc-step-1 [data-sub]',
          `↳ Central arcs: ${tag('sky', `θa = ${(sM.thetaA * 180 / Math.PI).toFixed(1)}°`)}, ${tag('emerald', `θb = ${(sM.thetaB * 180 / Math.PI).toFixed(1)}°`)}, ${tag('rose', `θc = ${(sM.thetaC * 180 / Math.PI).toFixed(1)}°`)}<br>` +
            `↳ Arc lengths: ${tag('sky', `a = ${sM.a.toFixed(2)}`)}, ${tag('emerald', `b = ${sM.b.toFixed(2)}`)}, ${tag('rose', `c = ${sM.c.toFixed(2)}`)}`
        );
        setSlot(
          '#loc-step-2 [data-sub]',
          `↳ ${tag('sky', `cos(a/R) = ${Math.cos(sM.thetaA).toFixed(4)}`)}, ${tag('emerald', `cos(b/R) = ${Math.cos(sM.thetaB).toFixed(4)}`)}, ${tag('amber', `cos C = ${Math.cos(sM.angleC).toFixed(4)}`)}`
        );
        setSlot(
          '#loc-step-2 [data-eval]',
          `<span>${tag('rose', `cos(c/R) = ${sM.cosC_arc.toFixed(4)}`)} ≝ ${tag('teal', `cos(a/R)cos(b/R) + sin(a/R)sin(b/R)cos C`)}</span><span class="derivation-check">✓ Spherical Cosine Law</span>`
        );
        setSlot(
          '#loc-step-3 [data-sub]',
          `↳ Spherical ${tag('rose', `c = ${sM.c.toFixed(3)}`)} vs Flat Taylor ${tag('teal', `c_flat = ${sM.taylorContraction.cFlat.toFixed(3)}`)} | Curvature Diff = ${tag('amber', sM.taylorContraction.curvatureDifference.toFixed(4))}`
        );
        setSlot(
          '#loc-step-3 [data-eval]',
          `<span>${tag('amber', `Curvature residual |c − c_flat| = ${sM.taylorContraction.curvatureDifference.toFixed(4)}`)}</span><span class="derivation-check">✓ Taylor Asymptotic</span>`
        );
        setSlot(
          '#loc-step-4 [data-sub]',
          `↳ Angles: ${tag('sky', `A = ${sM.sphericalAngles.degA.toFixed(1)}°`)}, ${tag('emerald', `B = ${sM.sphericalAngles.degB.toFixed(1)}°`)}, ${tag('rose', `C = ${sM.sphericalAngles.degC.toFixed(1)}°`)} ⟹ Sum = ${(sM.sphericalAngles.degA + sM.sphericalAngles.degB + sM.sphericalAngles.degC).toFixed(1)}°`
        );
        setSlot(
          '#loc-step-4 [data-eval]',
          `<span>${tag('amber', `Excess E = ${sM.sphericalExcess.excessDeg.toFixed(2)}°`)} ⟹ ${tag('sky', `Area = R²E = ${sM.sphericalExcess.sphericalArea.toFixed(2)}`)}</span><span class="derivation-check">✓ Girard Theorem</span>`
        );
      } else {
        const m = computeLawOfCosines(state.sideA, state.sideB, state.angleC);
        setSlot(
          '#loc-step-1 [data-sub]',
          `↳ ${tag('amber', `CD = a cos C = ${m.projection.pProj.toFixed(3)}`)}, ${tag('amber', `h = a sin C = ${m.projection.hAlt.toFixed(3)}`)} | ${tag('amber', `cos C = (a²+b²−c²)/(2ab) = ${m.cosC.toFixed(4)}`)}`
        );
        setSlot(
          '#loc-step-2 [data-sub]',
          `↳ ${tag('sky', `a² = ${m.squares.a2.toFixed(2)}`)}, ${tag('emerald', `b² = ${m.squares.b2.toFixed(2)}`)}, ${tag('amber', '2')}·${tag('sky', `a(${m.a.toFixed(1)})`)}·${tag('emerald', `b(${m.b.toFixed(1)})`)}·${tag('rose', `cos C(${m.cosC.toFixed(3)})`)} = ${tag('amber', m.squares.interaction2abCosC.toFixed(2))}`
        );
        setSlot(
          '#loc-step-2 [data-eval]',
          `<span>${tag('rose', `c² = ${m.squares.c2.toFixed(2)}`)} ≝ ${tag('teal', `${m.squares.pythagoreanSum.toFixed(2)} − ${m.squares.interaction2abCosC.toFixed(2)}`)}</span><span class="derivation-check">✓ Cosine Law</span>`
        );
        setSlot(
          '#loc-step-3 [data-sub]',
          `↳ 4-Corner Quotient = ${tag('amber', m.mixedPartialCoeff.toFixed(4))} | ${tag('amber', `−2 cos(${fmtAngle(m.angleCDeg, angUnit)}) = ${(-2 * m.cosC).toFixed(4)}`)}`
        );
        setSlot(
          '#loc-step-3 [data-eval]',
          `<span>${tag('amber', `∂²(c²)/(∂a∂b) = −2 cos C = ${m.mixedPartialCoeff.toFixed(4)}`)}</span><span class="derivation-check">✓ Exact Bilinear</span>`
        );
        setSlot(
          '#loc-step-4 [data-sub]',
          `↳ At ${tag('rose', `∠C = ${fmtAngle(m.angleCDeg, angUnit)}`)}, Reflex ${tag('teal', `∠C* = ${fmtAngle(360 - m.angleCDeg, angUnit)}`)}`
        );
        setSlot(
          '#loc-step-4 [data-eval]',
          `<span>Regime: ${tag('teal', m.regime.toUpperCase())} | Side ${tag('rose', `c = ${m.c.toFixed(3)}`)}</span><span class="derivation-check">✓ Verified</span>`
        );
      }
    } else {
      if (state.dimensionMode === 'spatial') {
        const eM = computeSpatialAngleSumEuler(state.angleAlpha, state.angleBeta, state.angleGamma, 1.0);
        setSlot(
          '#asi-step-1 [data-sub]',
          `↳ ${tag('sky', `α = ${fmtAngle(eM.alphaDeg, angUnit)}`)}, ${tag('violet', `β = ${fmtAngle(eM.betaDeg, angUnit)}`)}, ${tag('amber', `γ = ${fmtAngle(eM.gammaDeg, angUnit)}`)} ⟹ Sum ${tag('emerald', `α+β = ${fmtAngle(eM.sumDeg, angUnit)}`)}`
        );
        setSlot(
          '#asi-step-2 [data-sub]',
          `↳ Triad: e₁=(${eM.triad.e1.x.toFixed(3)}, ${eM.triad.e1.y.toFixed(3)}, ${eM.triad.e1.z.toFixed(3)}) | det(R) = ${tag('teal', eM.lieAlgebra.detR.toFixed(6))}`
        );
        setSlot(
          '#asi-step-2 [data-eval]',
          `<span>${tag('teal', `det(R) = ${eM.lieAlgebra.detR.toFixed(6)} ≝ +1`)} (SO(3) Invariant)</span><span class="derivation-check">✓ Special Orthogonal</span>`
        );
        setSlot(
          '#asi-step-3 [data-sub]',
          `↳ Subgroup reduction: ${eM.isPlanarReduction ? tag('emerald', 'Strict SO(2) Planar Embedding (γ ≈ 0)') : tag('amber', `Spatial Tilt |γ| = ${Math.abs(eM.gammaDeg).toFixed(1)}°`)}`
        );
        setSlot(
          '#asi-step-3 [data-eval]',
          `<span>${tag('amber', `R₀₀ = ${eM.R_matrix[0][0].toFixed(4)} = cos(α+β)`)} | ${tag('emerald', `R₁₀ = ${eM.R_matrix[1][0].toFixed(4)} = sin(α+β)`)}</span><span class="derivation-check">✓ SO(2) Reduction</span>`
        );
        setSlot(
          '#asi-step-4 [data-sub]',
          `↳ Tr(R) = ${tag('teal', eM.lieAlgebra.trace.toFixed(4))} ⟹ Lie Conjugacy Angle ${tag('violet', `θ_rot = ${eM.lieAlgebra.rotAngleDeg.toFixed(1)}°`)}`
        );
        setSlot(
          '#asi-step-4 [data-eval]',
          `<span>${tag('violet', `Tr(R) = 1 + 2 cos θ_rot`)} (Residual: ${tag('teal', Math.abs(eM.lieAlgebra.trace - (1 + 2 * Math.cos(eM.lieAlgebra.rotAngle))).toExponential(1))})</span><span class="derivation-check">✓ Lie Trace Invariant</span>`
        );
        setSlot(
          '#asi-step-5 [data-sub]',
          `↳ Scalar triple product: e₁ · (e₂ × e₃) = Volume spanned by basis triad = ${tag('teal', eM.lieAlgebra.detR.toFixed(6))}`
        );
        setSlot(
          '#asi-step-5 [data-eval]',
          `<span>${tag('teal', `Volume = det(R) = ${eM.lieAlgebra.detR.toFixed(6)} ≝ +1`)} (Parallelepiped Unit Metric)</span><span class="derivation-check">✓ SO(3) Parallelepiped Invariant</span>`
        );
      } else {
        const m = computeAngleSumIdentities(state.angleAlpha, state.angleBeta, 1.0);
        setSlot(
          '#asi-step-1 [data-sub]',
          `↳ ${tag('sky', `α = ${fmtAngle(m.alphaDeg, angUnit)}`)}, ${tag('violet', `β = ${fmtAngle(m.betaDeg, angUnit)}`)} ⟹ ${tag('emerald', `α + β = ${fmtAngle(m.sumAngleDeg, angUnit)}`)}`
        );
        setSlot(
          '#asi-step-1 [data-eval]',
          `<span>${tag('emerald', `R(α+β) = R(α)·R(β)`)}: [${m.matrices.R_comp[0].toFixed(3)}, ${m.matrices.R_comp[1].toFixed(3)}; ${m.matrices.R_comp[2].toFixed(3)}, ${m.matrices.R_comp[3].toFixed(3)}]</span><span class="derivation-check">✓ SO(2) Homomorphism</span>`
        );
        setSlot(
          '#asi-step-2 [data-sub]',
          `↳ (${tag('sky', `cos α`)})·(${tag('violet', `cos β`)}) [${tag('amber', m.trig.cosACosB.toFixed(4))}] − (${tag('sky', `sin α`)})·(${tag('violet', `sin β`)}) [${tag('rose', m.trig.sinASinB.toFixed(4))}] = ${tag('amber', m.trig.cosSum.toFixed(4))}`
        );
        setSlot(
          '#asi-step-2 [data-eval]',
          `<span>${tag('amber', `cos(α + β) = ${m.trig.cosSum.toFixed(4)}`)}</span><span class="derivation-check">✓ Exact Identity</span>`
        );
        setSlot(
          '#asi-step-3 [data-sub]',
          `↳ (${tag('sky', `sin α`)})·(${tag('violet', `cos β`)}) [${tag('sky', m.trig.sinACosB.toFixed(4))}] + (${tag('sky', `cos α`)})·(${tag('violet', `sin β`)}) [${tag('violet', m.trig.cosASinB.toFixed(4))}] = ${tag('emerald', m.trig.sinSum.toFixed(4))}`
        );
        setSlot(
          '#asi-step-3 [data-eval]',
          `<span>${tag('emerald', `sin(α + β) = ${m.trig.sinSum.toFixed(4)}`)}</span><span class="derivation-check">✓ Exact Identity</span>`
        );
        setSlot(
          '#asi-step-4 [data-sub]',
          `↳ Difference Point ${tag('rose', 'D(α−β)')} (Separation ${tag('rose', `∠POD = 2β = ${fmtAngle(2 * m.betaDeg, angUnit)}`)}, Chord ${tag('violet', `|PD| = 2 sin β = ${(2 * Math.sin(m.beta)).toFixed(4)}`)}): ${tag('amber', `cos(α−β) = ${m.trig.cosDiff.toFixed(4)}`)}, ${tag('rose', `sin(α−β) = ${m.trig.sinDiff.toFixed(4)}`)}`
        );
        setSlot(
          '#asi-step-4 [data-eval]',
          `<span>${tag('amber', `cos(α−β) = ${m.trig.cosDiff.toFixed(4)}`)} | ${tag('rose', `sin(α−β) = ${m.trig.sinDiff.toFixed(4)}`)}</span><span class="derivation-check">✓ Difference Identity</span>`
        );
        const det2D = m.matrices.R_comp[0] * m.matrices.R_comp[3] - m.matrices.R_comp[1] * m.matrices.R_comp[2];
        const r00r11 = (m.matrices.R_comp[0] * m.matrices.R_comp[3]).toFixed(4);
        const r01r10 = (m.matrices.R_comp[1] * m.matrices.R_comp[2]).toFixed(4);
        setSlot(
          '#asi-step-5 [data-sub]',
          `↳ det(R) = (${m.matrices.R_comp[0].toFixed(4)})(${m.matrices.R_comp[3].toFixed(4)}) − (${m.matrices.R_comp[1].toFixed(4)})(${m.matrices.R_comp[2].toFixed(4)}) = ${r00r11} − (${r01r10}) = ${tag('teal', det2D.toFixed(6))}`
        );
        setSlot(
          '#asi-step-5 [data-eval]',
          `<span>${tag('teal', `det(R) = R₀₀R₁₁ − R₀₁R₁₀ = ${det2D.toFixed(6)} ≝ +1`)} (Area Preserving)</span><span class="derivation-check">✓ SO(2) Metric Invariant</span>`
        );
      }
    }
  }
}

/* ============================================================================
   5. UNIFIED BOOTSTRAP CONTROLLER (Matches Circle Theorems main.js 100%)
   ============================================================================ */

export function mountTrigVisual({ visualId }) {
  const store = createStore(createTrigInitialState(visualId));
  const canvas = document.getElementById('main-canvas');
  const container2d = document.getElementById('canvas-2d-container');
  const container3d = document.getElementById('canvas-3d-container');

  const view2d = new TrigCanvas2DView(canvas, container2d, visualId);
  let scene3d;
  try {
    scene3d = new TrigScene3DView(loadThree(), container3d, visualId);
  } catch (err) {
    console.warn('3D view unavailable; continuing with 2D view only.', err);
    scene3d = new NullScene3DView();
  }
  scene3d.enableInteraction(store);

  // Floating Toolbar & Fullscreen
  new DraggableToolbar(document.getElementById('viewport-toolbar'), document.getElementById('toolbar-drag-handle'));
  bindFullscreen(document.getElementById('fullscreen-btn'), document.querySelector('.circle-explorer'));

  // View Mode Controller (Split / 2D / 3D / Flip / Resizer)
  new ViewModeController(store, {
    mainView: document.getElementById('main-view'),
    container2d,
    container3d,
    toolbar2d: document.getElementById('toolbar-2d-panel'),
    toolbar3d: document.getElementById('toolbar-3d-panel'),
    buttons: {
      split: document.getElementById('btn-split'),
      '2d': document.getElementById('btn-2d'),
      '3d': document.getElementById('btn-3d'),
    },
    flipButton: document.getElementById('split-dir-btn'),
    resizer: document.getElementById('viewport-resizer'),
    onResize: () => {
      view2d.resize();
      scene3d.resize();
    },
  });

  // Standard 2D & 3D Toggles, Camera Presets, Affine Conic Mode, AR, Unit Converter
  bindStandardToggles(store, {
    canvas2d: view2d,
    view3d: scene3d,
    exportPrefix: visualId,
    visualId,
  });

  // Panels (compatible with WorkspaceDockManager)
  const controlsPanelEl = document.querySelector(
    '.ui-panel[id$="-panel"]:not(#derivations-panel):not(#toolbar-2d-panel):not(#toolbar-3d-panel)'
  );
  if (controlsPanelEl) {
    new Panel(controlsPanelEl, {
      header: document.getElementById('controls-header'),
      minimizeButton: document.getElementById('toggle-controls-min'),
      expandButton: document.getElementById('toggle-controls-expand'),
    });
  }

  new Panel(document.getElementById('derivations-panel'), {
    header: document.getElementById('deriv-header'),
    minimizeButton: document.getElementById('toggle-deriv-min'),
    expandButton: document.getElementById('toggle-deriv-expand'),
  });

  new TelemetryPanel(document.getElementById('telemetry-panel'), {
    header: document.getElementById('telemetry-header'),
    toggleButton: document.getElementById('telemetry-toggle-btn'),
    body: document.getElementById('telemetry-body'),
  });

  const stats3d = document.getElementById('stats-3d');
  if (stats3d) {
    new TelemetryPanel(stats3d, {
      header: document.getElementById('stats-3d-header'),
      toggleButton: document.getElementById('toggle-stats-3d'),
      body: document.getElementById('stats-3d-body'),
    });
  }

  const derivations = new TrigDerivationsView(document.getElementById('live-derivations-content'), visualId);
  derivations.render(store.get());
  initCollapsibleSections(document);

  // Playback Controller
  const playFieldMap = {
    'unit-circle-helix': 'angleTheta',
    'law-of-sines': 'angleC',
    'law-of-cosines': 'angleC',
    'angle-sum-identities': 'angleBeta',
  };
  const playBtn = document.getElementById('btn-playback');
  new PlaybackController(store, playBtn, { field: playFieldMap[visualId] || 'angleTheta', speed: 0.65 });

  // Harmonic Audio Sonification (Unit Circle Helix)
  let sonifier = null;
  if (visualId === 'unit-circle-helix') {
    sonifier = new HarmonicSonifier();
    if (typeof document !== 'undefined') {
      sonifier.attachControls(document);
    }
  }

  // Bind visual-specific sliders, checkboxes, and full 2D Canvas interaction
  bindVisualSpecificControls(store, visualId, view2d);

  // Subscribe 2D, 3D, Telemetry, Sliders, and Derivations
  const update = (state) => {
    view2d.render(state);
    scene3d.render(state);
    derivations.render(state);
    updateTelemetryAndSlidersDOM(state, visualId);
    if (sonifier) {
      sonifier.update(state);
    }
  };

  store.subscribe(update);
  update(store.get());

  return { store, view2d, scene3d, sonifier };
}

function bindVisualSpecificControls(store, visualId, view2d) {
  const canvas = view2d.canvas;

  const bindRangeDeg = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', (e) => store.set({ [key]: toRadians(parseFloat(e.target.value)) }));
  };
  const bindRangeNum = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', (e) => store.set({ [key]: parseFloat(e.target.value) }));
  };
  const bindCheck = (idOrIds, key) => {
    const list = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    for (const id of list) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', (e) => store.set({ [key]: e.target.checked }));
      }
    }
  };

  bindRangeNum('slider-radius', 'radius');
  bindRangeDeg('slider-theta', 'angleTheta');
  bindRangeNum('slider-pitch', 'helixPitch');
  bindRangeDeg('slider-angle-a', 'angleA');
  bindRangeDeg('slider-angle-b', 'angleB');
  bindRangeDeg('slider-angle-c', 'angleC');
  bindRangeNum('slider-side-a', 'sideA');
  bindRangeNum('slider-side-b', 'sideB');
  bindRangeDeg('slider-alpha', 'angleAlpha');
  bindRangeDeg('slider-beta', 'angleBeta');
  const sliderGamma = document.getElementById('slider-gamma');
  if (sliderGamma) {
    sliderGamma.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      const updates = { angleGamma: toRadians(val) };
      if (Math.abs(val) > 0.1 && store.get().dimensionMode !== 'spatial') {
        updates.dimensionMode = 'spatial';
      }
      store.set(updates);
    });
  }

  bindCheck('toggle-projections', 'showProjections');
  bindCheck(['toggle-tan-sec', 'vis-3d-tan-sec'], 'showTanSec');
  bindCheck(['toggle-cot-csc', 'vis-3d-cot-csc'], 'showCotCsc');
  bindCheck('vis-3d-cylinder', 'showCylinder');
  bindCheck('toggle-helix-walls', 'showHelixWalls');
  bindCheck('toggle-diameter', 'showCircumcircleDiameter');
  bindCheck('toggle-altitude', 'showAltitude');
  bindCheck('toggle-radii', 'showRadii');
  bindCheck('toggle-projection-loc', 'showProjection');
  bindCheck(['toggle-interaction-rect', 'vis-3d-rect'], 'showInteractionRect');
  bindCheck(['toggle-ratio-badge', 'vis-3d-ratio'], 'showRatioBadge');
  bindCheck('toggle-diff-ray', 'showDifferenceRay');
  bindCheck('toggle-stacked-tri', 'showStackedTriangles');

  // Dual Mode Switch: Planar (Y = 0) vs True Spherical 3D on S² (Law of Sines) / Spatial SO(3) (Angle Sum)
  const bindModeSwitch = (id, mode) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', () => {
        if (mode === 'spatial') {
          const st = store.get();
          if (visualId === 'law-of-sines' && st.latA === Math.PI / 2 && st.latB === Math.PI / 2 && st.latC === Math.PI / 2) {
            store.set({
              dimensionMode: 'spatial',
              latA: toRadians(65),
              latB: toRadians(115),
              latC: toRadians(50),
            });
          } else if (visualId === 'angle-sum-identities' && (!st.angleGamma || Math.abs(st.angleGamma) < 1e-4)) {
            store.set({
              dimensionMode: 'spatial',
              angleGamma: toRadians(28),
            });
          } else {
            store.set({ dimensionMode: 'spatial' });
          }
        } else {
          if (visualId === 'angle-sum-identities') {
            store.set({ dimensionMode: 'planar', angleGamma: 0 });
          } else if (visualId === 'law-of-sines') {
            store.set({ dimensionMode: 'planar', latA: Math.PI / 2, latB: Math.PI / 2, latC: Math.PI / 2 });
          } else {
            store.set({ dimensionMode: 'planar' });
          }
        }
      });
    }
  };
  bindModeSwitch('btn-mode-planar', 'planar');
  bindModeSwitch('btn-mode-spatial', 'spatial');
  bindModeSwitch('btn-mode-planar-pill', 'planar');
  bindModeSwitch('btn-mode-spatial-pill', 'spatial');

  // Floating Header Toolbar Dimension Mode Toggle (#btn-toggle-dimension-mode)
  const btnToggleDim = document.getElementById('btn-toggle-dimension-mode');
  if (btnToggleDim) {
    btnToggleDim.addEventListener('click', () => {
      const isSpatial = store.get().dimensionMode === 'spatial';
      if (isSpatial) {
        if (visualId === 'angle-sum-identities') {
          store.set({ dimensionMode: 'planar', angleGamma: 0 });
        } else if (visualId === 'law-of-sines') {
          store.set({ dimensionMode: 'planar', latA: Math.PI / 2, latB: Math.PI / 2, latC: Math.PI / 2 });
        } else {
          store.set({ dimensionMode: 'planar' });
        }
      } else {
        const st = store.get();
        if (visualId === 'law-of-sines' && st.latA === Math.PI / 2 && st.latB === Math.PI / 2 && st.latC === Math.PI / 2) {
          store.set({
            dimensionMode: 'spatial',
            latA: toRadians(65),
            latB: toRadians(115),
            latC: toRadians(50),
          });
        } else if (visualId === 'angle-sum-identities' && (!st.angleGamma || Math.abs(st.angleGamma) < 1e-4)) {
          store.set({
            dimensionMode: 'spatial',
            angleGamma: toRadians(28),
          });
        } else {
          store.set({ dimensionMode: 'spatial' });
        }
      }
    });
  }

  // 2D Canvas Wheel Zoom (synchronized with 3D and radius slider)
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const cur = store.get().radius || 175;
      const factor = e.deltaY > 0 ? 0.95 : 1.05;
      store.set({ radius: clamp(Math.round(cur * factor), 100, 260) });
    },
    { passive: false }
  );

  // Full Circle Theorems 2D Hit-Testing: Vertex Drag, Circumference Radius Drag, Background Pan, Double-Click Reset
  let activeDrag = null;
  let panOrigin = { x: 0, y: 0 };

  const findHoveredHandle = (x, y, handles, radius = 28) => {
    let best = null;
    let bestDist = radius;
    const { cx, cy, r } = view2d.getCenterAndRadius(store.get());
    for (const h of handles) {
      const d = Math.hypot(x - h.x, y - h.y);
      if (d < bestDist) {
        bestDist = d;
        best = h;
      }
      if (r > 0) {
        const ux = (h.x - cx) / r;
        const uy = (h.y - cy) / r;
        const lx = h.x + ux * 20;
        const ly = h.y + uy * 20;
        const dLabel = Math.hypot(x - lx, y - ly);
        if (dLabel < bestDist) {
          bestDist = dLabel;
          best = h;
        }
      }
    }
    return best;
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button && e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const st = store.get();
    const info = view2d.getInteractiveHandles2D(st);
    let hitHandle = findHoveredHandle(x, y, info.handles, 34);
    const circCx = info.circleCx ?? info.cx;
    const circCy = info.circleCy ?? info.cy;
    const circR = info.circleR ?? info.r;

    // Direct radial spoke / angular proximity fallback for law-of-sines
    if (!hitHandle && visualId === 'law-of-sines') {
      const dx = x - circCx;
      const dy = circCy - y;
      const distFromCenter = Math.hypot(dx, dy);
      if (distFromCenter >= 18 && distFromCenter <= circR + 25) {
        const clickAng = pointerToAngle(dx, dy);
        let closestH = null;
        let minDiff = 0.35; // ~20 degrees
        for (const h of info.handles) {
          const hAng = pointerToAngle(h.x - circCx, circCy - h.y);
          let diff = Math.abs(normalizeAngle(clickAng - hAng));
          if (diff > Math.PI) diff = 2 * Math.PI - diff;
          if (diff < minDiff) {
            minDiff = diff;
            closestH = h;
          }
        }
        if (closestH) {
          hitHandle = closestH;
        }
      }
    }

    // Direct radial spoke click/drag fallback for unit-circle-helix
    let spokeHit = false;
    if (!hitHandle && visualId === 'unit-circle-helix') {
      const dx = x - circCx;
      const dy = circCy - y;
      const distFromCenter = Math.hypot(dx, dy);
      if (distFromCenter >= 14 && distFromCenter <= circR + 18) {
        const clickAng = pointerToAngle(dx, dy);
        const curTheta = normalizeAngle(st.angleTheta || 0);
        const diffAng = Math.abs(normalizeAngle(clickAng - curTheta));
        if (diffAng < 0.4 || Math.abs(diffAng - 2 * Math.PI) < 0.4) {
          spokeHit = true;
          activeDrag = { type: 'handle', handle: info.handles[0] };
          view2d.activeDrag = activeDrag;
          canvas.style.cursor = 'grabbing';
          store.set({ angleTheta: clickAng });
        }
      }
    }

    if (hitHandle) {
      activeDrag = { type: 'handle', handle: hitHandle };
      view2d.activeDrag = activeDrag;
      if (hitHandle.id && ['A', 'B', 'C'].includes(hitHandle.id)) {
        view2d.selectedVertexId = hitHandle.id;
      }
      canvas.style.cursor = 'grabbing';
      view2d.render(st);
    } else if (spokeHit) {
      // already set
    } else if (isNearCircumference(x, y, circCx, circCy, circR, 14)) {
      activeDrag = { type: 'radius', cx: circCx, cy: circCy };
      view2d.activeDrag = activeDrag;
      canvas.style.cursor = 'ew-resize';
      view2d.render(st);
    } else {
      const curPan = st.pan || { x: 0, y: 0 };
      panOrigin = { x: e.clientX - curPan.x, y: e.clientY - curPan.y };
      activeDrag = { type: 'pan' };
      view2d.activeDrag = activeDrag;
      canvas.style.cursor = 'grabbing';
    }

    if (st.playing) store.set({ playing: false });
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {}
  });

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const st = store.get();
    const info = view2d.getInteractiveHandles2D(st);
    const circCx = info.circleCx ?? info.cx;
    const circCy = info.circleCy ?? info.cy;
    const circR = info.circleR ?? info.r;

    if (!activeDrag) {
      const hoverH = findHoveredHandle(x, y, info.handles, 32);
      const hoverCirc = !hoverH && isNearCircumference(x, y, circCx, circCy, circR, 14);
      const changed = view2d.hoverHandle !== hoverH || view2d.hoverCircumference !== hoverCirc;
      view2d.hoverHandle = hoverH;
      view2d.hoverCircumference = hoverCirc;
      canvas.style.cursor = hoverH ? 'pointer' : hoverCirc ? 'ew-resize' : 'grab';
      if (changed) {
        view2d.render(st);
      }
      return;
    }

    if (activeDrag.type === 'pan') {
      canvas.style.cursor = 'grabbing';
      store.set({
        pan: {
          x: e.clientX - panOrigin.x,
          y: e.clientY - panOrigin.y,
        },
      });
      return;
    }

    if (activeDrag.type === 'radius') {
      canvas.style.cursor = 'ew-resize';
      const dist = Math.hypot(x - activeDrag.cx, y - activeDrag.cy);
      store.set({ radius: clamp(Math.round(dist), 100, 260) });
      return;
    }

    if (activeDrag.type === 'handle') {
      canvas.style.cursor = 'grabbing';
      const h = activeDrag.handle;
      const ang = pointerToAngle(x - info.cx, info.cy - y);
      if (visualId === 'law-of-sines' && (h.field === 'antipodeA' || h.id === 'antipodeA')) {
        store.set({ angleB: normalizeAngle(ang + Math.PI) });
      } else if (visualId === 'law-of-cosines') {
        if (h.field === 'angleC' || h.id === 'B') {
          const raw = Math.atan2(info.cy - y, x - info.cx);
          const ang = raw < 0 ? raw + TAU : raw;
          const dist = Math.hypot(x - info.cx, info.cy - y);
          const nextA = h.scale ? clamp(dist / h.scale, 2, 12) : st.sideA;
          store.set({
            angleC: ang,
            sideA: Math.round(nextA * 2) / 2,
          });
        } else if (h.field === 'sideB' && h.scale) {
          const nextB = clamp((x - info.cx) / h.scale, 2, 12);
          store.set({ sideB: Math.round(nextB * 2) / 2 });
        }
      } else if (visualId === 'angle-sum-identities' && h.field === 'angleBeta') {
        store.set({ angleBeta: normalizeAngle(ang - (st.angleAlpha || 0)) });
      } else if (visualId === 'angle-sum-identities' && h.field === 'diffBeta') {
        store.set({ angleBeta: normalizeAngle((st.angleAlpha || 0) - ang) });
      } else {
        store.set({ [h.field]: ang });
      }
      view2d.activeDrag = activeDrag;
    }
  });

  const stop = (e) => {
    if (activeDrag) {
      activeDrag = null;
      view2d.activeDrag = null;
      canvas.style.cursor = 'grab';
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (_) {}
      view2d.render(store.get());
    }
  };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
  window.addEventListener('pointerup', stop);
  window.addEventListener('pointercancel', stop);

  canvas.addEventListener('pointerleave', () => {
    if (!activeDrag) {
      const changed = view2d.hoverHandle !== null || view2d.hoverCircumference !== false;
      view2d.hoverHandle = null;
      view2d.hoverCircumference = false;
      if (changed) view2d.render(store.get());
    }
  });

  // Canvas Keyboard Interaction: Focus & Arrow Key Nudging of Vertices & Radius
  canvas.addEventListener('keydown', (e) => {
    const st = store.get();
    let handled = false;
    const currentHandleId = view2d.selectedVertexId || 'C';
    const fieldMap = { A: 'angleA', B: 'angleB', C: 'angleC' };
    const field = fieldMap[currentHandleId] || (visualId === 'law-of-sines' ? 'angleC' : 'angleTheta');
    const step = e.shiftKey ? toRadians(5) : toRadians(1);

    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      store.set({ [field]: normalizeAngle((st[field] || 0) - step) });
      handled = true;
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      store.set({ [field]: normalizeAngle((st[field] || 0) + step) });
      handled = true;
    } else if (e.key === '+' || e.key === '=') {
      store.set({ radius: clamp((st.radius || 175) + 5, 100, 260) });
      handled = true;
    } else if (e.key === '-' || e.key === '_') {
      store.set({ radius: clamp((st.radius || 175) - 5, 100, 260) });
      handled = true;
    } else if (e.key.toLowerCase() === 'a') {
      view2d.selectedVertexId = 'A';
      view2d.hoverHandle = view2d.getInteractiveHandles2D(st).handles.find((h) => h.id === 'A') || null;
      view2d.render(store.get());
      handled = true;
    } else if (e.key.toLowerCase() === 'b') {
      view2d.selectedVertexId = 'B';
      view2d.hoverHandle = view2d.getInteractiveHandles2D(st).handles.find((h) => h.id === 'B') || null;
      view2d.render(store.get());
      handled = true;
    } else if (e.key.toLowerCase() === 'c') {
      view2d.selectedVertexId = 'C';
      view2d.hoverHandle = view2d.getInteractiveHandles2D(st).handles.find((h) => h.id === 'C') || null;
      view2d.render(store.get());
      handled = true;
    } else if (e.key === 'Home') {
      store.set({ pan: { x: 0, y: 0 } });
      handled = true;
    }

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  // Double-click canvas to recenter pan (matching Circle Theorems)
  canvas.addEventListener('dblclick', () => {
    store.set({ pan: { x: 0, y: 0 } });
  });
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function syncSlider(id, val) {
  const el = document.getElementById(id);
  if (el && document.activeElement !== el) {
    const num = parseFloat(val);
    if (!isNaN(num) && num > parseFloat(el.max)) {
      el.max = String(Math.ceil(num * 1.3));
    }
    el.value = String(val);
  }
}

function updateTelemetryAndSlidersDOM(state, visualId) {
  const angUnit = state.angleUnit || 'deg';
  const lenUnit = state.lengthUnit || 'px';
  const r = state.radius || 175;
  const fmtAng = (deg) => UnitSystemConverter.formatAngle(deg, angUnit);

  setText('label-radius', UnitSystemConverter.formatLength(r, lenUnit, r));
  syncSlider('slider-radius', Math.round(r));

  // Shared 3D radius readout (matches Circle Theorems: R3D = sphere scale used by TrigScene3DView)
  const R3D = getModelRadius(state);
  setText('val-3d-r', lenUnit === 'px' ? R3D.toFixed(2) : UnitSystemConverter.formatLength(R3D, lenUnit, 10, 2));

  if (visualId === 'unit-circle-helix') {
    const m = computeUnitCircleHelix(state.angleTheta, 1.0, state.helixPitch);
    syncSlider('slider-theta', Math.round(m.thetaDeg));
    syncSlider('slider-pitch', (state.helixPitch || 0.35).toFixed(2));
    setText('label-theta', fmtAng(m.thetaDeg));
    setText('label-pitch', (state.helixPitch || 0.35).toFixed(2));
    setText('tel-theta', fmtAng(m.thetaDeg));
    setText('tel-cos', m.cos.toFixed(4));
    setText('tel-sin', m.sin.toFixed(4));
    setText('tel-tan', Math.abs(m.tan) > 100 ? '±∞' : m.tan.toFixed(4));
    setText('tel-sec', Math.abs(m.sec) > 100 ? '±∞' : m.sec.toFixed(4));
    setText('tel-csc', Math.abs(m.csc) > 100 ? '±∞' : m.csc.toFixed(4));
    setText('tel-cot', Math.abs(m.cot) > 100 ? '±∞' : m.cot.toFixed(4));
    setText('tel-pythag', m.invariants.pythagoreanPrimary.toFixed(6));
    setText('tel-reflex', fmtAng(360 - m.thetaDeg));
    setText('tel-o-coords', '0.00, 0.00');
    setText('tel-p-coords', `${m.cos.toFixed(2)}, ${m.sin.toFixed(2)}`);
    setText('tel-cx-coords', `${m.cos.toFixed(2)}, 0.00`);

    setText('val-3d-px', m.cos.toFixed(3));
    setText('val-3d-pz', m.sin.toFixed(3));
    setText('val-3d-py', m.points3D.point3D.z.toFixed(3));
    setText('val-3d-tan', Math.abs(m.tan) > 100 ? '±∞' : m.tan.toFixed(4));
    setText('val-3d-sec', Math.abs(m.sec) > 100 ? '±∞' : m.sec.toFixed(4));
    setText('val-3d-cot', Math.abs(m.cot) > 100 ? '±∞' : m.cot.toFixed(4));
    setText('val-3d-csc', Math.abs(m.csc) > 100 ? '±∞' : m.csc.toFixed(4));
    setText('val-3d-pythag', m.invariants.pythagoreanPrimary.toFixed(6));
    setText('val-3d-peq-coords', `${(R3D * m.cos).toFixed(2)}, 0.00, ${(R3D * m.sin).toFixed(2)}`);
    setText('val-3d-phelix-coords', `${(R3D * m.cos).toFixed(2)}, ${m.points3D.point3D.z.toFixed(2)}, ${(R3D * m.sin).toFixed(2)}`);

    const tanSecCheck = document.getElementById('vis-3d-tan-sec');
    if (tanSecCheck && tanSecCheck.checked !== (state.showTanSec !== false)) {
      tanSecCheck.checked = state.showTanSec !== false;
    }
    const cotCscCheck = document.getElementById('vis-3d-cot-csc');
    if (cotCscCheck && cotCscCheck.checked !== (state.showCotCsc !== false)) {
      cotCscCheck.checked = state.showCotCsc !== false;
    }
    const cylCheck = document.getElementById('vis-3d-cylinder');
    if (cylCheck && cylCheck.checked !== (state.showCylinder !== false)) {
      cylCheck.checked = state.showCylinder !== false;
    }
  } else if (visualId === 'law-of-sines') {
    const isSpatial = state.dimensionMode === 'spatial';
    const m = computeLawOfSines(state.angleA, state.angleB, state.angleC, getModelRadius(state));
    const degAPolar = ((toDegrees(state.angleA) % 360) + 360) % 360;
    const degBPolar = ((toDegrees(state.angleB) % 360) + 360) % 360;
    const degCPolar = ((toDegrees(state.angleC) % 360) + 360) % 360;
    syncSlider('slider-angle-a', Math.round(degAPolar));
    syncSlider('slider-angle-b', Math.round(degBPolar));
    syncSlider('slider-angle-c', Math.round(degCPolar));
    setText('label-angle-a', fmtAng(degAPolar));
    setText('label-angle-b', fmtAng(degBPolar));
    setText('label-angle-c', fmtAng(degCPolar));
    setText('tel-ang-a', fmtAng(m.interiorAngles.degA));
    setText('tel-ang-b', fmtAng(m.interiorAngles.degB));
    setText('tel-ang-c', fmtAng(m.interiorAngles.degC));
    setText('tel-ratio-a', m.ratios.ratioA.toFixed(3));
    setText('tel-ratio-b', m.ratios.ratioB.toFixed(3));
    setText('tel-ratio-c', m.ratios.ratioC.toFixed(3));
    setText('tel-2r', m.diameter2R.toFixed(3));
    setText('tel-hc', m.altitudeHc.toFixed(3));

    // Update Mode Buttons & View Title
    const btnPlanar = document.getElementById('btn-mode-planar');
    const btnSpatial = document.getElementById('btn-mode-spatial');
    const btnPlanarPill = document.getElementById('btn-mode-planar-pill');
    const btnSpatialPill = document.getElementById('btn-mode-spatial-pill');
    if (btnPlanar) {
      btnPlanar.classList.toggle('active', !isSpatial);
      btnPlanar.setAttribute('aria-pressed', !isSpatial ? 'true' : 'false');
    }
    if (btnSpatial) {
      btnSpatial.classList.toggle('active', isSpatial);
      btnSpatial.setAttribute('aria-pressed', isSpatial ? 'true' : 'false');
    }
    if (btnPlanarPill) {
      btnPlanarPill.classList.toggle('active', !isSpatial);
      btnPlanarPill.setAttribute('aria-pressed', !isSpatial ? 'true' : 'false');
    }
    if (btnSpatialPill) {
      btnSpatialPill.classList.toggle('active', isSpatial);
      btnSpatialPill.setAttribute('aria-pressed', isSpatial ? 'true' : 'false');
    }

    const btnToggleDim = document.getElementById('btn-toggle-dimension-mode');
    const dimStatusPill = document.getElementById('toolbar-dimension-status');
    if (btnToggleDim) {
      btnToggleDim.classList.toggle('active', isSpatial);
      btnToggleDim.setAttribute('aria-pressed', isSpatial ? 'true' : 'false');
    }
    if (dimStatusPill) {
      dimStatusPill.classList.toggle('is-on', isSpatial);
      dimStatusPill.classList.toggle('is-off', !isSpatial);
      dimStatusPill.textContent = isSpatial ? 'ON' : 'OFF';
    }

    const titleEl = document.getElementById('canvas-3d-title');
    if (titleEl) {
      titleEl.innerHTML = isSpatial
        ? '3D: Spherical Law of Sines (<span class="color-teal">S²</span>)'
        : '3D: Circumscribed Sphere (<span class="color-amber">2R</span>)';
      titleEl.title = isSpatial
        ? '3D: Spherical Law of Sines & Excess on S² (sin(a/R)/sin A = const)'
        : "3D: Circumscribed Sphere & Antipodal Diameter (A'B = 2R)";
    }

    const descEl = document.getElementById('desc-mode-dimension');
    if (descEl) {
      descEl.textContent = isSpatial
        ? 'Spherical geometry on S²: arcs are great circles, A+B+C > 180°, sin(a/R)/sin A = const.'
        : 'Planar Euclidean embedding on equatorial plane Y = 0 with diameter 2R = a / sin A.';
    }

    const rowExcess = document.getElementById('row-3d-excess');
    const rowVolume = document.getElementById('row-3d-volume');
    const row2R = document.getElementById('row-3d-2r');
    const lblArea = document.getElementById('lbl-3d-area');
    const lblRa = document.getElementById('lbl-3d-ra');
    const lblRb = document.getElementById('lbl-3d-rb');
    const lblRc = document.getElementById('lbl-3d-rc');

    setText('val-3d-mode-label', isSpatial ? 'Spherical (S²)' : 'Planar (Y = 0)');

    if (isSpatial) {
      const sM = computeSphericalLawOfSines(state, R3D);
      if (lblRa) lblRa.textContent = 'R sin(a/R) / sin A:';
      if (lblRb) lblRb.textContent = 'R sin(b/R) / sin B:';
      if (lblRc) lblRc.textContent = 'R sin(c/R) / sin C:';
      if (lblArea) lblArea.textContent = 'Spherical Area R²E:';
      if (row2R) row2R.classList.add('hidden');
      if (rowExcess) rowExcess.classList.remove('hidden');
      if (rowVolume) rowVolume.classList.remove('hidden');

      setText('val-3d-ra', sM.ratios.ratioSphA.toFixed(3));
      setText('val-3d-rb', sM.ratios.ratioSphB.toFixed(3));
      setText('val-3d-rc', sM.ratios.ratioSphC.toFixed(3));
      setText('val-3d-area', sM.sphericalExcess.sphericalArea.toFixed(2));
      setText('val-3d-excess', `${sM.sphericalExcess.excessDeg.toFixed(2)}°`);
      setText('val-3d-volume', sM.pyramidVolume.toFixed(3));
    } else {
      if (lblRa) lblRa.textContent = '3D a / sin A:';
      if (lblRb) lblRb.textContent = '3D b / sin B:';
      if (lblRc) lblRc.textContent = '3D c / sin C:';
      if (lblArea) lblArea.textContent = 'Triangle Area abc/(4R):';
      if (row2R) row2R.classList.remove('hidden');
      if (rowExcess) rowExcess.classList.add('hidden');
      if (rowVolume) rowVolume.classList.add('hidden');

      setText('val-3d-2r', m.diameter2R.toFixed(3));
      setText('val-3d-ra', m.ratios.ratioA.toFixed(3));
      setText('val-3d-rb', m.ratios.ratioB.toFixed(3));
      setText('val-3d-rc', m.ratios.ratioC.toFixed(3));
      setText('val-3d-area', m.area.toFixed(2));
    }
  } else if (visualId === 'law-of-cosines') {
    const isSpatial = state.dimensionMode === 'spatial';
    const m = computeLawOfCosines(state.sideA, state.sideB, state.angleC);
    syncSlider('slider-side-a', m.a);
    syncSlider('slider-side-b', m.b);
    syncSlider('slider-angle-c', Math.round(m.angleCDeg));
    setText('label-side-a', m.a.toFixed(1));
    setText('label-side-b', m.b.toFixed(1));
    setText('label-angle-c', fmtAng(m.angleCDeg));
    setText('tel-a', m.a.toFixed(2));
    setText('tel-b', m.b.toFixed(2));
    setText('tel-c', m.c.toFixed(3));
    setText('tel-ang-c', fmtAng(m.angleCDeg));
    setText('tel-a2b2', m.squares.pythagoreanSum.toFixed(2));
    setText('tel-2abcos', m.squares.interaction2abCosC.toFixed(2));
    setText('tel-c2', m.squares.c2.toFixed(2));
    setText('tel-mixed', m.mixedPartialCoeff.toFixed(4));
    setText('tel-cos-ratio', m.cosC.toFixed(4));
    setText('tel-proj-frac', (m.b > 0 ? (m.projection.pProj / m.b) : 0).toFixed(4));
    setText('tel-c-coords', `${m.vertices2D.C.x.toFixed(2)}, ${m.vertices2D.C.y.toFixed(2)}`);
    setText('tel-a-coords', `${m.vertices2D.A.x.toFixed(2)}, ${m.vertices2D.A.y.toFixed(2)}`);
    setText('tel-b-coords', `${m.vertices2D.B.x.toFixed(2)}, ${m.vertices2D.B.y.toFixed(2)}`);
    setText('val-3d-b-coords', `${m.vertices2D.B.x.toFixed(2)}, ${m.vertices2D.B.y.toFixed(2)}`);

    // Update Mode Buttons & View Title
    const btnPlanar = document.getElementById('btn-mode-planar');
    const btnSpatial = document.getElementById('btn-mode-spatial');
    const btnPlanarPill = document.getElementById('btn-mode-planar-pill');
    const btnSpatialPill = document.getElementById('btn-mode-spatial-pill');
    if (btnPlanar) {
      btnPlanar.classList.toggle('active', !isSpatial);
      btnPlanar.setAttribute('aria-pressed', !isSpatial ? 'true' : 'false');
    }
    if (btnSpatial) {
      btnSpatial.classList.toggle('active', isSpatial);
      btnSpatial.setAttribute('aria-pressed', isSpatial ? 'true' : 'false');
    }
    if (btnPlanarPill) {
      btnPlanarPill.classList.toggle('active', !isSpatial);
      btnPlanarPill.setAttribute('aria-pressed', !isSpatial ? 'true' : 'false');
    }
    if (btnSpatialPill) {
      btnSpatialPill.classList.toggle('active', isSpatial);
      btnSpatialPill.setAttribute('aria-pressed', isSpatial ? 'true' : 'false');
    }

    const btnToggleDim = document.getElementById('btn-toggle-dimension-mode');
    const dimStatusPill = document.getElementById('toolbar-dimension-status');
    if (btnToggleDim) {
      btnToggleDim.classList.toggle('active', isSpatial);
      btnToggleDim.setAttribute('aria-pressed', isSpatial ? 'true' : 'false');
    }
    if (dimStatusPill) {
      dimStatusPill.classList.toggle('is-on', isSpatial);
      dimStatusPill.classList.toggle('is-off', !isSpatial);
      dimStatusPill.textContent = isSpatial ? 'ON' : 'OFF';
    }

    const titleEl = document.getElementById('canvas-3d-title');
    if (titleEl) {
      titleEl.innerHTML = isSpatial
        ? '3D: Spherical Law of Cosines (<span class="color-teal">S²</span>)'
        : '3D: Euclidean Projection Prism (<span class="color-rose">c²</span>)';
      titleEl.title = isSpatial
        ? '3D: Spherical Law of Cosines on S² (cos(c/R) = cos(a/R)cos(b/R) + sin(a/R)sin(b/R)cos C)'
        : '3D: Euclidean Parallelepiped & Metric (c² = a² + b² − 2ab cos C)';
    }

    const descEl = document.getElementById('desc-mode-dimension');
    if (descEl) {
      descEl.textContent = isSpatial
        ? 'Geodesic triangle on sphere S² of radius R: cos(c/R) = cos(a/R)cos(b/R) + sin(a/R)sin(b/R)cos C.'
        : 'Planar Euclidean triangle with squares on edges and projection prism foot D.';
    }

    const rowC2 = document.getElementById('row-3d-c2');
    const rowProj = document.getElementById('row-3d-proj');
    const rowAlt = document.getElementById('row-3d-alt');
    const rowMixed = document.getElementById('row-3d-mixed');
    const rowCosRatio = document.getElementById('row-3d-cos-ratio');
    const rowCosCArc = document.getElementById('row-3d-cosc-arc');
    const rowSphC = document.getElementById('row-3d-sph-c');
    const rowExcess = document.getElementById('row-3d-excess');
    const rowArea = document.getElementById('row-3d-area');

    setText('val-3d-mode-label', isSpatial ? 'Spherical (S²)' : 'Planar (Y = 0)');

    if (isSpatial) {
      const sM = computeSphericalLawOfCosines(state.sideA, state.sideB, state.angleC, R3D);
      if (rowC2) rowC2.classList.add('hidden');
      if (rowProj) rowProj.classList.add('hidden');
      if (rowAlt) rowAlt.classList.add('hidden');
      if (rowMixed) rowMixed.classList.add('hidden');
      if (rowCosRatio) rowCosRatio.classList.add('hidden');
      if (rowCosCArc) rowCosCArc.classList.remove('hidden');
      if (rowSphC) rowSphC.classList.remove('hidden');
      if (rowExcess) rowExcess.classList.remove('hidden');
      if (rowArea) rowArea.classList.remove('hidden');

      setText('val-3d-cosc-arc', sM.cosC_arc.toFixed(4));
      setText('val-3d-sph-c', sM.c.toFixed(3));
      setText('val-3d-excess', `${sM.sphericalExcess.excessDeg.toFixed(2)}°`);
      setText('val-3d-area', sM.sphericalExcess.sphericalArea.toFixed(2));
    } else {
      if (rowC2) rowC2.classList.remove('hidden');
      if (rowProj) rowProj.classList.remove('hidden');
      if (rowAlt) rowAlt.classList.remove('hidden');
      if (rowMixed) rowMixed.classList.remove('hidden');
      if (rowCosRatio) rowCosRatio.classList.remove('hidden');
      if (rowCosCArc) rowCosCArc.classList.add('hidden');
      if (rowSphC) rowSphC.classList.add('hidden');
      if (rowExcess) rowExcess.classList.add('hidden');
      if (rowArea) rowArea.classList.add('hidden');

      setText('val-3d-c2', m.squares.c2.toFixed(2));
      setText('val-3d-proj', m.projection.pProj.toFixed(3));
      setText('val-3d-alt', m.projection.hAlt.toFixed(3));
      setText('val-3d-mixed', m.mixedPartialCoeff.toFixed(4));
      setText('val-3d-cos-ratio', m.cosC.toFixed(4));
    }

    const rectCheck = document.getElementById('vis-3d-rect');
    if (rectCheck && rectCheck.checked !== (state.showInteractionRect !== false)) {
      rectCheck.checked = state.showInteractionRect !== false;
    }
  } else {
    const isSpatial = state.dimensionMode === 'spatial';
    const m = computeAngleSumIdentities(state.angleAlpha, state.angleBeta, 1.0);
    syncSlider('slider-alpha', Math.round(m.alphaDeg));
    syncSlider('slider-beta', Math.round(m.betaDeg));
    syncSlider('slider-gamma', Math.round(toDegrees(state.angleGamma || 0)));
    setText('label-alpha', fmtAng(m.alphaDeg));
    setText('label-beta', fmtAng(m.betaDeg));
    setText('label-gamma', fmtAng(toDegrees(state.angleGamma || 0)));
    setText('tel-alpha', fmtAng(m.alphaDeg));
    setText('tel-beta', fmtAng(m.betaDeg));
    setText('tel-sum-ang', fmtAng(m.sumAngleDeg));
    setText('tel-cos-sum', m.trig.cosSum.toFixed(4));
    setText('tel-sin-sum', m.trig.sinSum.toFixed(4));
    setText('tel-cos-diff', m.trig.cosDiff.toFixed(4));
    setText('tel-sin-diff', m.trig.sinDiff.toFixed(4));
    setText('tel-separation', fmtAng(2 * m.betaDeg));
    setText('tel-chord-pd', (2 * Math.sin(m.beta)).toFixed(4));

    // Update Mode Buttons & View Title
    const btnPlanar = document.getElementById('btn-mode-planar');
    const btnSpatial = document.getElementById('btn-mode-spatial');
    const btnPlanarPill = document.getElementById('btn-mode-planar-pill');
    const btnSpatialPill = document.getElementById('btn-mode-spatial-pill');
    if (btnPlanar) {
      btnPlanar.classList.toggle('active', !isSpatial);
      btnPlanar.setAttribute('aria-pressed', !isSpatial ? 'true' : 'false');
    }
    if (btnSpatial) {
      btnSpatial.classList.toggle('active', isSpatial);
      btnSpatial.setAttribute('aria-pressed', isSpatial ? 'true' : 'false');
    }
    if (btnPlanarPill) {
      btnPlanarPill.classList.toggle('active', !isSpatial);
      btnPlanarPill.setAttribute('aria-pressed', !isSpatial ? 'true' : 'false');
    }
    if (btnSpatialPill) {
      btnSpatialPill.classList.toggle('active', isSpatial);
      btnSpatialPill.setAttribute('aria-pressed', isSpatial ? 'true' : 'false');
    }

    const btnToggleDim = document.getElementById('btn-toggle-dimension-mode');
    const dimStatusPill = document.getElementById('toolbar-dimension-status');
    if (btnToggleDim) {
      btnToggleDim.classList.toggle('active', isSpatial);
      btnToggleDim.setAttribute('aria-pressed', isSpatial ? 'true' : 'false');
    }
    if (dimStatusPill) {
      dimStatusPill.classList.toggle('is-on', isSpatial);
      dimStatusPill.classList.toggle('is-off', !isSpatial);
      dimStatusPill.textContent = isSpatial ? 'ON' : 'OFF';
    }

    const titleEl = document.getElementById('canvas-3d-title');
    if (titleEl) {
      titleEl.innerHTML = isSpatial
        ? '3D: Spatial SO(3) Euler Frame (<span class="color-amber">γ</span>)'
        : '3D: SO(2) Planar Embedding (<span class="color-sky">α</span>+<span class="color-violet">β</span>)';
      titleEl.title = isSpatial
        ? '3D: Spatial SO(3) Lie Group Euler Frame (R = Rz(α+β)Rx(γ))'
        : '3D: SO(2) Planar Embedding (α + β)';
    }

    const descEl = document.getElementById('desc-mode-dimension');
    if (descEl) {
      descEl.textContent = isSpatial
        ? 'Spatial Lie group SO(3) with Euler tilt γ: triad {e₁, e₂, e₃}, det(R) = +1, exact SO(2) reduction at γ = 0.'
        : 'Planar SO(2) rotation composition with stacked decomposition triangles and matrix homomorphism.';
    }

    const rowGamma = document.getElementById('row-3d-gamma');
    const rowTrace = document.getElementById('row-3d-trace');
    const rowRotAngle = document.getElementById('row-3d-rot-angle');
    const containerGamma = document.getElementById('container-slider-gamma');
    if (containerGamma) {
      containerGamma.style.display = isSpatial ? '' : 'none';
    }

    setText('val-3d-mode-label', isSpatial ? 'Spatial SO(3)' : 'Planar SO(2)');

    if (isSpatial) {
      const eM = computeSpatialAngleSumEuler(state.angleAlpha, state.angleBeta, state.angleGamma, 1.0);
      if (rowGamma) rowGamma.classList.remove('hidden');
      if (rowTrace) rowTrace.classList.remove('hidden');
      if (rowRotAngle) rowRotAngle.classList.remove('hidden');

      setText('val-3d-r00', eM.R_matrix[0][0].toFixed(4));
      setText('val-3d-r10', eM.R_matrix[1][0].toFixed(4));
      setText('val-3d-det', eM.lieAlgebra.detR.toFixed(6));
      setText('val-3d-gamma', `${eM.gammaDeg.toFixed(1)}°`);
      setText('val-3d-trace', eM.lieAlgebra.trace.toFixed(4));
      setText('val-3d-rot-angle', `${eM.lieAlgebra.rotAngleDeg.toFixed(1)}°`);
    } else {
      if (rowGamma) rowGamma.classList.remove('hidden');
      if (rowTrace) rowTrace.classList.remove('hidden');
      if (rowRotAngle) rowRotAngle.classList.remove('hidden');

      setText('val-3d-r00', m.matrices.R_comp[0].toFixed(4));
      setText('val-3d-r10', m.matrices.R_comp[2].toFixed(4));
      setText('val-3d-det', (m.matrices.R_comp[0] * m.matrices.R_comp[3] - m.matrices.R_comp[1] * m.matrices.R_comp[2]).toFixed(6));
      setText('val-3d-gamma', '0.0° (Planar)');
      setText('val-3d-trace', (1 + 2 * m.trig.cosSum).toFixed(4));
      setText('val-3d-rot-angle', fmtAng(m.sumAngleDeg));
    }
  }
}
