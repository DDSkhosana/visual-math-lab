/**
 * @file trig-core.js
 * Unified 2D Canvas, 3D Three.js (BaseScene3DView + LabelOverlay3D), Telemetry,
 * Tokenized Derivations, and WorkspaceDockManager Controller for the Trigonometry Suite.
 *
 * Shares 100% of the UI/UX, Colour Grammar (PALETTE), Camera Presets, UnitSystemConverter,
 * Affine Conic Mode, WebXR/Camera AR, and Granular 2D/3D Visibility Toggles with the Circle Theorems Suite.
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
  drawLabelledPoint,
  drawRadialLabelledPoint,
  drawTextBadge,
  drawRightAngle,
  drawAngleWedge,
  drawReflexWedge,
  drawArrow,
  getPointLabel,
  createDefaultVisState,
} from '../../../js/circle-core.js';

import {
  loadThree,
  NullScene3DView,
  ViewModeController,
  BaseScene3DView,
  AXES_3D_LABELS,
  makeAngleWedgeMesh,
  makeRightAngleMesh,
} from '../../../js/circle-3d.js';

import {
  TAU,
  computeUnitCircleHelix,
  computeLawOfSines,
  computeLawOfCosines,
  computeAngleSumIdentities,
} from './trig-math.js';

/* ============================================================================
   1. INITIAL STATE FACTORY PER VISUAL
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
      showProjection: true,
      showSquares3D: true,
      showInteractionRect: true,
    };
  }
  // angle-sum-identities
  return {
    ...common,
    angleAlpha: toRadians(32),
    angleBeta: toRadians(43),
    showDifferenceRay: true,
    showStackedTriangles: true,
    showMatrixVectors: true,
  };
}

function sweepAcuteWedge(ctx, vertex, a1, a2, radius, fill, stroke) {
  let diff = (a2 - a1) % TAU;
  if (diff < 0) diff += TAU;
  const anticlockwise = diff > Math.PI;
  drawAngleWedge(ctx, vertex, a1, a2, radius, fill, stroke, anticlockwise);
}

/* ============================================================================
   2. UNIFIED 2D CANVAS VIEW (Full PALETTE, Grid/Axes, Coords, Angles, Reflex, Affine, Export)
   ============================================================================ */

export class TrigCanvas2DView {
  constructor(canvas, container, visualId) {
    this.canvas = canvas;
    this.container = container;
    this.visualId = visualId;
    this.ctx = canvas.getContext('2d');
    this.state = null;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
    if (this.state) this.render(this.state);
  }

  getCenterAndRadius(state) {
    const pan = state.pan || { x: 0, y: 0 };
    const cx = this.width / 2 + (pan.x || 0);
    const cy = this.height / 2 + (pan.y || 0);
    const maxSafe = Math.max(60, Math.min(this.width, this.height) * 0.36);
    const r = Math.min(state.radius || 175, maxSafe);
    return { cx, cy, r };
  }

  render(state) {
    this.state = state;
    const { ctx, width, height } = this;
    if (!width || !height) return;

    ctx.clearRect(0, 0, width, height);
    const { cx, cy, r } = this.getCenterAndRadius(state);

    // 1. Standard 2D Cartesian Grid & Perspective-Synchronized Coordinate Axes
    draw2DCartesianGrid(ctx, width, height, cx, cy, state.vis2d, 40, state.cameraPerspective);

    // 2. Optional Affine Conic Mode Transformation
    const scaleX = state.affineMode ? (state.affineStretch ?? 1.35) : 1.0;
    const rotRad = state.affineMode ? toRadians(state.affineAxisAngle || 0) : 0;

    ctx.save();
    if (state.affineMode && (Math.abs(scaleX - 1) > 1e-3 || Math.abs(rotRad) > 1e-3)) {
      ctx.translate(cx, cy);
      ctx.rotate(rotRad);
      ctx.scale(scaleX, 1);
      ctx.rotate(-rotRad);
      ctx.translate(-cx, -cy);
    }

    if (this.visualId === 'unit-circle-helix') {
      this.#renderUnitCircle(ctx, state, cx, cy, r);
    } else if (this.visualId === 'law-of-sines') {
      this.#renderLawOfSines(ctx, state, cx, cy, r);
    } else if (this.visualId === 'law-of-cosines') {
      this.#renderLawOfCosines(ctx, state, cx, cy, r);
    } else {
      this.#renderAngleSum(ctx, state, cx, cy, r);
    }

    ctx.restore();

    // 3. Affine Conic HUD Banner when active
    if (state.affineMode) {
      drawTextBadge(
        ctx,
        `Affine Conic Mode (λx = ${scaleX.toFixed(2)}) — Erlangen Conic Invariant Preserved`,
        width / 2,
        height - 22,
        PALETTE.teal
      );
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

    // Unit Circle circumference
    ctx.strokeStyle = PALETTE.sky;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();

    // Primary Right Triangle shading (O - projX - P)
    if (showArea) {
      ctx.fillStyle = 'rgba(20, 184, 166, 0.16)';
      ctx.beginPath();
      ctx.moveTo(O.x, O.y);
      ctx.lineTo(projX.x, projX.y);
      ctx.lineTo(P.x, P.y);
      ctx.closePath();
      ctx.fill();
    }

    // Angle wedge theta at O
    const canvasAngP = Math.atan2(P.y - O.y, P.x - O.x);
    if (showAngles) {
      drawAngleWedge(ctx, O, 0, canvasAngP, 34, 'rgba(251, 191, 36, 0.22)', PALETTE.amber, true);
      drawRightAngle(ctx, projX, O, P, 11, PALETTE.teal);
    }

    // Reflex angle 360 - theta
    if (showReflex) {
      drawReflexWedge(ctx, O, 0, canvasAngP, 42, 'rgba(20, 184, 166, 0.14)', PALETTE.teal);
      if (showLabels) {
        const midRef = -m.theta / 2 + Math.PI;
        drawTextBadge(
          ctx,
          `θ* = ${(360 - m.thetaDeg).toFixed(1)}°`,
          cx + 60 * Math.cos(midRef),
          cy + 60 * Math.sin(midRef),
          PALETTE.teal
        );
      }
    }

    // Cosine (amber) & Sine (emerald) segments
    if (state.showProjections !== false && showLengths) {
      ctx.lineWidth = 3;
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
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(O.x, O.y);
      ctx.lineTo(projY.x, projY.y);
      ctx.lineTo(P.x, P.y);
      ctx.stroke();
      ctx.restore();
    }

    // Tangent (rose) & Secant (violet)
    if (state.showTanSec !== false && showLengths) {
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

    // Cotangent (orange) & Cosecant (fuchsia)
    if (state.showCotCsc !== false && showLengths) {
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
      ctx.moveTo(P.x, P.y);
      ctx.lineTo(cscPt.x, cscPt.y);
      ctx.stroke();
      ctx.restore();
    }

    // Radius OP (indigo)
    ctx.strokeStyle = PALETTE.indigo;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(O.x, O.y);
    ctx.lineTo(P.x, P.y);
    ctx.stroke();

    // Segment Badges
    if (showLabels) {
      if (showAngles) {
        const bisAng = -m.theta / 2;
        drawTextBadge(ctx, `θ = ${m.thetaDeg.toFixed(1)}°`, cx + 52 * Math.cos(bisAng), cy + 52 * Math.sin(bisAng), PALETTE.amber);
      }
      if (state.showProjections !== false && showLengths) {
        drawTextBadge(ctx, `cos θ = ${m.cos.toFixed(3)}`, (O.x + projX.x) / 2, O.y + 18, PALETTE.amber);
        drawTextBadge(ctx, `sin θ = ${m.sin.toFixed(3)}`, projX.x + 42 * Math.sign(m.cos || 1), (projX.y + P.y) / 2, PALETTE.emerald);
      }
      if (state.showTanSec !== false && Math.abs(m.tan) < 4) {
        drawTextBadge(ctx, `tan θ = ${m.tan.toFixed(2)}`, tanTip.x + 42, (tanBase.y + tanTip.y) / 2, PALETTE.rose);
      }
    }

    // Points & Coordinate Badges
    if (showPoints) {
      const lblO = getPointLabel('O', 0, 0, vis);
      const lblP = getPointLabel('P', m.cos * r, m.sin * r, vis);
      const lblX = getPointLabel('Cx', m.cos * r, 0, vis);
      drawLabelledPoint(ctx, O, PALETTE.indigo, lblO, -12, 16);
      drawLabelledPoint(ctx, projX, PALETTE.amber, lblX, 0, -14, 4);
      drawRadialLabelledPoint(ctx, P, O, PALETTE.violet, lblP, 22, 6);
    }
  }

  #renderLawOfSines(ctx, state, cx, cy, r) {
    const m = computeLawOfSines(state.angleA, state.angleB, state.angleC, 10);
    const scale = r / 10;
    const vis = state.vis2d || {};
    const showArea = vis.area !== false;
    const showAngles = vis.angles !== false;
    const showLabels = vis.labels !== false;
    const showLengths = vis.lengths !== false;
    const showPoints = vis.points !== false;
    const showReflex = Boolean(vis.reflex);

    const toScreen = (pt) => ({ x: cx + pt.x * scale, y: cy - pt.y * scale });
    const O = { x: cx, y: cy };
    const A = toScreen(m.vertices2D.A);
    const B = toScreen(m.vertices2D.B);
    const C = toScreen(m.vertices2D.C);
    const antipodeA = toScreen(m.vertices2D.antipodeA);
    const footHc = toScreen(m.vertices2D.footHc);

    // Circumcircle
    ctx.strokeStyle = PALETTE.sky;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();

    // Inscribed Triangle Shading
    if (showArea) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.14)';
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.lineTo(C.x, C.y);
      ctx.closePath();
      ctx.fill();
    }

    // Circumradii OA, OB, OC
    if (state.showRadii !== false) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = PALETTE.indigo;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(O.x, O.y); ctx.lineTo(A.x, A.y);
      ctx.moveTo(O.x, O.y); ctx.lineTo(B.x, B.y);
      ctx.moveTo(O.x, O.y); ctx.lineTo(C.x, C.y);
      ctx.stroke();
      ctx.restore();
    }

    // Thales Antipodal Diameter Bridge A'B
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
        drawRadialLabelledPoint(ctx, antipodeA, O, PALETTE.amber, showLabels ? "A'" : '', 18, 4.5);
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
      }
      if (showLabels && showLengths) {
        drawTextBadge(ctx, `hc = ${m.altitudeHc.toFixed(2)}`, (C.x + footHc.x) / 2 + 16, (C.y + footHc.y) / 2, PALETTE.teal);
      }
    }

    // Interior Angle Wedges at A, B, C
    const angAB = Math.atan2(B.y - A.y, B.x - A.x);
    const angAC = Math.atan2(C.y - A.y, C.x - A.x);
    const angBA = Math.atan2(A.y - B.y, A.x - B.x);
    const angBC = Math.atan2(C.y - B.y, C.x - B.x);
    const angCA = Math.atan2(A.y - C.y, A.x - C.x);
    const angCB = Math.atan2(B.y - C.y, B.x - C.x);

    if (showAngles) {
      sweepAcuteWedge(ctx, A, angAB, angAC, 28, 'rgba(239, 68, 68, 0.25)', PALETTE.red);
      sweepAcuteWedge(ctx, B, angBC, angBA, 28, 'rgba(34, 197, 94, 0.25)', PALETTE.green);
      sweepAcuteWedge(ctx, C, angCA, angCB, 28, 'rgba(168, 85, 247, 0.25)', PALETTE.violet);
    }

    if (showReflex) {
      drawReflexWedge(ctx, C, angCA, angCB, 36, 'rgba(20, 184, 166, 0.14)', PALETTE.teal);
    }

    // Sides a (BC - red), b (AC - green), c (AB - violet)
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = PALETTE.red;
    ctx.beginPath(); ctx.moveTo(B.x, B.y); ctx.lineTo(C.x, C.y); ctx.stroke();

    ctx.strokeStyle = PALETTE.green;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(C.x, C.y); ctx.stroke();

    ctx.strokeStyle = PALETTE.violet;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();

    // Side Length & Angle Labels
    if (showLabels && showLengths) {
      drawTextBadge(ctx, `a = ${m.sides.a.toFixed(2)}`, (B.x + C.x) / 2, (B.y + C.y) / 2 - 10, PALETTE.red);
      drawTextBadge(ctx, `b = ${m.sides.b.toFixed(2)}`, (A.x + C.x) / 2, (A.y + C.y) / 2 - 10, PALETTE.green);
      drawTextBadge(ctx, `c = ${m.sides.c.toFixed(2)}`, (A.x + B.x) / 2, (A.y + B.y) / 2 + 14, PALETTE.violet);
    }

    if (showPoints) {
      drawLabelledPoint(ctx, O, PALETTE.indigo, getPointLabel('O', 0, 0, vis), 10, 14);
      drawRadialLabelledPoint(ctx, A, O, PALETTE.red, getPointLabel('A', m.vertices2D.A.x, m.vertices2D.A.y, vis), 20);
      drawRadialLabelledPoint(ctx, B, O, PALETTE.green, getPointLabel('B', m.vertices2D.B.x, m.vertices2D.B.y, vis), 20);
      drawRadialLabelledPoint(ctx, C, O, PALETTE.violet, getPointLabel('C', m.vertices2D.C.x, m.vertices2D.C.y, vis), 20);
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

    const originX = cx - (m.b * scale) * 0.42;
    const originY = cy + (m.projection.hAlt * scale) * 0.35;
    const toScreen = (pt) => ({ x: originX + pt.x * scale, y: originY - pt.y * scale });

    const C = toScreen(m.vertices2D.C);
    const A = toScreen(m.vertices2D.A);
    const B = toScreen(m.vertices2D.B);
    const D = toScreen(m.vertices2D.D);

    // Triangle Shading
    if (showArea) {
      ctx.fillStyle = 'rgba(20, 184, 166, 0.14)';
      ctx.beginPath();
      ctx.moveTo(C.x, C.y);
      ctx.lineTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.closePath();
      ctx.fill();
    }

    // Interaction Rectangle 2ab cos C preview below AC
    if (state.showInteractionRect !== false && showArea) {
      const rectW = m.projection.pProj * scale;
      const rectH = Math.min(75, m.b * scale * 0.32);
      ctx.fillStyle = m.cosC >= 0 ? 'rgba(251, 191, 36, 0.15)' : 'rgba(244, 63, 94, 0.15)';
      ctx.strokeStyle = m.cosC >= 0 ? PALETTE.amber : PALETTE.rose;
      ctx.lineWidth = 1.5;
      ctx.fillRect(C.x, C.y + 8, rectW, rectH);
      ctx.strokeRect(C.x, C.y + 8, rectW, rectH);
      if (showLabels) {
        drawTextBadge(
          ctx,
          `2ab cos C = ${m.squares.interaction2abCosC.toFixed(1)}`,
          C.x + rectW / 2,
          C.y + 8 + rectH / 2,
          m.cosC >= 0 ? PALETTE.amber : PALETTE.rose
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
        drawLabelledPoint(ctx, D, PALETTE.amber, showLabels ? 'D' : '', 0, 18, 4.5);
      }
      if (showLabels && showLengths) {
        drawTextBadge(ctx, `a cos C = ${m.projection.pProj.toFixed(2)}`, (C.x + D.x) / 2, C.y - 14, PALETTE.amber);
        drawTextBadge(ctx, `h = ${m.projection.hAlt.toFixed(2)}`, D.x + 36, (B.y + D.y) / 2, PALETTE.amber);
      }
    }

    // Angle C wedge at C
    const angCB = Math.atan2(B.y - C.y, B.x - C.x);
    if (showAngles) {
      drawAngleWedge(ctx, C, 0, angCB, 32, 'rgba(244, 63, 94, 0.24)', PALETTE.rose, true);
      if (showLabels) {
        drawTextBadge(ctx, `∠C = ${m.angleCDeg.toFixed(1)}°`, C.x + 48 * Math.cos(angCB / 2), C.y + 48 * Math.sin(angCB / 2), PALETTE.rose);
      }
    }
    if (showReflex) {
      drawReflexWedge(ctx, C, 0, angCB, 40, 'rgba(20, 184, 166, 0.15)', PALETTE.teal);
    }

    // Sides: b = AC (emerald), a = BC (sky), c = AB (rose)
    ctx.lineWidth = 3;
    ctx.strokeStyle = PALETTE.emerald;
    ctx.beginPath(); ctx.moveTo(C.x, C.y); ctx.lineTo(A.x, A.y); ctx.stroke();

    ctx.strokeStyle = PALETTE.sky;
    ctx.beginPath(); ctx.moveTo(C.x, C.y); ctx.lineTo(B.x, B.y); ctx.stroke();

    ctx.strokeStyle = PALETTE.rose;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();

    if (showLabels && showLengths) {
      drawTextBadge(ctx, `a = ${m.a.toFixed(2)}`, (C.x + B.x) / 2 - 22, (C.y + B.y) / 2 - 10, PALETTE.sky);
      drawTextBadge(ctx, `b = ${m.b.toFixed(2)}`, (C.x + A.x) / 2, C.y + 24, PALETTE.emerald);
      drawTextBadge(ctx, `c = ${m.c.toFixed(2)}`, (A.x + B.x) / 2 + 24, (A.y + B.y) / 2 - 10, PALETTE.rose);
    }

    if (showPoints) {
      drawLabelledPoint(ctx, C, PALETTE.rose, getPointLabel('C', 0, 0, vis), -16, 16, 5.5);
      drawLabelledPoint(ctx, A, PALETTE.emerald, getPointLabel('A', m.b, 0, vis), 16, 16, 5.5);
      drawLabelledPoint(ctx, B, PALETTE.sky, getPointLabel('B', m.vertices2D.B.x, m.vertices2D.B.y, vis), 0, -16, 6);
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

    const toScreen = (pt) => ({ x: cx + pt.x * r, y: cy - pt.y * r });
    const O = toScreen(m.points2D.O);
    const P = toScreen(m.points2D.P);
    const Pdiff = toScreen(m.points2D.P_diff);
    const Aray = toScreen(m.points2D.A_ray);
    const Q = toScreen(m.points2D.Q);
    const M = toScreen(m.points2D.M);
    const N = toScreen(m.points2D.N);
    const S = toScreen(m.points2D.S_corner);

    // Unit Circle
    ctx.strokeStyle = PALETTE.sky;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();

    // Stacked Right Triangles Shading (O-M-Q and O-Q-P)
    if (state.showStackedTriangles !== false && showArea) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.beginPath();
      ctx.moveTo(O.x, O.y); ctx.lineTo(M.x, M.y); ctx.lineTo(Q.x, Q.y); ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(168, 85, 247, 0.16)';
      ctx.beginPath();
      ctx.moveTo(O.x, O.y); ctx.lineTo(Q.x, Q.y); ctx.lineTo(P.x, P.y); ctx.closePath();
      ctx.fill();
    }

    if (state.showStackedTriangles !== false && showLengths) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = PALETTE.amber;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(Q.x, Q.y); ctx.lineTo(M.x, M.y);
      ctx.moveTo(P.x, P.y); ctx.lineTo(N.x, N.y);
      ctx.moveTo(Q.x, Q.y); ctx.lineTo(S.x, S.y);
      ctx.moveTo(P.x, P.y); ctx.lineTo(S.x, S.y);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = PALETTE.violet;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(Q.x, Q.y);
      ctx.lineTo(P.x, P.y);
      ctx.stroke();

      if (showAngles) {
        drawRightAngle(ctx, Q, O, P, 10, PALETTE.violet);
      }
    }

    // Angle wedges alpha and beta
    const angA = Math.atan2(Aray.y - O.y, Aray.x - O.x);
    const angP = Math.atan2(P.y - O.y, P.x - O.x);
    if (showAngles) {
      drawAngleWedge(ctx, O, 0, angA, 34, 'rgba(56, 189, 248, 0.24)', PALETTE.sky, true);
      drawAngleWedge(ctx, O, angA, angP, 46, 'rgba(168, 85, 247, 0.24)', PALETTE.violet, true);
    }
    if (showReflex) {
      drawReflexWedge(ctx, O, 0, angP, 54, 'rgba(20, 184, 166, 0.14)', PALETTE.teal);
    }

    // Base ray OA (alpha - sky)
    drawArrow(ctx, O, Aray, PALETTE.sky, 2.4, 10);

    // Compound sum ray OP (alpha + beta - emerald)
    drawArrow(ctx, O, P, PALETTE.emerald, 3.0, 11);

    // Difference ray OP_diff (alpha - beta - rose)
    if (state.showDifferenceRay !== false) {
      drawArrow(ctx, O, Pdiff, PALETTE.rose, 2.2, 9);
      if (showPoints) {
        drawRadialLabelledPoint(ctx, Pdiff, O, PALETTE.rose, showLabels ? 'P(α−β)' : '', 22, 4.5);
      }
    }

    if (showLabels && showLengths) {
      drawTextBadge(ctx, `cos(α+β) = ${m.trig.cosSum.toFixed(3)}`, (O.x + N.x) / 2, O.y + 18, PALETTE.amber);
      drawTextBadge(ctx, `sin(α+β) = ${m.trig.sinSum.toFixed(3)}`, N.x - 42, (N.y + P.y) / 2, PALETTE.emerald);
    }

    if (showPoints) {
      drawLabelledPoint(ctx, O, PALETTE.indigo, getPointLabel('O', 0, 0, vis), -12, 16);
      drawRadialLabelledPoint(ctx, Aray, O, PALETTE.sky, getPointLabel('A(α)', m.points2D.A_ray.x, m.points2D.A_ray.y, vis), 20, 5);
      drawRadialLabelledPoint(ctx, P, O, PALETTE.emerald, getPointLabel('P(α+β)', m.points2D.P.x, m.points2D.P.y, vis), 22, 6);
      if (state.showStackedTriangles !== false) {
        drawLabelledPoint(ctx, Q, PALETTE.amber, showLabels ? 'Q' : '', 12, -10, 4.5);
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
   3. UNIFIED 3D SCENE VIEW (Extends BaseScene3DView + LabelOverlay3D + 3D Drag)
   ============================================================================ */

export class TrigScene3DView extends BaseScene3DView {
  constructor(THREE, container, visualId) {
    super(THREE, container);
    this.visualId = visualId;
    this.R = 10;

    // Scale base sphere and great circle wire to R = 10 (matching Circle Theorems 3D scale)
    this.sphere.scale.setScalar(this.R);
    this.circleWire.scale.setScalar(this.R);

    this.dynamicGroup = new THREE.Group();
    this.scene.add(this.dynamicGroup);

    // Interactive 3D draggable handle meshes
    const makeHandle = (col) =>
      new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 24, 24),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.25, metalness: 0.15 })
      );

    this.handleP = makeHandle(PALETTE.violet);
    this.handleA = makeHandle(PALETTE.red);
    this.handleB = makeHandle(PALETTE.green);
    this.handleC = makeHandle(PALETTE.violet);
    this.scene.add(this.handleP, this.handleA, this.handleB, this.handleC);

    this.#configureDraggableTargets();
  }

  #configureDraggableTargets() {
    if (this.visualId === 'unit-circle-helix') {
      this.handleA.visible = false;
      this.handleB.visible = false;
      this.handleC.visible = false;
      this.draggableTargets = [
        {
          mesh: this.handleP,
          onDrag: (pt, store) => {
            const ang = normalizeAngle(Math.atan2(pt.z, pt.x));
            store.set({ angleTheta: ang });
          },
        },
      ];
    } else if (this.visualId === 'law-of-sines') {
      this.handleP.visible = false;
      this.draggableTargets = [
        {
          mesh: this.handleA,
          onDrag: (pt, store) => store.set({ angleA: normalizeAngle(Math.atan2(pt.z, pt.x)) }),
        },
        {
          mesh: this.handleB,
          onDrag: (pt, store) => store.set({ angleB: normalizeAngle(Math.atan2(pt.z, pt.x)) }),
        },
        {
          mesh: this.handleC,
          onDrag: (pt, store) => store.set({ angleC: normalizeAngle(Math.atan2(pt.z, pt.x)) }),
        },
      ];
    } else if (this.visualId === 'law-of-cosines') {
      this.handleA.visible = false;
      this.handleC.visible = false;
      this.handleP.visible = false;
      this.draggableTargets = [
        {
          mesh: this.handleB,
          onDrag: (pt, store) => {
            const ang = clamp(Math.atan2(Math.abs(pt.z), pt.x), 0.1, Math.PI - 0.1);
            store.set({ angleC: ang });
          },
        },
      ];
    } else {
      // angle-sum-identities
      this.handleB.visible = false;
      this.handleC.visible = false;
      this.draggableTargets = [
        {
          mesh: this.handleA,
          onDrag: (pt, store) => store.set({ angleAlpha: normalizeAngle(Math.atan2(pt.z, pt.x)) }),
        },
        {
          mesh: this.handleP,
          onDrag: (pt, store) => {
            const total = normalizeAngle(Math.atan2(pt.z, pt.x));
            const alpha = store.get().angleAlpha || 0;
            store.set({ angleBeta: normalizeAngle(total - alpha) });
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

  render(state) {
    if (!state) return;
    this.R = (state.radius || 175) / 17.5;
    this.sphere.scale.setScalar(this.R);
    this.circleWire.scale.setScalar(this.R);

    this.applyCommonVis(state);
    this.#clearDynamicGroup();

    const THREE = this.THREE;
    const R = this.R;
    const vis3d = state.vis3d || {};
    const showArea = vis3d.area !== false;
    const showAngles = vis3d.angles !== false;
    const labels = [...AXES_3D_LABELS];

    const addSeg = (p1, p2, color, dashed = false) => {
      const geom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const mat = dashed
        ? new THREE.LineDashedMaterial({ color, dashSize: 0.45, gapSize: 0.28 })
        : new THREE.LineBasicMaterial({ color, linewidth: 2.4 });
      const line = new THREE.Line(geom, mat);
      if (dashed) line.computeLineDistances();
      this.dynamicGroup.add(line);
    };

    if (this.visualId === 'unit-circle-helix') {
      const m = computeUnitCircleHelix(state.angleTheta, R, state.helixPitch);
      const O = new THREE.Vector3(0, 0, 0);
      const P_eq = new THREE.Vector3(R * m.cos, 0, R * m.sin);
      const projX = new THREE.Vector3(R * m.cos, 0, 0);

      this.handleP.position.copy(P_eq);

      // 3D Cylindrical Helix Curve r(t) = (R cos t, y(t), R sin t)
      const helixPts = [];
      const cosWallPts = [];
      const sinWallPts = [];
      const wallDist = R * 1.35;
      for (let i = 0; i <= 140; i++) {
        const t = (i / 140) * TAU;
        const yH = R * (state.helixPitch || 0.35) * (t - Math.PI);
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
      }

      const yNow = R * (state.helixPitch || 0.35) * (m.theta - Math.PI);
      const P_helix = new THREE.Vector3(R * m.cos, yNow, R * m.sin);
      addSeg(O, P_eq, PALETTE.indigo);
      addSeg(O, projX, PALETTE.amber);
      addSeg(projX, P_eq, PALETTE.emerald);
      addSeg(P_eq, P_helix, PALETTE.violet, true);

      if (showArea) {
        const triGeom = new THREE.BufferGeometry().setFromPoints([O, projX, P_eq]);
        triGeom.setIndex([0, 1, 2]);
        this.dynamicGroup.add(
          new THREE.Mesh(
            triGeom,
            new THREE.MeshBasicMaterial({ color: PALETTE.teal, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
          )
        );
      }

      labels.push(
        { key: 'O', name: 'O', at: { x: 0, y: 0.4, z: 0 }, coords: { x: 0, y: 0, z: 0 }, color: 'color-indigo' },
        { key: 'P', name: 'P(θ)', at: { x: P_eq.x * 1.12, y: 0.4, z: P_eq.z * 1.12 }, coords: { x: P_eq.x, y: 0, z: P_eq.z }, color: 'color-violet' },
        { key: 'H', name: 'Helix(θ)', at: { x: P_helix.x * 1.1, y: P_helix.y + 0.5, z: P_helix.z * 1.1 }, coords: { x: P_helix.x, y: P_helix.y, z: P_helix.z }, color: 'color-teal' },
        { key: 'ang-theta', text: `θ = ${m.thetaDeg.toFixed(1)}°`, at: { x: 2.5 * Math.cos(m.theta / 2), y: 0.3, z: 2.5 * Math.sin(m.theta / 2) }, color: 'color-amber', isAngle: true }
      );
    } else if (this.visualId === 'law-of-sines') {
      const m = computeLawOfSines(state.angleA, state.angleB, state.angleC, R);
      const A = new THREE.Vector3(m.vertices2D.A.x, 0, m.vertices2D.A.y);
      const B = new THREE.Vector3(m.vertices2D.B.x, 0, m.vertices2D.B.y);
      const C = new THREE.Vector3(m.vertices2D.C.x, 0, m.vertices2D.C.y);
      const Ap = new THREE.Vector3(m.vertices2D.antipodeA.x, 0, m.vertices2D.antipodeA.y);
      const Hc = new THREE.Vector3(m.vertices2D.footHc.x, 0, m.vertices2D.footHc.y);

      this.handleA.position.copy(A);
      this.handleB.position.copy(B);
      this.handleC.position.copy(C);

      addSeg(B, C, PALETTE.red);
      addSeg(A, C, PALETTE.green);
      addSeg(A, B, PALETTE.violet);

      if (state.showCircumcircleDiameter !== false) {
        addSeg(B, Ap, PALETTE.amber, true);
        addSeg(Ap, C, PALETTE.amber, true);
      }
      if (state.showAltitude !== false) {
        addSeg(C, Hc, PALETTE.teal, true);
      }

      if (showArea) {
        const triGeom = new THREE.BufferGeometry().setFromPoints([A, B, C]);
        triGeom.setIndex([0, 1, 2]);
        this.dynamicGroup.add(
          new THREE.Mesh(
            triGeom,
            new THREE.MeshBasicMaterial({ color: PALETTE.sky, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
          )
        );
      }

      labels.push(
        { key: 'A', name: 'A', at: { x: A.x * 1.12, y: 0.4, z: A.z * 1.12 }, coords: { x: A.x, y: 0, z: A.z }, color: 'color-red' },
        { key: 'B', name: 'B', at: { x: B.x * 1.12, y: 0.4, z: B.z * 1.12 }, coords: { x: B.x, y: 0, z: B.z }, color: 'color-green' },
        { key: 'C', name: 'C', at: { x: C.x * 1.12, y: 0.4, z: C.z * 1.12 }, coords: { x: C.x, y: 0, z: C.z }, color: 'color-violet' },
        { key: 'inv-2R', text: `a/sin A = 2R = ${m.diameter2R.toFixed(2)}`, at: { x: 0, y: 1.4, z: 0 }, color: 'color-amber', isAngle: true }
      );
    } else if (this.visualId === 'law-of-cosines') {
      const m = computeLawOfCosines(state.sideA, state.sideB, state.angleC);
      const s = R / Math.max(m.a, m.b, m.c, 10);
      const C = new THREE.Vector3(0, 0, 0);
      const A = new THREE.Vector3(m.b * s, 0, 0);
      const B = new THREE.Vector3(m.vertices2D.B.x * s, 0, m.vertices2D.B.y * s);
      const D = new THREE.Vector3(m.vertices2D.D.x * s, 0, 0);

      this.handleB.position.copy(B);

      addSeg(C, A, PALETTE.emerald);
      addSeg(C, B, PALETTE.sky);
      addSeg(A, B, PALETTE.rose);
      if (state.showProjection !== false) {
        addSeg(B, D, PALETTE.amber, true);
      }

      if (showArea) {
        const triGeom = new THREE.BufferGeometry().setFromPoints([C, A, B]);
        triGeom.setIndex([0, 1, 2]);
        this.dynamicGroup.add(
          new THREE.Mesh(
            triGeom,
            new THREE.MeshBasicMaterial({ color: PALETTE.teal, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
          )
        );
      }

      labels.push(
        { key: 'C', name: 'C', at: { x: -0.8, y: 0.4, z: -0.8 }, coords: { x: 0, y: 0, z: 0 }, color: 'color-rose' },
        { key: 'A', name: 'A', at: { x: A.x + 0.8, y: 0.4, z: 0 }, coords: { x: A.x, y: 0, z: 0 }, color: 'color-emerald' },
        { key: 'B', name: 'B', at: { x: B.x, y: 0.5, z: B.z + 0.8 }, coords: { x: B.x, y: 0, z: B.z }, color: 'color-sky' },
        { key: 'D', name: 'D', at: { x: D.x, y: 0.4, z: -0.8 }, coords: { x: D.x, y: 0, z: 0 }, color: 'color-amber' },
        { key: 'ang-C', text: `∠C = ${m.angleCDeg.toFixed(1)}°`, at: { x: 1.8, y: 0.5, z: 1.2 }, color: 'color-rose', isAngle: true }
      );
    } else {
      // angle-sum-identities
      const m = computeAngleSumIdentities(state.angleAlpha, state.angleBeta, R);
      const O = new THREE.Vector3(0, 0, 0);
      const Aray = new THREE.Vector3(m.points2D.A_ray.x, 0, m.points2D.A_ray.y);
      const P = new THREE.Vector3(m.points2D.P.x, 0, m.points2D.P.y);
      const Pdiff = new THREE.Vector3(m.points2D.P_diff.x, 0, m.points2D.P_diff.y);
      const Q = new THREE.Vector3(m.points2D.Q.x, 0, m.points2D.Q.y);
      const M = new THREE.Vector3(m.points2D.M.x, 0, 0);

      this.handleA.position.copy(Aray);
      this.handleP.position.copy(P);

      addSeg(O, Aray, PALETTE.sky);
      addSeg(O, P, PALETTE.emerald);
      addSeg(Q, P, PALETTE.violet);
      addSeg(Q, M, PALETTE.amber, true);
      if (state.showDifferenceRay !== false) {
        addSeg(O, Pdiff, PALETTE.rose, true);
      }

      if (showArea) {
        const g1 = new THREE.BufferGeometry().setFromPoints([O, M, Q]);
        g1.setIndex([0, 1, 2]);
        const g2 = new THREE.BufferGeometry().setFromPoints([O, Q, P]);
        g2.setIndex([0, 1, 2]);
        this.dynamicGroup.add(
          new THREE.Mesh(g1, new THREE.MeshBasicMaterial({ color: PALETTE.sky, transparent: true, opacity: 0.18, side: THREE.DoubleSide })),
          new THREE.Mesh(g2, new THREE.MeshBasicMaterial({ color: PALETTE.violet, transparent: true, opacity: 0.2, side: THREE.DoubleSide }))
        );
      }

      labels.push(
        { key: 'O', name: 'O', at: { x: 0, y: 0.4, z: 0 }, coords: { x: 0, y: 0, z: 0 }, color: 'color-indigo' },
        { key: 'A', name: 'A(α)', at: { x: Aray.x * 1.12, y: 0.4, z: Aray.z * 1.12 }, coords: { x: Aray.x, y: 0, z: Aray.z }, color: 'color-sky' },
        { key: 'P', name: 'P(α+β)', at: { x: P.x * 1.12, y: 0.4, z: P.z * 1.12 }, coords: { x: P.x, y: 0, z: P.z }, color: 'color-emerald' },
        { key: 'Q', name: 'Q', at: { x: Q.x, y: 0.5, z: Q.z }, coords: { x: Q.x, y: 0, z: Q.z }, color: 'color-amber' }
      );
    }

    this.currentLabels = labels;
    this.overlay.render(this.currentLabels, vis3d);
  }
}

/* ============================================================================
   4. TOKENIZED LIVE MATH DERIVATIONS VIEW (Strict PALETTE Colour Grammar)
   ============================================================================ */

const tag = (color, text) => `<span class="color-${color} font-bold">${text}</span>`;

export class TrigDerivationsView {
  constructor(container, visualId) {
    this.container = container;
    this.visualId = visualId;
  }

  render(state) {
    if (!this.container) return;
    let steps = [];

    if (this.visualId === 'unit-circle-helix') {
      const m = computeUnitCircleHelix(state.angleTheta, 1.0, state.helixPitch);
      steps = [
        {
          id: 'uch-step-1',
          num: '1',
          title: 'Quotient Group Angle & Circular Coordinates',
          body: `Angle ${tag('amber', `θ = ${m.thetaDeg.toFixed(1)}°`)} (${tag('sky', `${m.theta.toFixed(3)} rad`)}) in ${tag('teal', `Quadrant Q${m.quadrant}`)} maps bijectively onto ${tag('violet', `P = (${m.cos.toFixed(3)}, ${m.sin.toFixed(3)})`)}.`,
        },
        {
          id: 'uch-step-2',
          num: '2',
          title: 'Primary Pythagorean Invariant (cos²θ + sin²θ = 1)',
          body: `Orthogonal legs ${tag('amber', `cos²θ = ${(m.cos * m.cos).toFixed(4)}`)} + ${tag('emerald', `sin²θ = ${(m.sin * m.sin).toFixed(4)}`)} = ${tag('teal', m.invariants.pythagoreanPrimary.toFixed(6))}.`,
        },
        {
          id: 'uch-step-3',
          num: '3',
          title: 'Exterior Tangent, Secant & Cosecant Duality',
          body: `At ${tag('violet', 'P')}, tangent ${tag('rose', `tan θ = ${m.tan.toFixed(3)}`)} and secant ${tag('violet', `sec θ = ${m.sec.toFixed(3)}`)} satisfy ${tag('teal', `1 + tan²θ = sec²θ`)} (residual ${tag('emerald', Math.abs(m.invariants.pythagoreanTanSec).toExponential(2))}).`,
        },
        {
          id: 'uch-step-4',
          num: '4',
          title: '3D Cylindrical Helix & Reflex Perigon (360° − θ)',
          body: `Helix ${tag('violet', `r(θ) = (R cos θ, kθ, R sin θ)`)} projects onto orthogonal wave walls; conjugate reflex angle ${tag('lavender', `θ* = ${(360 - m.thetaDeg).toFixed(1)}°`)} completes ${tag('lavender', '360.0°')}.`,
        },
      ];
    } else if (this.visualId === 'law-of-sines') {
      const m = computeLawOfSines(state.angleA, state.angleB, state.angleC, 10);
      steps = [
        {
          id: 'los-step-1',
          num: '1',
          title: 'Altitude Projection Bridge (hc = b sin A = a sin B)',
          body: `Idempotent projection of ${tag('violet', 'C')} onto ${tag('violet', 'AB')} yields ${tag('teal', `hc = ${m.altitudeHc.toFixed(3)}`)}, proving ${tag('red', `a / sin A = ${m.ratios.ratioA.toFixed(3)}`)} = ${tag('green', `b / sin B = ${m.ratios.ratioB.toFixed(3)}`)}.`,
        },
        {
          id: 'los-step-2',
          num: '2',
          title: "Thales Antipodal Diameter Bridge (a / sin A = 2R)",
          body: `Drawing circumdiameter ${tag('amber', "A'B = 2R")} creates right angle ${tag('amber', "∠A'CB = 90°")}, giving ${tag('red', `a / sin A`)} = ${tag('amber', `2R = ${m.diameter2R.toFixed(3)}`)}.`,
        },
        {
          id: 'los-step-3',
          num: '3',
          title: 'Three-Way Circumcircle Ratio Equality',
          body: `${tag('red', `a/sin A = ${m.ratios.ratioA.toFixed(2)}`)} | ${tag('green', `b/sin B = ${m.ratios.ratioB.toFixed(2)}`)} | ${tag('violet', `c/sin C = ${m.ratios.ratioC.toFixed(2)}`)} = ${tag('amber', `2R = ${m.diameter2R.toFixed(2)}`)}.`,
        },
        {
          id: 'los-step-4',
          num: '4',
          title: 'Interior Sum (180°) & Reflex Sum (900°)',
          body: `Interior sum ${tag('emerald', `∠A + ∠B + ∠C = ${m.interiorAngles.sumDeg.toFixed(1)}°`)}; conjugate reflex sum ${tag('lavender', `A* + B* + C* = ${(1080 - m.interiorAngles.sumDeg).toFixed(1)}°`)}.`,
        },
      ];
    } else if (this.visualId === 'law-of-cosines') {
      const m = computeLawOfCosines(state.sideA, state.sideB, state.angleC);
      steps = [
        {
          id: 'loc-step-1',
          num: '1',
          title: 'Idempotent Orthogonal Decomposition (P∥ + P⊥ = I)',
          body: `Projecting ${tag('sky', 'B')} onto ${tag('emerald', 'AC')} gives foot ${tag('amber', `D = (${m.projection.pProj.toFixed(2)}, 0)`)} and altitude ${tag('amber', `h = a sin C = ${m.projection.hAlt.toFixed(2)}`)}.`,
        },
        {
          id: 'loc-step-2',
          num: '2',
          title: 'Right-Triangle Expansion in △ADB',
          body: `${tag('rose', `c² = ${m.squares.c2.toFixed(2)}`)} = ${tag('amber', `(a sin C)²`)} + ${tag('emerald', `(b − a cos C)²`)} = ${tag('sky', `a² (${m.squares.a2.toFixed(1)})`)} + ${tag('emerald', `b² (${m.squares.b2.toFixed(1)})`)} − ${tag('amber', `2ab cos C (${m.squares.interaction2abCosC.toFixed(1)})`)}.`,
        },
        {
          id: 'loc-step-3',
          num: '3',
          title: '4-Corner Mixed Partial Quotient (1 − 2 − 3 + 4)',
          body: `Evaluating ${tag('teal', '[f(a,b) − f(a,0) − f(0,b) + f(0,0)] / (ab)')} isolates ${tag('amber', `∂²(c²)/(∂a∂b) = −2 cos C = ${m.mixedPartialCoeff.toFixed(4)}`)}.`,
        },
        {
          id: 'loc-step-4',
          num: '4',
          title: 'Regime Classification (Acute / Right / Obtuse)',
          body: `At ${tag('rose', `∠C = ${m.angleCDeg.toFixed(1)}°`)}, regime is ${tag('teal', m.regime.toUpperCase())} with residual ${tag('emerald', m.invariants.cosineLawResidual.toExponential(2))}.`,
        },
      ];
    } else {
      const m = computeAngleSumIdentities(state.angleAlpha, state.angleBeta, 1.0);
      steps = [
        {
          id: 'asi-step-1',
          num: '1',
          title: 'SO(2) Rotation Matrix Group Homomorphism',
          body: `Composing ${tag('sky', `R(α = ${m.alphaDeg.toFixed(1)}°)`)} and ${tag('violet', `R(β = ${m.betaDeg.toFixed(1)}°)`)} yields ${tag('emerald', `R(α+β = ${m.sumAngleDeg.toFixed(1)}°)`)}.`,
        },
        {
          id: 'asi-step-2',
          num: '2',
          title: 'Cosine Addition Formula (cos(α + β))',
          body: `${tag('amber', `cos α cos β (${m.trig.cosACosB.toFixed(3)})`)} − ${tag('rose', `sin α sin β (${m.trig.sinASinB.toFixed(3)})`)} = ${tag('emerald', `cos(α+β) = ${m.trig.cosSum.toFixed(4)}`)}.`,
        },
        {
          id: 'asi-step-3',
          num: '3',
          title: 'Sine Addition Formula (sin(α + β))',
          body: `${tag('sky', `sin α cos β (${m.trig.sinACosB.toFixed(3)})`)} + ${tag('violet', `cos α sin β (${m.trig.cosASinB.toFixed(3)})`)} = ${tag('emerald', `sin(α+β) = ${m.trig.sinSum.toFixed(4)}`)}.`,
        },
        {
          id: 'asi-step-4',
          num: '4',
          title: 'Inverse Rotation & Difference Identities (α − β)',
          body: `Replacing ${tag('violet', 'β → −β')} gives ${tag('rose', `cos(α−β) = ${m.trig.cosDiff.toFixed(4)}`)} and ${tag('rose', `sin(α−β) = ${m.trig.sinDiff.toFixed(4)}`)}.`,
        },
      ];
    }

    this.container.innerHTML = steps
      .map(
        (s) => `
      <div class="derivation-step" id="${s.id}" style="padding:0.65rem 0.75rem; margin-bottom:0.5rem; border-radius:0.5rem; background:rgba(15,23,42,0.65); border:1px solid rgba(148,163,184,0.16);">
        <div style="font-size:0.78rem; font-weight:700; color:#38bdf8; margin-bottom:0.25rem;">Step ${s.num}: ${s.title}</div>
        <div style="font-size:0.8rem; line-height:1.45; color:#e2e8f0;">${s.body}</div>
      </div>`
      )
      .join('');
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
  });

  // Panels (compatible with WorkspaceDockManager)
  const controlsPanelEl = document.querySelector('.ui-panel[id$="-panel"]:not(#derivations-panel):not(#toolbar-2d-panel):not(#toolbar-3d-panel)');
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

  // Snapshot Exports
  document.getElementById('btn-export-png')?.addEventListener('click', () => view2d.exportPNG());
  document.getElementById('btn-export-svg')?.addEventListener('click', () => view2d.exportSVG());

  // Bind visual-specific sliders & checkboxes
  bindVisualSpecificControls(store, visualId, view2d);

  // Subscribe 2D, 3D, Telemetry, and Derivations
  const update = (state) => {
    view2d.render(state);
    scene3d.render(state);
    derivations.render(state);
    updateTelemetryDOM(state, visualId);
  };

  store.subscribe(update);
  update(store.get());

  return { store, view2d, scene3d };
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
  const bindCheck = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', (e) => store.set({ [key]: e.target.checked }));
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

  bindCheck('toggle-projections', 'showProjections');
  bindCheck('toggle-tan-sec', 'showTanSec');
  bindCheck('toggle-cot-csc', 'showCotCsc');
  bindCheck('toggle-helix-walls', 'showHelixWalls');
  bindCheck('toggle-diameter', 'showCircumcircleDiameter');
  bindCheck('toggle-altitude', 'showAltitude');
  bindCheck('toggle-radii', 'showRadii');
  bindCheck('toggle-projection-loc', 'showProjection');
  bindCheck('toggle-interaction-rect', 'showInteractionRect');
  bindCheck('toggle-diff-ray', 'showDifferenceRay');
  bindCheck('toggle-stacked-tri', 'showStackedTriangles');

  // 2D Canvas Interactive Pointer Dragging + Wheel Zoom
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

  let activeDrag = null;
  let panOrigin = { x: 0, y: 0 };

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const st = store.get();
    const { cx, cy, r } = view2d.getCenterAndRadius(st);

    if (isNearCircumference(x, y, cx, cy, r, 14) && e.shiftKey) {
      activeDrag = 'radius';
    } else {
      activeDrag = 'point';
    }
    if (st.playing) store.set({ playing: false });
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {}
    updateFromPointer(x, y, cx, cy);
  });

  const updateFromPointer = (x, y, cx, cy) => {
    const ang = pointerToAngle(x - cx, cy - y);
    const st = store.get();
    if (visualId === 'unit-circle-helix') {
      store.set({ angleTheta: ang });
    } else if (visualId === 'law-of-sines') {
      const candidates = [
        { k: 'angleA', d: Math.abs(Math.atan2(Math.sin(ang - st.angleA), Math.cos(ang - st.angleA))) },
        { k: 'angleB', d: Math.abs(Math.atan2(Math.sin(ang - st.angleB), Math.cos(ang - st.angleB))) },
        { k: 'angleC', d: Math.abs(Math.atan2(Math.sin(ang - st.angleC), Math.cos(ang - st.angleC))) },
      ].sort((a, b) => a.d - b.d);
      store.set({ [candidates[0].k]: ang });
    } else if (visualId === 'law-of-cosines') {
      store.set({ angleC: clamp(ang > Math.PI ? TAU - ang : ang, 0.1, Math.PI - 0.1) });
    } else {
      store.set({ angleBeta: normalizeAngle(ang - (st.angleAlpha || 0)) });
    }
  };

  canvas.addEventListener('pointermove', (e) => {
    if (!activeDrag) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { cx, cy } = view2d.getCenterAndRadius(store.get());
    updateFromPointer(x, y, cx, cy);
  });

  const stop = (e) => {
    if (activeDrag) {
      activeDrag = null;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function updateTelemetryDOM(state, visualId) {
  const angUnit = state.angleUnit || 'deg';
  const fmtAng = (deg) => UnitSystemConverter.formatAngle(deg, angUnit);

  setText('label-radius', `${state.radius || 175}px`);

  if (visualId === 'unit-circle-helix') {
    const m = computeUnitCircleHelix(state.angleTheta, 1.0, state.helixPitch);
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

    setText('val-3d-r', ((state.radius || 175) / 17.5).toFixed(2));
    setText('val-3d-px', m.cos.toFixed(3));
    setText('val-3d-pz', m.sin.toFixed(3));
    setText('val-3d-py', m.points3D.point3D.z.toFixed(3));
    setText('val-3d-pythag', m.invariants.pythagoreanPrimary.toFixed(6));
  } else if (visualId === 'law-of-sines') {
    const m = computeLawOfSines(state.angleA, state.angleB, state.angleC, 10);
    setText('label-angle-a', fmtAng(toDegrees(state.angleA)));
    setText('label-angle-b', fmtAng(toDegrees(state.angleB)));
    setText('label-angle-c', fmtAng(toDegrees(state.angleC)));
    setText('tel-ang-a', fmtAng(m.interiorAngles.degA));
    setText('tel-ang-b', fmtAng(m.interiorAngles.degB));
    setText('tel-ang-c', fmtAng(m.interiorAngles.degC));
    setText('tel-ratio-a', m.ratios.ratioA.toFixed(3));
    setText('tel-ratio-b', m.ratios.ratioB.toFixed(3));
    setText('tel-ratio-c', m.ratios.ratioC.toFixed(3));
    setText('tel-2r', m.diameter2R.toFixed(3));
    setText('tel-hc', m.altitudeHc.toFixed(3));

    setText('val-3d-2r', m.diameter2R.toFixed(3));
    setText('val-3d-ra', m.ratios.ratioA.toFixed(3));
    setText('val-3d-rb', m.ratios.ratioB.toFixed(3));
    setText('val-3d-rc', m.ratios.ratioC.toFixed(3));
    setText('val-3d-area', m.area.toFixed(2));
  } else if (visualId === 'law-of-cosines') {
    const m = computeLawOfCosines(state.sideA, state.sideB, state.angleC);
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

    setText('val-3d-c2', m.squares.c2.toFixed(2));
    setText('val-3d-proj', m.projection.pProj.toFixed(3));
    setText('val-3d-alt', m.projection.hAlt.toFixed(3));
    setText('val-3d-mixed', m.mixedPartialCoeff.toFixed(4));
  } else {
    const m = computeAngleSumIdentities(state.angleAlpha, state.angleBeta, 1.0);
    setText('label-alpha', fmtAng(m.alphaDeg));
    setText('label-beta', fmtAng(m.betaDeg));
    setText('tel-alpha', fmtAng(m.alphaDeg));
    setText('tel-beta', fmtAng(m.betaDeg));
    setText('tel-sum-ang', fmtAng(m.sumAngleDeg));
    setText('tel-cos-sum', m.trig.cosSum.toFixed(4));
    setText('tel-sin-sum', m.trig.sinSum.toFixed(4));
    setText('tel-cos-diff', m.trig.cosDiff.toFixed(4));
    setText('tel-sin-diff', m.trig.sinDiff.toFixed(4));

    setText('val-3d-r00', m.matrices.R_comp[0].toFixed(4));
    setText('val-3d-r10', m.matrices.R_comp[2].toFixed(4));
    setText('val-3d-det', (m.matrices.R_comp[0] * m.matrices.R_comp[3] - m.matrices.R_comp[1] * m.matrices.R_comp[2]).toFixed(6));
  }
}
