/**
 * @file trig-core.js
 * Self-Contained Interactive 2D Canvas + 3D WebGL Engine & UI Controller for the Trigonometry Suite.
 */

import {
  TAU,
  clamp,
  toRadians,
  toDegrees,
  wrapAngleRad,
  computeUnitCircleHelix,
  computeLawOfSines,
  computeLawOfCosines,
  computeAngleSumIdentities,
} from './trig-math.js';
import { ARManager } from '../../../js/ar-manager.js';

export const TRIG_PALETTE = {
  bg: '#0b1120',
  grid: 'rgba(148, 163, 184, 0.14)',
  axis: 'rgba(148, 163, 184, 0.42)',
  circle: '#38bdf8',
  cyan: '#38bdf8',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#a855f7',
  indigo: '#6366f1',
  text: '#f8fafc',
  muted: '#94a3b8',
};

export class TrigStore {
  constructor(initialState = {}) {
    this.state = {
      viewMode: 'split', // 'split' | '2d' | '3d'
      splitDirection: 'horizontal', // 'horizontal' | 'vertical'
      splitRatio: 0.5,
      playing: false,
      showGrid: true,
      showSecondary: true,
      showProof: true,
      ...initialState,
    };
    this.listeners = new Set();
  }

  get() {
    return this.state;
  }

  set(patch) {
    const next = typeof patch === 'function' ? patch(this.state) : patch;
    this.state = { ...this.state, ...next };
    this.listeners.forEach((fn) => fn(this.state));
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

/* ============================================================================
   2D Canvas Coordinate & Drawing Helpers
   ============================================================================ */

export function setupCanvas2D(canvas) {
  const rect = canvas.parentElement?.getBoundingClientRect?.() || { width: 600, height: 500 };
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const w = Math.max(100, rect.width);
  const h = Math.max(100, rect.height);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h, cx: w / 2, cy: h / 2, scale: Math.min(w, h) * 0.34 };
}

export function drawGridAndAxes2D(ctx, w, h, cx, cy, scale, showGrid = true) {
  if (showGrid) {
    ctx.strokeStyle = TRIG_PALETTE.grid;
    ctx.lineWidth = 1;
    const step = scale / 2;
    if (step > 12) {
      ctx.beginPath();
      for (let x = cx % step; x < w; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = cy % step; y < h; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
    }
  }

  ctx.strokeStyle = TRIG_PALETTE.axis;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(w, cy);
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, h);
  ctx.stroke();
}

export function toScreen(pt, cx, cy, scale) {
  return { x: cx + pt.x * scale, y: cy - pt.y * scale };
}

export function drawSegment2D(ctx, p1, p2, color, width = 2.5, dashed = false) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dashed) ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.restore();
}

export function drawPoint2D(ctx, pt, label, color = '#f8fafc', radius = 5.5, offset = { x: 10, y: -10 }) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, radius, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (label) {
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = color;
    ctx.fillText(label, pt.x + offset.x, pt.y + offset.y);
  }
  ctx.restore();
}

/* ============================================================================
   Visual 1 Renderer: Unit Circle, Six Trig Functions & 3D Helix Waves
   ============================================================================ */

export function renderUnitCircle2D(canvas, state) {
  const { ctx, w, h, cx, cy, scale } = setupCanvas2D(canvas);
  drawGridAndAxes2D(ctx, w, h, cx, cy, scale, state.showGrid);

  const model = computeUnitCircleHelix(state.theta, 1.0);
  const O = toScreen(model.points2D.O, cx, cy, scale);
  const P = toScreen(model.points2D.P, cx, cy, scale);
  const projX = toScreen(model.points2D.projX, cx, cy, scale);
  const projY = toScreen(model.points2D.projY, cx, cy, scale);

  // Unit circle
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, scale, 0, TAU);
  ctx.stroke();

  // Angle sector wedge
  ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, scale * 0.25, 0, -model.theta, true);
  ctx.closePath();
  ctx.fill();

  // Secondary reciprocal/tangent segments (tan, cot, sec, csc)
  if (state.showSecondary) {
    const secPt = toScreen(model.points2D.secPoint, cx, cy, scale);
    const cscPt = toScreen(model.points2D.cscPoint, cx, cy, scale);
    drawSegment2D(ctx, O, secPt, TRIG_PALETTE.rose, 2, true);
    drawSegment2D(ctx, O, cscPt, TRIG_PALETTE.indigo, 2, true);
    drawSegment2D(ctx, secPt, cscPt, TRIG_PALETTE.amber, 2);
    drawPoint2D(ctx, secPt, 'sec θ', TRIG_PALETTE.rose, 4, { x: 4, y: 16 });
    drawPoint2D(ctx, cscPt, 'csc θ', TRIG_PALETTE.indigo, 4, { x: 8, y: -4 });
  }

  // Cosine (horizontal cyan) & Sine (vertical emerald)
  drawSegment2D(ctx, O, projX, TRIG_PALETTE.cyan, 3.5);
  drawSegment2D(ctx, projX, P, TRIG_PALETTE.emerald, 3.5);
  drawSegment2D(ctx, O, P, '#f8fafc', 2.5);
  drawSegment2D(ctx, O, projY, TRIG_PALETTE.emerald, 1.5, true);

  drawPoint2D(ctx, O, 'O', '#94a3b8', 4, { x: -16, y: 16 });
  drawPoint2D(ctx, projX, 'cos θ', TRIG_PALETTE.cyan, 4.5, { x: -14, y: 18 });
  drawPoint2D(ctx, P, `P (${model.cos.toFixed(2)}, ${model.sin.toFixed(2)})`, '#f8fafc', 6.5, { x: 10, y: -10 });
}

/* ============================================================================
   Visual 2 Renderer: Law of Sines & Circumcircle Invariant (a/sin A = 2R)
   ============================================================================ */

export function renderLawOfSines2D(canvas, state) {
  const { ctx, w, h, cx, cy, scale } = setupCanvas2D(canvas);
  drawGridAndAxes2D(ctx, w, h, cx, cy, scale, state.showGrid);

  const model = computeLawOfSines(state.angleA, state.angleB, state.angleC, 1.0);
  const O = toScreen({ x: 0, y: 0 }, cx, cy, scale);
  const A = toScreen(model.vertices2D.A, cx, cy, scale);
  const B = toScreen(model.vertices2D.B, cx, cy, scale);
  const C = toScreen(model.vertices2D.C, cx, cy, scale);
  const antipodeA = toScreen(model.vertices2D.antipodeA, cx, cy, scale);
  const footHc = toScreen(model.vertices2D.footHc, cx, cy, scale);

  // Circumscribed circle of radius R
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, scale, 0, TAU);
  ctx.stroke();

  // Triangle fill
  ctx.fillStyle = 'rgba(99, 102, 241, 0.14)';
  ctx.beginPath();
  ctx.moveTo(A.x, A.y);
  ctx.lineTo(B.x, B.y);
  ctx.lineTo(C.x, C.y);
  ctx.closePath();
  ctx.fill();

  // Circumdiameter A'B (2R proof bridge) and altitude hc
  if (state.showProof) {
    drawSegment2D(ctx, B, antipodeA, TRIG_PALETTE.amber, 2, true);
    drawSegment2D(ctx, antipodeA, C, 'rgba(245, 158, 11, 0.5)', 1.5, true);
    drawPoint2D(ctx, antipodeA, "A' (2R)", TRIG_PALETTE.amber, 4.5, { x: 8, y: 14 });
  }
  if (state.showSecondary) {
    drawSegment2D(ctx, C, footHc, TRIG_PALETTE.violet, 2, true);
    drawPoint2D(ctx, footHc, 'hc', TRIG_PALETTE.violet, 4, { x: 6, y: 14 });
  }

  // Triangle sides a (BC), b (AC), c (AB)
  drawSegment2D(ctx, B, C, TRIG_PALETTE.cyan, 3);
  drawSegment2D(ctx, A, C, TRIG_PALETTE.emerald, 3);
  drawSegment2D(ctx, A, B, TRIG_PALETTE.rose, 3);

  drawPoint2D(ctx, O, 'O', '#94a3b8', 4, { x: 6, y: 14 });
  drawPoint2D(ctx, A, `A (${model.interiorAngles.degA.toFixed(0)}°)`, TRIG_PALETTE.cyan, 6, { x: 8, y: -8 });
  drawPoint2D(ctx, B, `B (${model.interiorAngles.degB.toFixed(0)}°)`, TRIG_PALETTE.emerald, 6, { x: -45, y: -8 });
  drawPoint2D(ctx, C, `C (${model.interiorAngles.degC.toFixed(0)}°)`, TRIG_PALETTE.rose, 6, { x: 8, y: 16 });
}

/* ============================================================================
   Visual 3 Renderer: Law of Cosines & Generalized Pythagorean Projection
   ============================================================================ */

export function renderLawOfCosines2D(canvas, state) {
  const { ctx, w, h } = setupCanvas2D(canvas);
  const model = computeLawOfCosines(state.sideA, state.sideB, state.angleC);
  const maxDim = Math.max(model.a, model.b, model.c, 10);
  const scale = (Math.min(w, h) * 0.52) / maxDim;
  const cx = w * 0.36;
  const cy = h * 0.62;

  drawGridAndAxes2D(ctx, w, h, cx, cy, scale * 4, state.showGrid);

  const C = toScreen(model.vertices2D.C, cx, cy, scale);
  const A = toScreen(model.vertices2D.A, cx, cy, scale);
  const B = toScreen(model.vertices2D.B, cx, cy, scale);
  const D = toScreen(model.vertices2D.D, cx, cy, scale);

  // Triangle fill
  ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
  ctx.beginPath();
  ctx.moveTo(C.x, C.y);
  ctx.lineTo(A.x, A.y);
  ctx.lineTo(B.x, B.y);
  ctx.closePath();
  ctx.fill();

  // Idempotent projection foot D (a cos C) and altitude h (a sin C)
  if (state.showProof) {
    drawSegment2D(ctx, B, D, TRIG_PALETTE.amber, 2.2, true);
    drawSegment2D(ctx, C, D, TRIG_PALETTE.violet, 3.5);
    drawPoint2D(ctx, D, `D (${model.projection.pProj.toFixed(1)})`, TRIG_PALETTE.amber, 4.5, { x: -18, y: 18 });
  }

  // Sides a (CB), b (CA), c (AB)
  drawSegment2D(ctx, C, B, TRIG_PALETTE.cyan, 3.2);
  drawSegment2D(ctx, C, A, TRIG_PALETTE.emerald, 3.2);
  drawSegment2D(ctx, A, B, TRIG_PALETTE.rose, 3.2);

  drawPoint2D(ctx, C, `C (${model.angleCDeg.toFixed(0)}°)`, TRIG_PALETTE.amber, 6, { x: -42, y: 18 });
  drawPoint2D(ctx, A, `A (b=${model.b.toFixed(1)})`, TRIG_PALETTE.emerald, 6, { x: 8, y: 16 });
  drawPoint2D(ctx, B, `B (a=${model.a.toFixed(1)})`, TRIG_PALETTE.cyan, 6, { x: 8, y: -10 });
}

/* ============================================================================
   Visual 4 Renderer: Angle Sum / Difference & Rotation Matrix Composition
   ============================================================================ */

export function renderAngleSum2D(canvas, state) {
  const { ctx, w, h, cx, cy, scale } = setupCanvas2D(canvas);
  drawGridAndAxes2D(ctx, w, h, cx, cy, scale, state.showGrid);

  const model = computeAngleSumIdentities(state.alpha, state.beta, 1.0);
  const O = toScreen(model.points2D.O, cx, cy, scale);
  const P = toScreen(model.points2D.P, cx, cy, scale);
  const P_diff = toScreen(model.points2D.P_diff, cx, cy, scale);
  const A_ray = toScreen(model.points2D.A_ray, cx, cy, scale);
  const Q = toScreen(model.points2D.Q, cx, cy, scale);
  const M = toScreen(model.points2D.M, cx, cy, scale);
  const N = toScreen(model.points2D.N, cx, cy, scale);
  const S_corner = toScreen(model.points2D.S_corner, cx, cy, scale);

  // Unit circle
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.38)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, scale, 0, TAU);
  ctx.stroke();

  // Stacked right triangles O-M-Q (angle alpha) and O-Q-P (angle beta)
  ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
  ctx.beginPath();
  ctx.moveTo(O.x, O.y);
  ctx.lineTo(M.x, M.y);
  ctx.lineTo(Q.x, Q.y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
  ctx.beginPath();
  ctx.moveTo(O.x, O.y);
  ctx.lineTo(Q.x, Q.y);
  ctx.lineTo(P.x, P.y);
  ctx.closePath();
  ctx.fill();

  if (state.showProof) {
    drawSegment2D(ctx, Q, M, TRIG_PALETTE.cyan, 2, true);
    drawSegment2D(ctx, Q, S_corner, TRIG_PALETTE.amber, 2, true);
    drawSegment2D(ctx, P, S_corner, TRIG_PALETTE.amber, 2, true);
    drawSegment2D(ctx, P, N, TRIG_PALETTE.rose, 2.5);
    drawPoint2D(ctx, Q, 'Q (cos β)', TRIG_PALETTE.emerald, 5, { x: 8, y: -6 });
  }

  if (state.showSecondary) {
    drawSegment2D(ctx, O, P_diff, TRIG_PALETTE.violet, 2.2, true);
    drawPoint2D(ctx, P_diff, 'P(α−β)', TRIG_PALETTE.violet, 5, { x: 8, y: 12 });
  }

  drawSegment2D(ctx, O, A_ray, TRIG_PALETTE.cyan, 2, true);
  drawSegment2D(ctx, O, Q, TRIG_PALETTE.cyan, 3);
  drawSegment2D(ctx, Q, P, TRIG_PALETTE.emerald, 3);
  drawSegment2D(ctx, O, P, TRIG_PALETTE.rose, 3.2);

  drawPoint2D(ctx, O, 'O', '#94a3b8', 4, { x: -16, y: 16 });
  drawPoint2D(ctx, P, `P(α+β = ${model.sumAngleDeg.toFixed(0)}°)`, TRIG_PALETTE.rose, 6.5, { x: 10, y: -10 });
}

/* ============================================================================
   3D WebGL Scene Controller (Three.js) for all 4 Trigonometry Visuals
   ============================================================================ */

export class TrigScene3D {
  constructor(container, mode) {
    this.container = container;
    this.mode = mode;
    this.THREE = globalThis.THREE || (typeof window !== 'undefined' ? window.THREE : null);
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.group = null;
    this.isARActive = false;

    if (this.THREE && container) {
      this.#initThree();
    }
  }

  #initThree() {
    const THREE = this.THREE;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b1120);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.set(24, 18, 26);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio((typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    this.container.appendChild(this.renderer.domElement);

    const amb = new THREE.AmbientLight(0xffffff, 0.85);
    const dir = new THREE.DirectionalLight(0xffffff, 0.75);
    dir.position.set(20, 35, 25);
    this.scene.add(amb, dir);

    this.grid = new THREE.GridHelper(24, 24, 0x38bdf8, 0x1e293b);
    this.grid.position.y = -10;
    this.scene.add(this.grid);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.#bindPointerOrbit();
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => this.resize()).observe(this.container);
    }
    this.resize();
  }

  #bindPointerOrbit() {
    const el = this.renderer?.domElement;
    if (!el || !el.addEventListener) return;
    let dragging = false;
    let prevX = 0;
    let prevY = 0;
    let theta = Math.atan2(24, 26);
    let phi = Math.acos(18 / Math.hypot(24, 18, 26));
    let radius = Math.hypot(24, 18, 26);

    el.addEventListener('pointerdown', (e) => {
      dragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
      el.setPointerCapture?.(e.pointerId);
    });

    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = (e.clientX - prevX) * 0.008;
      const dy = (e.clientY - prevY) * 0.008;
      prevX = e.clientX;
      prevY = e.clientY;
      theta -= dx;
      phi = clamp(phi - dy, 0.15, Math.PI - 0.15);
      this.camera.position.set(
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.cos(theta)
      );
      this.camera.lookAt(0, 0, 0);
      this.renderFrame();
    });

    const stop = () => {
      dragging = false;
    };
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
  }

  setCameraPreset(preset) {
    if (!this.camera) return;
    const map = {
      isometric: [24, 18, 26],
      top: [0, 34, 0.01],
      front: [0, 0, 34],
      side: [34, 0, 0],
    };
    const pos = map[preset] || map.isometric;
    this.camera.position.set(pos[0], pos[1], pos[2]);
    this.camera.lookAt(0, 0, 0);
    this.renderFrame();
  }

  setARMode(active) {
    this.isARActive = Boolean(active);
    if (this.grid) this.grid.visible = !this.isARActive;
    if (this.scene) {
      this.scene.background = this.isARActive ? null : new this.THREE.Color(0x0b1120);
    }
    if (this.renderer) {
      this.renderer.setClearColor(0x000000, this.isARActive ? 0 : 1);
    }
    this.renderFrame();
  }

  resize() {
    if (!this.renderer || !this.camera || !this.container) return;
    const w = this.container.clientWidth || 500;
    const h = this.container.clientHeight || 400;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.renderFrame();
  }

  updateScene(state) {
    if (!this.THREE || !this.group) return;
    const THREE = this.THREE;
    if (this.grid) {
      this.grid.visible = this.isARActive ? false : Boolean(state.showGrid);
    }

    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }

    const R = 8;

    if (this.mode === 'unit-circle-helix') {
      const model = computeUnitCircleHelix(state.theta, R, 0.45);
      // 3D Cylindrical Helix Curve + Cosine (XZ) & Sine (YZ) Orthogonal Wave Projections
      const helixPts = [];
      const cosPts = [];
      const sinPts = [];
      for (let i = 0; i <= 120; i++) {
        const t = (i / 120) * TAU;
        const z = R * 0.45 * (t - Math.PI);
        const x = R * Math.cos(t);
        const y = R * Math.sin(t);
        helixPts.push(new THREE.Vector3(x, y, z));
        cosPts.push(new THREE.Vector3(x, -9.8, z));
        sinPts.push(new THREE.Vector3(-10, y, z));
      }

      this.group.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(helixPts),
          new THREE.LineBasicMaterial({ color: 0xf8fafc })
        ),
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(cosPts),
          new THREE.LineBasicMaterial({ color: 0x38bdf8 })
        ),
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(sinPts),
          new THREE.LineBasicMaterial({ color: 0x10b981 })
        )
      );

      const pt = model.points3D.point3D;
      const pVec = new THREE.Vector3(pt.x, pt.y, pt.z);
      const originZ = new THREE.Vector3(0, 0, pt.z);
      const cosFoot = new THREE.Vector3(pt.x, -9.8, pt.z);
      const sinFoot = new THREE.Vector3(-10, pt.y, pt.z);

      this.group.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([originZ, pVec]),
          new THREE.LineBasicMaterial({ color: 0xf59e0b })
        ),
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([pVec, cosFoot]),
          new THREE.LineBasicMaterial({ color: 0x38bdf8 })
        ),
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([pVec, sinFoot]),
          new THREE.LineBasicMaterial({ color: 0x10b981 })
        )
      );

      const sphereP = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xf8fafc })
      );
      sphereP.position.copy(pVec);
      this.group.add(sphereP);
    } else if (this.mode === 'law-of-sines') {
      const model = computeLawOfSines(state.angleA, state.angleB, state.angleC, R);
      const sphereWire = new THREE.Mesh(
        new THREE.SphereGeometry(R, 28, 20),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.14 })
      );
      this.group.add(sphereWire);

      const A = new THREE.Vector3(model.vertices2D.A.x, model.vertices2D.A.y, 0);
      const B = new THREE.Vector3(model.vertices2D.B.x, model.vertices2D.B.y, 0);
      const C = new THREE.Vector3(model.vertices2D.C.x, model.vertices2D.C.y, 0);
      const antipode = new THREE.Vector3(model.vertices2D.antipodeA.x, model.vertices2D.antipodeA.y, 0);

      this.group.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([A, B, C, A]),
          new THREE.LineBasicMaterial({ color: 0x38bdf8 })
        ),
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([B, antipode, C]),
          new THREE.LineBasicMaterial({ color: 0xf59e0b })
        )
      );
    } else if (this.mode === 'law-of-cosines') {
      const model = computeLawOfCosines(state.sideA, state.sideB, state.angleC);
      const C = new THREE.Vector3(0, 0, 0);
      const A = new THREE.Vector3(model.vertices2D.A.x, 0, 0);
      const B = new THREE.Vector3(model.vertices2D.B.x, model.vertices2D.B.y, 0);
      const D = new THREE.Vector3(model.vertices2D.D.x, 0, 0);

      this.group.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([C, A, B, C]),
          new THREE.LineBasicMaterial({ color: 0x38bdf8 })
        ),
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([B, D]),
          new THREE.LineBasicMaterial({ color: 0xf59e0b })
        )
      );
    } else if (this.mode === 'angle-sum-identities') {
      const model = computeAngleSumIdentities(state.alpha, state.beta, R);
      const O = new THREE.Vector3(0, 0, 0);
      const P = new THREE.Vector3(model.points2D.P.x, model.points2D.P.y, 0);
      const Q = new THREE.Vector3(model.points2D.Q.x, model.points2D.Q.y, 0);
      const M = new THREE.Vector3(model.points2D.M.x, 0, 0);

      this.group.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([O, M, Q, O]),
          new THREE.LineBasicMaterial({ color: 0x38bdf8 })
        ),
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([O, Q, P, O]),
          new THREE.LineBasicMaterial({ color: 0x10b981 })
        )
      );
    }

    this.renderFrame();
  }

  renderFrame() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

/* ============================================================================
   Shared Initializer for Any Trigonometry Suite Visualizer Page
   ============================================================================ */

export function initTrigVisualPage(config) {
  const store = new TrigStore(config.initialState);
  const mainView = document.getElementById('main-view');
  const canvas2D = document.getElementById('canvas-2d');
  const container3D = document.getElementById('canvas-3d-container');
  const scene3D = new TrigScene3D(container3D, config.mode);

  // 1. View Mode & Flip Split Controls
  const btnSplit = document.getElementById('btn-split');
  const btnFlip = document.getElementById('btn-flip-split');
  const btn2D = document.getElementById('btn-2d');
  const btn3D = document.getElementById('btn-3d');

  const syncLayout = (st) => {
    if (!mainView) return;
    mainView.classList.remove('layout-split', 'layout-2d', 'layout-3d', 'horizontal-split', 'vertical-split');
    mainView.classList.add(`layout-${st.viewMode}`);
    mainView.classList.add(st.splitDirection === 'vertical' ? 'vertical-split' : 'horizontal-split');

    btnSplit?.classList.toggle('active', st.viewMode === 'split');
    btn2D?.classList.toggle('active', st.viewMode === '2d');
    btn3D?.classList.toggle('active', st.viewMode === '3d');
    scene3D.resize();
  };

  btnSplit?.addEventListener('click', () => store.set({ viewMode: 'split' }));
  btn2D?.addEventListener('click', () => store.set({ viewMode: '2d' }));
  btn3D?.addEventListener('click', () => store.set({ viewMode: '3d' }));
  btnFlip?.addEventListener('click', () => {
    const curr = store.get().splitDirection;
    store.set({ viewMode: 'split', splitDirection: curr === 'horizontal' ? 'vertical' : 'horizontal' });
  });

  // 2. Camera Presets
  document.querySelectorAll('[data-cam-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-cam-preset]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      scene3D.setCameraPreset(btn.getAttribute('data-cam-preset'));
    });
  });

  // 3. Dock Collapse & Tab Switching
  const dock = document.getElementById('workspace-dock');
  const dockCollapseBtn = document.getElementById('dock-collapse-btn');
  dockCollapseBtn?.addEventListener('click', () => {
    dock?.classList.toggle('is-collapsed');
  });

  document.querySelectorAll('[data-dock-tab]').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      const targetId = tabBtn.getAttribute('data-dock-tab');
      document.querySelectorAll('[data-dock-tab]').forEach((b) => b.classList.toggle('active', b === tabBtn));
      document.querySelectorAll('[data-dock-pane]').forEach((pane) => {
        pane.hidden = pane.getAttribute('data-dock-pane') !== targetId;
      });
    });
  });

  // 4. AR Mode Integration
  const arBtn = document.getElementById('btn-toggle-ar');
  const arPill = document.getElementById('ar-status-pill');
  if (arBtn && scene3D.renderer && scene3D.scene) {
    let preARMode = 'split';
    const arManager = new ARManager({
      renderer: scene3D.renderer,
      scene: scene3D.scene,
      camera: scene3D.camera,
      container: container3D,
      onSessionStart: () => {
        preARMode = store.get().viewMode;
        scene3D.setARMode(true);
        store.set({ viewMode: '3d' });
        arBtn.classList.add('active');
        arBtn.setAttribute('aria-pressed', 'true');
        if (arPill) {
          arPill.textContent = 'ON';
          arPill.classList.add('is-on');
        }
      },
      onSessionEnd: () => {
        scene3D.setARMode(false);
        store.set({ viewMode: preARMode || 'split' });
        arBtn.classList.remove('active');
        arBtn.setAttribute('aria-pressed', 'false');
        if (arPill) {
          arPill.textContent = 'OFF';
          arPill.classList.remove('is-on');
        }
      },
    });
    arBtn.addEventListener('click', () => arManager.toggle());
  }

  // 5. Render Pipeline
  const renderAll = (st) => {
    syncLayout(st);
    if (canvas2D) config.render2D(canvas2D, st);
    scene3D.updateScene(st);
    config.updateUI?.(st);
  };

  store.subscribe(renderAll);
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => renderAll(store.get()));
  }
  config.bindControls?.(store, canvas2D);
  renderAll(store.get());

  return { store, scene3D };
}

