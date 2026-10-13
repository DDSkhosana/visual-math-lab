import { PALETTE, clamp, getSubtendedArcRange3D, getMinorArcRange3D } from './circle-core.js';

export function loadThree() {
  const THREE = window.THREE;
  if (!THREE || !THREE.OrbitControls) {
    throw new Error('Three.js / OrbitControls is not available');
  }
  return THREE;
}

export class NullScene3DView {
  available = false;
  domElement = null;
  render() {}
  resize() {}
  setCameraPreset() {}
  enableInteraction() {}
  dispose() {}
}

/**
 * Controller for Split / 2D / 3D layout, flip split, and resizer bar.
 */
export class ViewModeController {
  constructor(store, { mainView, container2d, container3d, toolbar2d, toolbar3d, buttons, flipButton, resizer, onResize }) {
    this.store = store;
    this.mainView = mainView;
    this.container2d = container2d;
    this.container3d = container3d;
    this.toolbar2d = toolbar2d;
    this.toolbar3d = toolbar3d;
    this.buttons = buttons;
    this.flipButton = flipButton;
    this.resizer = resizer;
    this.onResize = onResize;

    for (const [mode, button] of Object.entries(buttons)) {
      button?.addEventListener('click', () => {
        store.set({ viewMode: mode });
      });
    }

    flipButton?.addEventListener('click', () => {
      const cur = store.get().splitDirection || 'horizontal';
      store.set({ splitDirection: cur === 'horizontal' ? 'vertical' : 'horizontal' });
    });

    if (resizer) {
      this.#enableDividerDrag(resizer);
    }

    store.subscribe((state) => this.render(state), ['viewMode', 'splitDirection', 'splitRatio']);
    this.render(store.get());
  }

  render(state) {
    const viewMode = state.viewMode || 'split';
    const splitDirection = state.splitDirection || 'horizontal';
    const splitRatio = state.splitRatio ?? 50;

    const horizontal = splitDirection === 'horizontal';
    this.mainView.className = `view-container layout-${viewMode} ${horizontal ? 'horizontal' : 'vertical'}-split`;

    for (const [mode, button] of Object.entries(this.buttons)) {
      if (!button) continue;
      const isActive = mode === viewMode;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    }

    if (this.flipButton) {
      this.flipButton.style.display = viewMode === 'split' ? '' : 'none';
    }

    const isSplit = viewMode === 'split';
    this.container2d.style.flexBasis = isSplit ? `${splitRatio}%` : '';
    this.container3d.style.flexBasis = isSplit ? `${100 - splitRatio}%` : '';

    if (this.toolbar2d) this.toolbar2d.style.display = viewMode === '3d' ? 'none' : '';
    if (this.toolbar3d) this.toolbar3d.style.display = viewMode === '2d' ? 'none' : '';

    this.onResize?.();
  }

  #enableDividerDrag(resizer) {
    resizer.addEventListener('pointerdown', (event) => {
      try {
        if (resizer.setPointerCapture) resizer.setPointerCapture(event.pointerId);
      } catch (_) {}
      resizer.classList.add('active');

      const move = (e) => {
        const rect = this.mainView.getBoundingClientRect();
        const isRow = !this.mainView.classList.contains('vertical-split');
        const ratio = isRow
          ? ((e.clientX - rect.left) / rect.width) * 100
          : ((e.clientY - rect.top) / rect.height) * 100;
        this.store.set({ splitRatio: clamp(ratio, 20, 80) });
      };

      const end = () => {
        try {
          if (resizer.hasPointerCapture?.(event.pointerId)) resizer.releasePointerCapture(event.pointerId);
        } catch (_) {}
        resizer.classList.remove('active');
        resizer.removeEventListener('pointermove', move);
        resizer.removeEventListener('pointerup', end);
        resizer.removeEventListener('pointercancel', end);
      };

      resizer.addEventListener('pointermove', move);
      resizer.addEventListener('pointerup', end);
      resizer.addEventListener('pointercancel', end);
    });
  }
}

/**
 * Common 3D Scene setup with OrbitControls, lighting, coordinate axes, and presets.
 */
export class BaseScene3DView {
  constructor(THREE, container) {
    this.THREE = THREE;
    this.container = container;
    this.container.__scene3d = this;
    this.available = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.slate800);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.set(26, 18, 26);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(20, 30, 20);
    this.scene.add(sun);

    // Grid on XZ plane
    this.grid = new THREE.GridHelper(40, 40, PALETTE.slate600, PALETTE.slate700);
    this.grid.position.y = -0.01;
    this.scene.add(this.grid);

    // Axes with crisp mathematical arrowheads projecting symmetrically in all directions
    this.axes = new THREE.Group();
    const createAxis = (dir, col, len = 12.5) => {
      const g = new THREE.Group();
      const origin = new THREE.Vector3(0, 0, 0);
      // Positive ray arrow
      g.add(new THREE.ArrowHelper(dir, origin, len, col, 0.6, 0.35));
      // Negative ray arrow projecting in opposing direction
      const negDir = dir.clone().negate();
      g.add(new THREE.ArrowHelper(negDir, origin, len, col, 0.6, 0.35));
      // Central through-origin continuous axis line
      const posPt = dir.clone().multiplyScalar(len);
      const negPt = negDir.clone().multiplyScalar(len);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([negPt, posPt]),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.35 })
      );
      g.add(line);
      return g;
    };
    this.axes.add(createAxis(new THREE.Vector3(1, 0, 0), PALETTE.amber)); // +/- X
    this.axes.add(createAxis(new THREE.Vector3(0, 1, 0), PALETTE.lime));  // +/- Y
    this.axes.add(createAxis(new THREE.Vector3(0, 0, 1), PALETTE.steel)); // +/- Z
    this.scene.add(this.axes);

    // Translucent sphere
    this.sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshPhysicalMaterial({
        color: PALETTE.sky,
        transparent: true,
        opacity: 0.12,
        roughness: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.scene.add(this.sphere);

    // Great circle wireframe on XZ plane
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
    }
    this.circleWire = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: PALETTE.sky, transparent: true, opacity: 0.7, linewidth: 2 })
    );
    this.scene.add(this.circleWire);

    // 3D Projected Labels Overlay
    this.overlay = new LabelOverlay3D(THREE, container, this.camera);
    this.currentLabels = [...AXES_3D_LABELS];

    // Resize observer
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    // Render loop
    this.animating = true;
    this.latestVis3d = {};
    const loop = () => {
      if (!this.animating) return;
      this.controls.update();
      if (this.currentLabels && this.currentLabels.length) {
        this.overlay.render(this.currentLabels, this.latestVis3d);
      }
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    const aspect = w / h;
    this.camera.aspect = aspect;
    // Adjust vertical FOV when aspect ratio is narrow (< 1.0) to prevent clipping
    if (aspect < 1.0) {
      const defaultFov = 45;
      const fovRad = (defaultFov * Math.PI) / 180;
      const targetHalfWidth = Math.tan(fovRad / 2);
      this.camera.fov = (2 * Math.atan(targetHalfWidth / aspect) * 180) / Math.PI;
    } else {
      this.camera.fov = 45;
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    if (this.currentLabels && this.currentLabels.length) {
      this.overlay.render(this.currentLabels, this.latestVis3d);
    }
  }

  applyCommonVis(state) {
    this.latestVis3d = state?.vis3d || {};
    if (this.grid) this.grid.visible = state?.vis3d?.gridXZ !== false;
    if (this.axes) this.axes.visible = state?.vis3d?.gridXZ !== false;
    if (this.sphere) this.sphere.visible = state?.vis3d?.sphere !== false;
    if (this.circleWire) this.circleWire.visible = state?.vis3d?.circleWire !== false;
    if (this.overlay && this.overlay.overlayContainer) {
      const showLabels = (state?.vis3d?.labels !== false) || Boolean(state?.vis3d?.coords) || (state?.vis3d?.angles !== false);
      this.overlay.overlayContainer.style.display = showLabels ? '' : 'none';
    }
  }

  setCameraPreset(preset) {
    const d = 36;
    if (preset === 'top') {
      this.camera.position.set(0, d, 0);
      this.camera.up.set(0, 0, -1);
    } else if (preset === 'front') {
      this.camera.position.set(0, 0, d);
      this.camera.up.set(0, 1, 0);
    } else if (preset === 'side') {
      this.camera.position.set(d, 0, 0);
      this.camera.up.set(0, 1, 0);
    } else {
      // iso / perspective
      this.camera.position.set(26, 18, 26);
      this.camera.up.set(0, 1, 0);
    }
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    if (this.currentLabels && this.currentLabels.length) {
      this.overlay.render(this.currentLabels, this.latestVis3d);
    }
  }

  enableInteraction(store, customTargets) {
    if (!this.renderer?.domElement) return;
    const element = this.renderer.domElement;
    let activeTarget = null;
    const raycaster = new this.THREE.Raycaster();

    const pointerToRay = (event) => {
      const rect = element.getBoundingClientRect();
      const ndc = new this.THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, this.camera);
      return raycaster;
    };

    const pickSphere = (ray) => {
      const r = this.R || 10;
      const rayObj = ray.ray || ray;
      const vOrigin = rayObj.origin;
      const vDir = rayObj.direction;

      // Analytical ray-sphere intersection with sphere centered at origin:
      const b = vOrigin.dot(vDir);
      const c = vOrigin.lengthSq() - r * r;
      const disc = b * b - c;
      if (disc >= 0) {
        const sqrtDisc = Math.sqrt(disc);
        const t1 = -b - sqrtDisc;
        if (t1 > 0) return vOrigin.clone().addScaledVector(vDir, t1);
        const t2 = -b + sqrtDisc;
        if (t2 > 0) return vOrigin.clone().addScaledVector(vDir, t2);
      }

      // Past silhouette: project closest ray point onto sphere surface
      const tClosest = -b;
      if (tClosest > 0) {
        const pt = vOrigin.clone().addScaledVector(vDir, tClosest);
        if (pt.lengthSq() > 1e-6) {
          return pt.normalize().multiplyScalar(r);
        }
      }
      return null;
    };

    element.addEventListener('pointerdown', (e) => {
      if (e.button && e.button !== 0) return;
      const ray = pointerToRay(e);
      const targets = customTargets || this.draggableTargets || [];
      let closest = null;
      let minDistance = 1.6;
      for (const tgt of targets) {
        if (!tgt.mesh || tgt.mesh.visible === false) continue;
        const dist = ray.ray.distanceToPoint(tgt.mesh.position);
        if (dist < minDistance) {
          minDistance = dist;
          closest = tgt;
        }
      }

      if (closest) {
        activeTarget = closest;
        this.controls.enabled = false;
        element.style.cursor = 'grabbing';
        try { element.setPointerCapture(e.pointerId); } catch (_) {}
        e.stopPropagation();
      }
    }, { capture: true });

    element.addEventListener('pointermove', (e) => {
      const ray = pointerToRay(e);
      if (activeTarget) {
        const hit = pickSphere(ray);
        if (hit) {
          let angle = Math.atan2(hit.z, hit.x);
          if (angle < 0) angle += Math.PI * 2;
          const lat = Math.acos(clamp(hit.y / (this.R || 10), -1, 1));

          if (store.get().playing) {
            store.set({ playing: false });
          }
          if (typeof activeTarget.onDrag === 'function') {
            activeTarget.onDrag(angle, hit, store, lat);
          } else if (activeTarget.latField) {
            store.set({ [activeTarget.field]: angle, [activeTarget.latField]: lat });
          } else if (activeTarget.field) {
            store.set({ [activeTarget.field]: angle });
          }
        }
        e.stopPropagation();
      } else {
        const targets = customTargets || this.draggableTargets || [];
        let hover = false;
        for (const tgt of targets) {
          if (!tgt.mesh || tgt.mesh.visible === false) continue;
          if (ray.ray.distanceToPoint(tgt.mesh.position) < 1.6) {
            hover = true;
            break;
          }
        }
        element.style.cursor = hover ? 'pointer' : '';
      }
    }, { capture: true });

    const endDrag = (e) => {
      if (activeTarget) {
        activeTarget = null;
        this.controls.enabled = true;
        element.style.cursor = '';
        try { element.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    };
    element.addEventListener('pointerup', endDrag);
    element.addEventListener('pointercancel', endDrag);
  }

  dispose() {
    this.animating = false;
    this.resizeObserver.disconnect();
    this.overlay.clear();
    this.renderer.dispose();
  }
}

/**
 * Positions HTML labels over the 3D canvas tracking camera orientation.
 */
export class LabelOverlay3D {
  constructor(THREE, container, camera) {
    this.THREE = THREE;
    this.container = container;
    this.camera = camera;
    let oc = container?.querySelector?.('#labels-3d-container, .labels-3d-container');
    if (!oc && container) {
      oc = document.createElement('div');
      oc.id = 'labels-3d-container';
      oc.className = 'labels-3d-container';
      container.appendChild(oc);
    }
    this.overlayContainer = oc || container;
    this.elements = new Map();
  }

  project(point) {
    if (!this.container || !this.camera || !point) return null;
    const { clientWidth: width, clientHeight: height } = this.container;
    if (!width || !height) return null;
    const v = new this.THREE.Vector3(point.x, point.y, point.z).project(this.camera);
    if (v.z > 1) return null;
    return { x: (v.x * 0.5 + 0.5) * width, y: (v.y * -0.5 + 0.5) * height };
  }

  render(labels, vis3d = {}) {
    if (!labels || !this.overlayContainer?.appendChild) return;
    const showLabels = vis3d.labels !== false;
    const showCoords = Boolean(vis3d.coords);
    const showAngles = vis3d.angles !== false;
    const activeKeys = new Set();

    for (const label of labels) {
      if (!label || !label.key) continue;
      activeKeys.add(label.key);
      let el = this.elements.get(label.key);
      if (!el) {
        el = document.createElement('div');
        el.className = 'label-3d';
        el.dataset.label = label.key;
        this.overlayContainer.appendChild(el);
        this.elements.set(label.key, el);
      }

      let shouldShow = label.show !== false;
      if (label.isAngle) {
        if (!showAngles) shouldShow = false;
      } else if (label.isAxis) {
        if (!showLabels && !showCoords) shouldShow = false;
      } else {
        // Point label
        if (!showLabels && !showCoords) shouldShow = false;
      }

      const screen = shouldShow ? this.project(label.at) : null;
      if (!screen) {
        el.classList.remove('visible');
        el.style.display = 'none';
        continue;
      }

      el.style.display = '';
      el.style.left = `${screen.x}px`;
      el.style.top = `${screen.y}px`;

      let displayText = label.text;
      if (!label.isAngle && !label.isAxis && label.coords) {
        const name = label.name || label.key;
        const xStr = label.coords.x.toFixed(1);
        const yStr = (label.coords.y !== undefined ? label.coords.y : 0).toFixed(1);
        const zStr = (label.coords.z !== undefined ? label.coords.z : 0).toFixed(1);
        const coordStr = `(${xStr}, ${yStr}, ${zStr})`;
        if (showLabels && showCoords) {
          displayText = `${name} ${coordStr}`;
        } else if (showCoords) {
          displayText = coordStr;
        } else if (showLabels) {
          displayText = name;
        } else {
          displayText = '';
        }
      }

      el.textContent = displayText;
      el.className = `label-3d visible ${label.color || ''}`;
    }

    for (const [key, el] of this.elements.entries()) {
      if (!activeKeys.has(key)) {
        el.classList.remove('visible');
        el.style.display = 'none';
      }
    }
  }

  clear() {
    for (const el of this.elements.values()) {
      el.classList.remove('visible');
      el.style.display = 'none';
    }
  }
}

export const AXES_3D_LABELS = [
  { key: 'axis-x-pos', at: { x: 13.0, y: 0, z: 0 }, text: '+X', color: 'color-amber', isAxis: true },
  { key: 'axis-x-neg', at: { x: -13.0, y: 0, z: 0 }, text: '-X', color: 'color-amber', isAxis: true },
  { key: 'axis-y-pos', at: { x: 0, y: 13.0, z: 0 }, text: '+Y', color: 'color-lime', isAxis: true },
  { key: 'axis-y-neg', at: { x: 0, y: -13.0, z: 0 }, text: '-Y', color: 'color-lime', isAxis: true },
  { key: 'axis-z-pos', at: { x: 0, y: 0, z: 13.0 }, text: '+Z', color: 'color-steel', isAxis: true },
  { key: 'axis-z-neg', at: { x: 0, y: 0, z: -13.0 }, text: '-Z', color: 'color-steel', isAxis: true },
];

/** Discrete, subtle vertex node adhering to Euclidean drawing standards (radius 0.18, no globs). */
function makeMarker(THREE, color, radius = 0.18) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 24),
    new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.1 })
  );
}

function makeLine(THREE, color, dashed = false) {
  const geom = new THREE.BufferGeometry();
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.5, gapSize: 0.3 })
    : new THREE.LineBasicMaterial({ color, linewidth: 2 });
  return new THREE.Line(geom, mat);
}

/** Mathematical double-ended line with sharp conical arrowheads at both ends (no spherical globs). */
function makeDoubleArrowLine(THREE, color) {
  const group = new THREE.Group();
  const line = makeLine(THREE, color);
  const headGeom = new THREE.ConeGeometry(0.32, 0.75, 16);
  const headMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3 });
  const cone1 = new THREE.Mesh(headGeom, headMat);
  const cone2 = new THREE.Mesh(headGeom, headMat);
  group.add(line, cone1, cone2);

  const up = new THREE.Vector3(0, 1, 0);
  const setPoints = (p1, p2) => {
    line.geometry.setFromPoints([p1, p2]);
    const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
    cone1.position.copy(p1);
    cone1.quaternion.setFromUnitVectors(up, dir.clone().negate());
    cone2.position.copy(p2);
    cone2.quaternion.setFromUnitVectors(up, dir);
  };

  return { group, line, cone1, cone2, setPoints };
}

function makeTriMesh(THREE, color, opacity = 0.16) {
  const geom = new THREE.BufferGeometry();
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.renderOrder = 1;
  return mesh;
}

export function makeAngleWedgeMesh(THREE, color, opacity = 0.65) {
  const geom = new THREE.BufferGeometry();
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.renderOrder = 3;

  // Crisp outline line marking the angle sector boundary and radial spokes
  const arcGeom = new THREE.BufferGeometry();
  const arcMat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const arcLine = new THREE.Line(arcGeom, arcMat);
  arcLine.renderOrder = 4;
  mesh.add(arcLine);
  mesh.arcLine = arcLine;
  geom.arcLine = arcLine;

  return mesh;
}

export function makeRightAngleMesh(THREE, color = PALETTE.teal, opacity = 0.75) {
  const geom = new THREE.BufferGeometry();
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.renderOrder = 3;

  // Crisp elbow line marking the right-angle square boundary
  const elbowGeom = new THREE.BufferGeometry();
  const elbowMat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const elbowLine = new THREE.Line(elbowGeom, elbowMat);
  elbowLine.renderOrder = 4;
  mesh.add(elbowLine);
  mesh.elbowLine = elbowLine;
  geom.elbowLine = elbowLine;

  return mesh;
}

export function setAngleWedgeVertices3D(meshOrGeom, vertex, toward1, toward2, radius, segments = 24, customTHREE = null) {
  const THREE = customTHREE || window?.THREE || globalThis?.THREE;
  if (!THREE || !vertex || !toward1 || !toward2 || !meshOrGeom) return;
  const geom = meshOrGeom.isBufferGeometry ? meshOrGeom : meshOrGeom.geometry;
  if (!geom) return;
  const v1 = new THREE.Vector3().subVectors(toward1, vertex);
  const v2 = new THREE.Vector3().subVectors(toward2, vertex);
  if (v1.lengthSq() < 1e-4 || v2.lengthSq() < 1e-4) return;
  v1.normalize();
  v2.normalize();
  const angle = v1.angleTo(v2);
  let normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
  if (normal.lengthSq() < 0.001) normal.set(0, 1, 0);

  const rim = [];
  for (let i = 0; i <= segments; i++) {
    rim.push(v1.clone().applyAxisAngle(normal, angle * (i / segments)).multiplyScalar(radius).add(vertex));
  }
  const positions = [];
  for (let i = 0; i < segments; i++) {
    positions.push(
      vertex.x, vertex.y, vertex.z,
      rim[i].x, rim[i].y, rim[i].z,
      rim[i + 1].x, rim[i + 1].y, rim[i + 1].z
    );
  }
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geom.computeVertexNormals();

  const arcLine = meshOrGeom.arcLine || geom.arcLine;
  if (arcLine && arcLine.geometry) {
    const loop = [vertex, ...rim, vertex];
    arcLine.geometry.setFromPoints(loop);
  }
}

/**
 * Calculates 3D spatial angle bisector position offset outward by dist.
 */
export function get3DAngleBisector(vertex, toward1, toward2, dist = 1.5, customTHREE = null) {
  const THREE = customTHREE || window?.THREE || globalThis?.THREE;
  if (!THREE || !vertex || !toward1 || !toward2) return vertex;
  const v1 = new THREE.Vector3().subVectors(toward1, vertex);
  const v2 = new THREE.Vector3().subVectors(toward2, vertex);
  if (v1.lengthSq() < 1e-4 || v2.lengthSq() < 1e-4) return vertex;
  v1.normalize();
  v2.normalize();
  const bisector = new THREE.Vector3().addVectors(v1, v2);
  if (bisector.lengthSq() < 1e-4) {
    let normal = new THREE.Vector3().crossVectors(v1, new THREE.Vector3(0, 1, 0));
    if (normal.lengthSq() < 1e-4) normal = new THREE.Vector3().crossVectors(v1, new THREE.Vector3(0, 0, 1));
    return new THREE.Vector3().addVectors(vertex, normal.normalize().multiplyScalar(dist));
  }
  return new THREE.Vector3().addVectors(vertex, bisector.normalize().multiplyScalar(dist));
}

/**
 * Calculates 3D subtended angle in degrees between toward1 and toward2 from vertex.
 */
export function get3DAngleDegrees(vertex, toward1, toward2, customTHREE = null) {
  const THREE = customTHREE || window?.THREE || globalThis?.THREE;
  if (!THREE || !vertex || !toward1 || !toward2) return 0;
  const v1 = new THREE.Vector3().subVectors(toward1, vertex);
  const v2 = new THREE.Vector3().subVectors(toward2, vertex);
  if (v1.lengthSq() < 1e-4 || v2.lengthSq() < 1e-4) return 0;
  v1.normalize();
  v2.normalize();
  return (v1.angleTo(v2) * 180 / Math.PI);
}

function setTriVertices(geom, p1, p2, p3) {
  const THREE = window?.THREE;
  if (!THREE) return;
  const vertices = new Float32Array([
    p1.x, p1.y, p1.z,
    p2.x, p2.y, p2.z,
    p3.x, p3.y, p3.z,
  ]);
  geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geom.computeVertexNormals();
}

function setSectorXZVertices(geom, cx, cz, radius, startAngle, sweepAngle, segments = 32) {
  const THREE = window?.THREE;
  if (!THREE) return;
  const positions = [];
  for (let i = 0; i < segments; i++) {
    const a1 = startAngle + (sweepAngle * i) / segments;
    const a2 = startAngle + (sweepAngle * (i + 1)) / segments;
    positions.push(cx, 0, cz);
    positions.push(cx + radius * Math.cos(a1), 0, cz + radius * Math.sin(a1));
    positions.push(cx + radius * Math.cos(a2), 0, cz + radius * Math.sin(a2));
  }
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geom.computeVertexNormals();
}

function setSegmentXZVertices(geom, cx, cz, radius, startAngle, sweepAngle, segments = 32) {
  const THREE = window?.THREE;
  if (!THREE) return;
  const p0x = cx + radius * Math.cos(startAngle);
  const p0z = cz + radius * Math.sin(startAngle);
  const positions = [];
  for (let i = 1; i < segments; i++) {
    const a1 = startAngle + (sweepAngle * i) / segments;
    const a2 = startAngle + (sweepAngle * (i + 1)) / segments;
    positions.push(p0x, 0, p0z);
    positions.push(cx + radius * Math.cos(a1), 0, cz + radius * Math.sin(a1));
    positions.push(cx + radius * Math.cos(a2), 0, cz + radius * Math.sin(a2));
  }
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geom.computeVertexNormals();
}

export function setRightAngle3DVertices(meshOrGeom, vertex, toward1, toward2, size = 1.3, customTHREE = null) {
  const THREE = customTHREE || window?.THREE || globalThis?.THREE;
  if (!THREE || !vertex || !toward1 || !toward2 || !meshOrGeom) return;
  const geom = meshOrGeom.isBufferGeometry ? meshOrGeom : meshOrGeom.geometry;
  if (!geom) return;
  const v1 = new THREE.Vector3().subVectors(toward1, vertex);
  const v2 = new THREE.Vector3().subVectors(toward2, vertex);
  if (v1.lengthSq() < 1e-4 || v2.lengthSq() < 1e-4) return;
  v1.normalize().multiplyScalar(size);
  v2.normalize().multiplyScalar(size);

  const c1 = new THREE.Vector3().addVectors(vertex, v1);
  const c2 = new THREE.Vector3().addVectors(c1, v2);
  const c3 = new THREE.Vector3().addVectors(vertex, v2);

  const positions = new Float32Array([
    vertex.x, vertex.y, vertex.z,  c1.x, c1.y, c1.z,  c2.x, c2.y, c2.z,
    vertex.x, vertex.y, vertex.z,  c2.x, c2.y, c2.z,  c3.x, c3.y, c3.z,
  ]);
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.computeVertexNormals();

  const elbowLine = meshOrGeom.elbowLine || geom.elbowLine;
  if (elbowLine && elbowLine.geometry) {
    elbowLine.geometry.setFromPoints([c1, c2, c3]);
  }
}

export function setRightAngleXZVertices(geom, vertex, toward1, toward2, size = 1.0) {
  return setRightAngle3DVertices(geom, vertex, toward1, toward2, size);
}

function setQuadVertices(geom, p1, p2, p3, p4) {
  const THREE = window?.THREE;
  if (!THREE) return;
  const positions = new Float32Array([
    p1.x, p1.y, p1.z,  p2.x, p2.y, p2.z,  p3.x, p3.y, p3.z,
    p1.x, p1.y, p1.z,  p3.x, p3.y, p3.z,  p4.x, p4.y, p4.z,
  ]);
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.computeVertexNormals();
}

/**
 * 1. Angle at Centre 3D Scene View
 */
export class AngleAtCentre3DView extends BaseScene3DView {
  constructor(THREE, container) {
    super(THREE, container);
    const R = 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    this.circleWire.scale.setScalar(R);

    this.markerO = makeMarker(THREE, PALETTE.indigo, 0.16);
    this.markerA = makeMarker(THREE, PALETTE.red, 0.18);
    this.markerB = makeMarker(THREE, PALETTE.orange, 0.18);
    this.markerP = makeMarker(THREE, PALETTE.violet, 0.18);

    this.lineOA = makeLine(THREE, PALETTE.indigo);
    this.lineOB = makeLine(THREE, PALETTE.indigo);
    this.lineOP = makeLine(THREE, PALETTE.lavender, true);
    this.linePA = makeLine(THREE, PALETTE.blue);
    this.linePB = makeLine(THREE, PALETTE.orange);

    this.sectorMesh = makeTriMesh(THREE, PALETTE.yellow, 0.16);
    this.inscribedMesh = makeTriMesh(THREE, PALETTE.green, 0.16);
    this.centralAngleMesh = makeAngleWedgeMesh(THREE, PALETTE.yellow, 0.65);
    this.inscribedAngleMesh = makeAngleWedgeMesh(THREE, PALETTE.green, 0.65);

    this.scene.add(
      this.markerO, this.markerA, this.markerB, this.markerP,
      this.lineOA, this.lineOB, this.lineOP, this.linePA, this.linePB,
      this.sectorMesh, this.inscribedMesh,
      this.centralAngleMesh, this.inscribedAngleMesh
    );

    this.draggableTargets = [
      { id: 'P', mesh: this.markerP, field: 'angleP', latField: 'latP' },
      { id: 'A', mesh: this.markerA, field: 'angleA', latField: 'latA' },
      { id: 'B', mesh: this.markerB, field: 'angleB', latField: 'latB' },
    ];
  }

  render(state) {
    this.applyCommonVis(state);
    const { THREE, R } = this;
    const latP = state.latP ?? (Math.PI / 2);
    const latA = state.latA ?? (Math.PI / 2);
    const latB = state.latB ?? (Math.PI / 2);
    const O = new THREE.Vector3(0, 0, 0);
    const A = new THREE.Vector3(
      R * Math.sin(latA) * Math.cos(state.angleA),
      R * Math.cos(latA),
      R * Math.sin(latA) * Math.sin(state.angleA)
    );
    const B = new THREE.Vector3(
      R * Math.sin(latB) * Math.cos(state.angleB),
      R * Math.cos(latB),
      R * Math.sin(latB) * Math.sin(state.angleB)
    );
    const P = new THREE.Vector3(
      R * Math.sin(latP) * Math.cos(state.angleP),
      R * Math.cos(latP),
      R * Math.sin(latP) * Math.sin(state.angleP)
    );

    this.markerO.position.copy(O);
    this.markerA.position.copy(A);
    this.markerB.position.copy(B);
    this.markerP.position.copy(P);

    this.lineOA.geometry.setFromPoints([O, A]);
    this.lineOB.geometry.setFromPoints([O, B]);
    this.lineOP.geometry.setFromPoints([O, P]);
    this.lineOP.computeLineDistances();
    this.linePA.geometry.setFromPoints([P, A]);
    this.linePB.geometry.setFromPoints([P, B]);

    this.lineOA.visible = this.lineOB.visible = state.showRadii !== false;
    this.lineOP.visible = state.showSplit !== false;

    const arcRange = getSubtendedArcRange3D(state.angleA, state.angleB, state.angleP);
    setSectorXZVertices(this.sectorMesh.geometry, 0, 0, R, arcRange.start, arcRange.sweep, 32);
    setTriVertices(this.inscribedMesh.geometry, P, A, B);

    const showArea = (state.vis3d?.area !== false) && (state.showArea !== false);
    this.sectorMesh.visible = showArea;
    this.inscribedMesh.visible = showArea;

    // 3D Angle Wedges & Spatial Bisectors
    const showAngles = (state.vis3d?.angles !== false) && (state.showAngles !== false);
    setAngleWedgeVertices3D(this.centralAngleMesh, O, A, B, 2.6);
    setAngleWedgeVertices3D(this.inscribedAngleMesh, P, A, B, 2.4);
    this.centralAngleMesh.visible = this.inscribedAngleMesh.visible = showAngles;

    const degCent = get3DAngleDegrees(O, A, B, THREE);
    const degInsc = get3DAngleDegrees(P, A, B, THREE);
    const centralLabelPos = get3DAngleBisector(O, A, B, 3.8, THREE);
    const inscribedLabelPos = get3DAngleBisector(P, A, B, 3.6, THREE);

    const A_pos = A.clone().multiplyScalar(1.15);
    const B_pos = B.clone().multiplyScalar(1.15);
    const P_pos = P.clone().multiplyScalar(1.15);
    const O_pos = new THREE.Vector3(0, 0.8, 0);

    this.currentLabels = [
      ...AXES_3D_LABELS,
      { key: 'O', at: O_pos, name: 'O', text: 'O', coords: O, color: 'color-indigo' },
      { key: 'A', at: A_pos, name: 'A', text: 'A', coords: A, color: 'color-red' },
      { key: 'B', at: B_pos, name: 'B', text: 'B', coords: B, color: 'color-orange' },
      { key: 'P', at: P_pos, name: 'P', text: 'P', coords: P, color: 'color-violet' },
      { key: 'central', at: centralLabelPos, text: `2θ = ${degCent.toFixed(1)}°`, isAngle: true, color: 'color-yellow', show: showAngles },
      { key: 'inscribed', at: inscribedLabelPos, text: `θ = ${degInsc.toFixed(1)}°`, isAngle: true, color: 'color-green', show: showAngles },
    ];
    this.overlay.render(this.currentLabels, state.vis3d);
  }
}

/**
 * 2. Angles in Same Segment 3D Scene View
 */
export class AnglesInSameSegment3DView extends BaseScene3DView {
  constructor(THREE, container) {
    super(THREE, container);
    const R = 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    this.circleWire.scale.setScalar(R);

    this.markerA = makeMarker(THREE, PALETTE.red, 0.18);
    this.markerB = makeMarker(THREE, PALETTE.red, 0.18);
    this.markerP1 = makeMarker(THREE, PALETTE.blue, 0.18);
    this.markerP2 = makeMarker(THREE, PALETTE.emerald, 0.18);

    this.chordAB = makeLine(THREE, PALETTE.red);
    this.lineP1A = makeLine(THREE, PALETTE.blue);
    this.lineP1B = makeLine(THREE, PALETTE.blue);
    this.lineP2A = makeLine(THREE, PALETTE.emerald);
    this.lineP2B = makeLine(THREE, PALETTE.emerald);

    this.tri1Mesh = makeTriMesh(THREE, PALETTE.blue, 0.16);
    this.tri2Mesh = makeTriMesh(THREE, PALETTE.emerald, 0.16);
    this.segmentMesh = makeTriMesh(THREE, PALETTE.sky, 0.12);
    this.angleP1Mesh = makeAngleWedgeMesh(THREE, PALETTE.blue, 0.65);
    this.angleP2Mesh = makeAngleWedgeMesh(THREE, PALETTE.emerald, 0.65);

    this.scene.add(
      this.markerA, this.markerB, this.markerP1, this.markerP2,
      this.chordAB, this.lineP1A, this.lineP1B, this.lineP2A, this.lineP2B,
      this.segmentMesh, this.tri1Mesh, this.tri2Mesh,
      this.angleP1Mesh, this.angleP2Mesh
    );

    this.draggableTargets = [
      { id: 'P1', mesh: this.markerP1, field: 'angleP1', latField: 'latP1' },
      { id: 'P2', mesh: this.markerP2, field: 'angleP2', latField: 'latP2' },
      { id: 'A', mesh: this.markerA, field: 'angleA', latField: 'latA' },
      { id: 'B', mesh: this.markerB, field: 'angleB', latField: 'latB' },
    ];
  }

  render(state) {
    this.applyCommonVis(state);
    const { THREE, R } = this;
    const latA = state.latA ?? (Math.PI / 2);
    const latB = state.latB ?? (Math.PI / 2);
    const latP1 = state.latP1 ?? (Math.PI / 2);
    const latP2 = state.latP2 ?? (Math.PI / 2);
    const A = new THREE.Vector3(
      R * Math.sin(latA) * Math.cos(state.angleA),
      R * Math.cos(latA),
      R * Math.sin(latA) * Math.sin(state.angleA)
    );
    const B = new THREE.Vector3(
      R * Math.sin(latB) * Math.cos(state.angleB),
      R * Math.cos(latB),
      R * Math.sin(latB) * Math.sin(state.angleB)
    );
    const P1 = new THREE.Vector3(
      R * Math.sin(latP1) * Math.cos(state.angleP1),
      R * Math.cos(latP1),
      R * Math.sin(latP1) * Math.sin(state.angleP1)
    );
    const P2 = new THREE.Vector3(
      R * Math.sin(latP2) * Math.cos(state.angleP2),
      R * Math.cos(latP2),
      R * Math.sin(latP2) * Math.sin(state.angleP2)
    );

    this.markerA.position.copy(A);
    this.markerB.position.copy(B);
    this.markerP1.position.copy(P1);
    this.markerP2.position.copy(P2);

    this.chordAB.geometry.setFromPoints([A, B]);
    this.lineP1A.geometry.setFromPoints([P1, A]);
    this.lineP1B.geometry.setFromPoints([P1, B]);
    this.lineP2A.geometry.setFromPoints([P2, A]);
    this.lineP2B.geometry.setFromPoints([P2, B]);

    setTriVertices(this.tri1Mesh.geometry, P1, A, B);
    setTriVertices(this.tri2Mesh.geometry, P2, A, B);

    const arcRange = getSubtendedArcRange3D(state.angleA, state.angleB, state.angleP1);
    const TAU = Math.PI * 2;
    const segStart = (arcRange.start + arcRange.sweep) % TAU;
    const segSweep = TAU - arcRange.sweep;
    setSegmentXZVertices(this.segmentMesh.geometry, 0, 0, R, segStart, segSweep, 32);

    const showArea = (state.vis3d?.area !== false) && (state.showArea !== false) && (state.showShading !== false);
    this.segmentMesh.visible = showArea;
    this.tri1Mesh.visible = showArea;
    this.tri2Mesh.visible = showArea;

    // 3D Angle Wedges & Spatial Bisectors
    const showAngles = (state.vis3d?.angles !== false) && (state.showAngles !== false);
    setAngleWedgeVertices3D(this.angleP1Mesh, P1, A, B, 2.4);
    setAngleWedgeVertices3D(this.angleP2Mesh, P2, A, B, 2.4);
    this.angleP1Mesh.visible = this.angleP2Mesh.visible = showAngles;

    const degP1 = get3DAngleDegrees(P1, A, B, THREE);
    const degP2 = get3DAngleDegrees(P2, A, B, THREE);
    const p1LabelPos = get3DAngleBisector(P1, A, B, 3.4, THREE);
    const p2LabelPos = get3DAngleBisector(P2, A, B, 3.4, THREE);

    const A_pos = A.clone().multiplyScalar(1.15);
    const B_pos = B.clone().multiplyScalar(1.15);
    const P1_pos = P1.clone().multiplyScalar(1.15);
    const P2_pos = P2.clone().multiplyScalar(1.15);

    this.currentLabels = [
      ...AXES_3D_LABELS,
      { key: 'A', at: A_pos, name: 'A', text: 'A', coords: A, color: 'color-red' },
      { key: 'B', at: B_pos, name: 'B', text: 'B', coords: B, color: 'color-red' },
      { key: 'P1', at: P1_pos, name: 'P₁', text: 'P₁', coords: P1, color: 'color-blue' },
      { key: 'P2', at: P2_pos, name: 'P₂', text: 'P₂', coords: P2, color: 'color-emerald' },
      { key: 'angP1', at: p1LabelPos, text: `α = ${degP1.toFixed(1)}°`, isAngle: true, color: 'color-blue', show: showAngles },
      { key: 'angP2', at: p2LabelPos, text: `β = ${degP2.toFixed(1)}°`, isAngle: true, color: 'color-emerald', show: showAngles },
    ];
    this.overlay.render(this.currentLabels, state.vis3d);
  }
}

/**
 * 3. Cyclic Quadrilateral 3D Scene View
 */
export class CyclicQuad3DView extends BaseScene3DView {
  constructor(THREE, container) {
    super(THREE, container);
    const R = 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    this.circleWire.scale.setScalar(R);

    this.markerA = makeMarker(THREE, PALETTE.violet, 0.18);
    this.markerB = makeMarker(THREE, PALETTE.cyan, 0.18);
    this.markerC = makeMarker(THREE, PALETTE.amber, 0.18);
    this.markerD = makeMarker(THREE, PALETTE.rose, 0.18);

    this.edgeAB = makeLine(THREE, PALETTE.indigo);
    this.edgeBC = makeLine(THREE, PALETTE.indigo);
    this.edgeCD = makeLine(THREE, PALETTE.indigo);
    this.edgeDA = makeLine(THREE, PALETTE.indigo);

    this.diagAC = makeLine(THREE, PALETTE.lavender, true);
    this.diagBD = makeLine(THREE, PALETTE.lavender, true);
    this.rayExteriorArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 4.5, PALETTE.rose, 0.7, 0.35);

    this.quadMesh1 = makeTriMesh(THREE, PALETTE.indigo, 0.14);
    this.quadMesh2 = makeTriMesh(THREE, PALETTE.indigo, 0.14);
    this.angleAMesh = makeAngleWedgeMesh(THREE, PALETTE.violet, 0.65);
    this.angleBMesh = makeAngleWedgeMesh(THREE, PALETTE.cyan, 0.65);
    this.angleCMesh = makeAngleWedgeMesh(THREE, PALETTE.amber, 0.65);
    this.angleDMesh = makeAngleWedgeMesh(THREE, PALETTE.rose, 0.65);
    this.angleExtMesh = makeAngleWedgeMesh(THREE, PALETTE.violet, 0.65);

    this.scene.add(
      this.markerA, this.markerB, this.markerC, this.markerD,
      this.edgeAB, this.edgeBC, this.edgeCD, this.edgeDA,
      this.diagAC, this.diagBD, this.rayExteriorArrow,
      this.quadMesh1, this.quadMesh2,
      this.angleAMesh, this.angleBMesh, this.angleCMesh, this.angleDMesh, this.angleExtMesh
    );

    this.draggableTargets = [
      { id: 'A', mesh: this.markerA, field: 'angleA', latField: 'latA' },
      { id: 'B', mesh: this.markerB, field: 'angleB', latField: 'latB' },
      { id: 'C', mesh: this.markerC, field: 'angleC', latField: 'latC' },
      { id: 'D', mesh: this.markerD, field: 'angleD', latField: 'latD' },
    ];
  }

  render(state) {
    this.applyCommonVis(state);
    const { THREE, R } = this;
    const latA = state.latA ?? (Math.PI / 2);
    const latB = state.latB ?? (Math.PI / 2);
    const latC = state.latC ?? (Math.PI / 2);
    const latD = state.latD ?? (Math.PI / 2);
    const A = new THREE.Vector3(R * Math.sin(latA) * Math.cos(state.angleA), R * Math.cos(latA), R * Math.sin(latA) * Math.sin(state.angleA));
    const B = new THREE.Vector3(R * Math.sin(latB) * Math.cos(state.angleB), R * Math.cos(latB), R * Math.sin(latB) * Math.sin(state.angleB));
    const C = new THREE.Vector3(R * Math.sin(latC) * Math.cos(state.angleC), R * Math.cos(latC), R * Math.sin(latC) * Math.sin(state.angleC));
    const D = new THREE.Vector3(R * Math.sin(latD) * Math.cos(state.angleD), R * Math.cos(latD), R * Math.sin(latD) * Math.sin(state.angleD));

    this.markerA.position.copy(A);
    this.markerB.position.copy(B);
    this.markerC.position.copy(C);
    this.markerD.position.copy(D);

    this.edgeAB.geometry.setFromPoints([A, B]);
    this.edgeBC.geometry.setFromPoints([B, C]);
    this.edgeCD.geometry.setFromPoints([C, D]);
    this.edgeDA.geometry.setFromPoints([D, A]);

    this.diagAC.geometry.setFromPoints([A, C]);
    this.diagAC.computeLineDistances();
    this.diagBD.geometry.setFromPoints([B, D]);
    this.diagBD.computeLineDistances();
    this.diagAC.visible = this.diagBD.visible = Boolean(state.showDiagonals);

    // Exterior ray past C along DC with crisp arrow head (no sphere glob)
    const dirDC = new THREE.Vector3().subVectors(C, D).normalize();
    this.rayExteriorArrow.position.copy(C);
    this.rayExteriorArrow.setDirection(dirDC);
    this.rayExteriorArrow.setLength(4.5, 0.7, 0.35);
    this.rayExteriorArrow.visible = Boolean(state.showExterior);

    setTriVertices(this.quadMesh1.geometry, A, B, C);
    setTriVertices(this.quadMesh2.geometry, A, C, D);
    const showArea = (state.vis3d?.area !== false) && (state.showArea !== false);
    this.quadMesh1.visible = this.quadMesh2.visible = showArea;

    // 3D Angle Wedges & Spatial Bisectors
    const showAngles = (state.vis3d?.angles !== false) && (state.showAngles !== false);
    setAngleWedgeVertices3D(this.angleAMesh, A, B, D, 2.2);
    setAngleWedgeVertices3D(this.angleBMesh, B, A, C, 2.2);
    setAngleWedgeVertices3D(this.angleCMesh, C, B, D, 2.2);
    setAngleWedgeVertices3D(this.angleDMesh, D, C, A, 2.2);
    if (state.showExterior) {
      const extPt = new THREE.Vector3().addVectors(C, dirDC.clone().multiplyScalar(4));
      setAngleWedgeVertices3D(this.angleExtMesh, C, B, extPt, 2.4);
    }
    this.angleAMesh.visible = this.angleBMesh.visible = this.angleCMesh.visible = this.angleDMesh.visible = showAngles;
    this.angleExtMesh.visible = showAngles && Boolean(state.showExterior);

    const degA = get3DAngleDegrees(A, B, D, THREE);
    const degB = get3DAngleDegrees(B, A, C, THREE);
    const degC = get3DAngleDegrees(C, B, D, THREE);
    const degD = get3DAngleDegrees(D, C, A, THREE);

    const angAPos = get3DAngleBisector(A, B, D, 3.0, THREE);
    const angBPos = get3DAngleBisector(B, A, C, 3.0, THREE);
    const angCPos = get3DAngleBisector(C, B, D, 3.0, THREE);
    const angDPos = get3DAngleBisector(D, C, A, 3.0, THREE);

    const A_pos = A.clone().multiplyScalar(1.15);
    const B_pos = B.clone().multiplyScalar(1.15);
    const C_pos = C.clone().multiplyScalar(1.15);
    const D_pos = D.clone().multiplyScalar(1.15);

    this.currentLabels = [
      ...AXES_3D_LABELS,
      { key: 'A', at: A_pos, name: 'A', text: 'A', coords: A, color: 'color-violet' },
      { key: 'B', at: B_pos, name: 'B', text: 'B', coords: B, color: 'color-cyan' },
      { key: 'C', at: C_pos, name: 'C', text: 'C', coords: C, color: 'color-amber' },
      { key: 'D', at: D_pos, name: 'D', text: 'D', coords: D, color: 'color-rose' },
      { key: 'angA', at: angAPos, text: `∠A = ${degA.toFixed(1)}°`, isAngle: true, color: 'color-violet', show: showAngles },
      { key: 'angB', at: angBPos, text: `∠B = ${degB.toFixed(1)}°`, isAngle: true, color: 'color-cyan', show: showAngles },
      { key: 'angC', at: angCPos, text: `∠C = ${degC.toFixed(1)}°`, isAngle: true, color: 'color-amber', show: showAngles },
      { key: 'angD', at: angDPos, text: `∠D = ${degD.toFixed(1)}°`, isAngle: true, color: 'color-rose', show: showAngles },
    ];
    if (state.showExterior) {
      const extPt = new THREE.Vector3().addVectors(C, dirDC.clone().multiplyScalar(4));
      const degExt = get3DAngleDegrees(C, B, extPt, THREE);
      const angExtPos = get3DAngleBisector(C, B, extPt, 2.7, THREE);
      this.currentLabels.push({
        key: 'Ext',
        at: angExtPos,
        text: `Ext = ${degExt.toFixed(1)}°`,
        isAngle: true,
        color: 'color-violet',
        show: showAngles,
      });
    }
    this.overlay.render(this.currentLabels, state.vis3d);
  }
}

/**
 * 4. Tangent-Radius 3D Scene View
 */
export class TangentRadius3DView extends BaseScene3DView {
  constructor(THREE, container) {
    super(THREE, container);
    const R = 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    this.circleWire.scale.setScalar(R);

    this.markerO = makeMarker(THREE, PALETTE.indigo, 0.16);
    this.markerT = makeMarker(THREE, PALETTE.red, 0.18);

    this.lineOT = makeLine(THREE, PALETTE.indigo);
    this.tangentDoubleArrow = makeDoubleArrowLine(THREE, PALETTE.emerald);
    this.rightAngleMarker = makeLine(THREE, PALETTE.teal);
    this.rightAngleMesh = makeRightAngleMesh(THREE, PALETTE.teal, 0.75);
    this.secantMesh = makeTriMesh(THREE, PALETTE.yellow, 0.16);
    this.markerQ = makeMarker(THREE, PALETTE.yellow, 0.18);
    this.lineTQ = makeLine(THREE, PALETTE.yellow, true);

    this.scene.add(
      this.markerO, this.markerT, this.markerQ, this.lineOT, this.lineTQ,
      this.tangentDoubleArrow.group, this.rightAngleMarker,
      this.rightAngleMesh, this.secantMesh
    );

    this.draggableTargets = [
      { id: 'T', mesh: this.markerT, field: 'angleT', latField: 'latT' },
    ];
  }

  render(state) {
    this.applyCommonVis(state);
    const { THREE, R } = this;
    const ang = state.angleT ?? state.angleP ?? 0;
    const latT = state.latT ?? (Math.PI / 2);
    const O = new THREE.Vector3(0, 0, 0);
    const T = new THREE.Vector3(
      R * Math.sin(latT) * Math.cos(ang),
      R * Math.cos(latT),
      R * Math.sin(latT) * Math.sin(ang)
    );
    this.markerO.position.copy(O);
    this.markerT.position.copy(T);

    this.lineOT.geometry.setFromPoints([O, T]);

    // Unit tangent vector perpendicular to OT in 3D
    let tanDir = new THREE.Vector3(-Math.sin(ang), 0, Math.cos(ang));
    if (Math.abs(Math.sin(latT)) < 0.99) {
      const radDir = T.clone().normalize();
      tanDir = new THREE.Vector3(0, 1, 0).cross(radDir).normalize();
      if (tanDir.lengthSq() < 0.01) tanDir = new THREE.Vector3(1, 0, 0).cross(radDir).normalize();
    }
    const L = 14;
    const tan1 = new THREE.Vector3().addVectors(T, tanDir.clone().multiplyScalar(-L));
    const tan2 = new THREE.Vector3().addVectors(T, tanDir.clone().multiplyScalar(L));
    this.tangentDoubleArrow.setPoints(tan1, tan2);

    // Right-angle elbow marker at T
    const s = 1.4;
    const normDir = new THREE.Vector3().subVectors(O, T).normalize();
    const corner1 = new THREE.Vector3().addVectors(T, normDir.clone().multiplyScalar(s));
    const corner2 = new THREE.Vector3().addVectors(corner1, tanDir.clone().multiplyScalar(s));
    const corner3 = new THREE.Vector3().addVectors(T, tanDir.clone().multiplyScalar(s));
    this.rightAngleMarker.geometry.setFromPoints([corner1, corner2, corner3]);

    const showAngles = (state.vis3d?.angles !== false) && (state.showRightAngle !== false) && (state.showAngles !== false);
    this.rightAngleMarker.visible = showAngles;

    // Right-angle shaded square mesh
    setRightAngle3DVertices(this.rightAngleMesh, T, corner1, corner3, s);
    this.rightAngleMesh.visible = showAngles;

    // Secant chord & triangle shading (Q -> T)
    const showSecant = Boolean(state.showSecant);
    const showArea = (state.vis3d?.area !== false) && (state.showArea !== false);
    const angQ = ang + 0.45;
    const Q = new THREE.Vector3(R * Math.cos(angQ), 0, R * Math.sin(angQ));
    this.markerQ.position.copy(Q);
    this.lineTQ.geometry.setFromPoints([T, Q]);
    this.lineTQ.computeLineDistances();
    setTriVertices(this.secantMesh.geometry, O, T, Q);
    this.markerQ.visible = this.lineTQ.visible = showSecant;
    this.secantMesh.visible = showSecant && showArea;

    const rightAngleAt = get3DAngleBisector(T, corner1, corner3, 3.0, THREE);
    const T_pos = T.clone().multiplyScalar(1.15);
    const O_pos = new THREE.Vector3(0, 0.8, 0);

    this.currentLabels = [
      ...AXES_3D_LABELS,
      { key: 'O', at: O_pos, name: 'O', text: 'O', coords: O, color: 'color-indigo' },
      { key: 'T', at: T_pos, name: 'T', text: 'T', coords: T, color: 'color-red' },
      { key: 'right', at: rightAngleAt, text: '90°', isAngle: true, color: 'color-teal', show: showAngles },
    ];
    if (showSecant) {
      this.currentLabels.push({ key: 'Q', at: Q.clone().multiplyScalar(1.15), name: 'Q', text: 'Q', coords: Q, color: 'color-yellow' });
    }
    this.overlay.render(this.currentLabels, state.vis3d);
  }
}

/**
 * 5. Alternate Segment 3D Scene View
 */
export class AlternateSegment3DView extends BaseScene3DView {
  constructor(THREE, container) {
    super(THREE, container);
    const R = 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    this.circleWire.scale.setScalar(R);

    this.markerT = makeMarker(THREE, PALETTE.red, 0.18);
    this.markerA = makeMarker(THREE, PALETTE.blue, 0.18);
    this.markerB = makeMarker(THREE, PALETTE.orange, 0.18);
    this.markerD = makeMarker(THREE, PALETTE.lavender, 0.18);

    this.tangentDoubleArrow = makeDoubleArrowLine(THREE, PALETTE.emerald);
    this.chordTA = makeLine(THREE, PALETTE.blue);
    this.chordAB = makeLine(THREE, PALETTE.blue);
    this.chordBT = makeLine(THREE, PALETTE.blue);

    this.diameterTD = makeLine(THREE, PALETTE.lavender, true);
    this.chordDB = makeLine(THREE, PALETTE.lavender, true);

    this.segmentMesh = makeTriMesh(THREE, PALETTE.sky, 0.12);
    this.triMesh = makeTriMesh(THREE, PALETTE.blue, 0.16);
    this.proofTriMesh = makeTriMesh(THREE, PALETTE.lavender, 0.14);
    this.angleTanMesh = makeAngleWedgeMesh(THREE, PALETTE.yellow, 0.65);
    this.angleBMesh = makeAngleWedgeMesh(THREE, PALETTE.yellow, 0.65);

    this.scene.add(
      this.markerT, this.markerA, this.markerB, this.markerD,
      this.tangentDoubleArrow.group, this.chordTA, this.chordAB, this.chordBT,
      this.diameterTD, this.chordDB, this.segmentMesh, this.triMesh, this.proofTriMesh,
      this.angleTanMesh, this.angleBMesh
    );

    this.draggableTargets = [
      { id: 'A', mesh: this.markerA, field: 'angleA', latField: 'latA' },
      { id: 'B', mesh: this.markerB, field: 'angleB', latField: 'latB' },
      { id: 'T', mesh: this.markerT, field: 'angleT', latField: 'latT' },
    ];
  }

  render(state) {
    this.applyCommonVis(state);
    const { THREE, R } = this;
    const latA = state.latA ?? (Math.PI / 2);
    const latB = state.latB ?? (Math.PI / 2);
    const latT = state.latT ?? (Math.PI / 2);
    const T = new THREE.Vector3(
      R * Math.sin(latT) * Math.cos(state.angleT),
      R * Math.cos(latT),
      R * Math.sin(latT) * Math.sin(state.angleT)
    );
    const A = new THREE.Vector3(
      R * Math.sin(latA) * Math.cos(state.angleA),
      R * Math.cos(latA),
      R * Math.sin(latA) * Math.sin(state.angleA)
    );
    const B = new THREE.Vector3(
      R * Math.sin(latB) * Math.cos(state.angleB),
      R * Math.cos(latB),
      R * Math.sin(latB) * Math.sin(state.angleB)
    );
    const D = new THREE.Vector3(
      R * Math.sin(latT) * Math.cos(state.angleT + Math.PI),
      R * Math.cos(latT),
      R * Math.sin(latT) * Math.sin(state.angleT + Math.PI)
    );

    this.markerT.position.copy(T);
    this.markerA.position.copy(A);
    this.markerB.position.copy(B);
    this.markerD.position.copy(D);

    const tanDir = new THREE.Vector3(-Math.sin(state.angleT), 0, Math.cos(state.angleT));
    const L = 14;
    const tan1 = new THREE.Vector3().addVectors(T, tanDir.clone().multiplyScalar(-L));
    const tan2 = new THREE.Vector3().addVectors(T, tanDir.clone().multiplyScalar(L));
    this.tangentDoubleArrow.setPoints(tan1, tan2);

    this.chordTA.geometry.setFromPoints([T, A]);
    this.chordAB.geometry.setFromPoints([A, B]);
    this.chordBT.geometry.setFromPoints([B, T]);

    this.diameterTD.geometry.setFromPoints([T, D]);
    this.diameterTD.computeLineDistances();
    this.chordDB.geometry.setFromPoints([D, B]);
    this.chordDB.computeLineDistances();

    const showProof = Boolean(state.showProofConstruction);
    this.markerD.visible = this.diameterTD.visible = this.chordDB.visible = showProof;

    const arcRange = getSubtendedArcRange3D(state.angleT, state.angleA, state.angleB);
    const TAU = Math.PI * 2;
    const segStart = (arcRange.start + arcRange.sweep) % TAU;
    const segSweep = TAU - arcRange.sweep;
    setSegmentXZVertices(this.segmentMesh.geometry, 0, 0, R, segStart, segSweep, 32);

    setTriVertices(this.triMesh.geometry, T, A, B);
    if (showProof) {
      setTriVertices(this.proofTriMesh.geometry, T, B, D);
    }

    const showArea = (state.vis3d?.area !== false) && (state.showArea !== false);
    this.segmentMesh.visible = showArea;
    this.triMesh.visible = showArea;
    this.proofTriMesh.visible = showProof && showArea;

    // 3D Angle Wedges & Spatial Bisectors
    const showAngles = (state.vis3d?.angles !== false) && (state.showAngles !== false);
    setAngleWedgeVertices3D(this.angleTanMesh, T, tan1, A, 2.5);
    setAngleWedgeVertices3D(this.angleBMesh, B, T, A, 2.4);
    this.angleTanMesh.visible = this.angleBMesh.visible = showAngles;

    const degTan = get3DAngleDegrees(T, tan1, A, THREE);
    const degB = get3DAngleDegrees(B, T, A, THREE);
    const angTPos = get3DAngleBisector(T, tan1, A, 3.2, THREE);
    const angBPos = get3DAngleBisector(B, T, A, 3.2, THREE);

    const T_pos = T.clone().multiplyScalar(1.15);
    const A_pos = A.clone().multiplyScalar(1.15);
    const B_pos = B.clone().multiplyScalar(1.15);
    const D_pos = D.clone().multiplyScalar(1.15);

    this.currentLabels = [
      ...AXES_3D_LABELS,
      { key: 'T', at: T_pos, name: 'T', text: 'T', coords: T, color: 'color-red' },
      { key: 'A', at: A_pos, name: 'A', text: 'A', coords: A, color: 'color-blue' },
      { key: 'B', at: B_pos, name: 'B', text: 'B', coords: B, color: 'color-orange' },
      { key: 'angTan', at: angTPos, text: `α = ${degTan.toFixed(1)}°`, isAngle: true, color: 'color-yellow', show: showAngles },
      { key: 'angB', at: angBPos, text: `α = ${degB.toFixed(1)}°`, isAngle: true, color: 'color-yellow', show: showAngles },
    ];
    if (showProof) {
      this.currentLabels.push({ key: 'D', at: D_pos, name: 'D', text: 'D', coords: D, color: 'color-lavender' });
    }
    this.overlay.render(this.currentLabels, state.vis3d);
  }
}

/**
 * 6. Tangents from External Point 3D Scene View
 */
export class TangentsFromPoint3DView extends BaseScene3DView {
  constructor(THREE, container) {
    super(THREE, container);
    const R = 8;
    this.R = R;
    this.sphere.scale.setScalar(R);
    this.circleWire.scale.setScalar(R);

    this.markerO = makeMarker(THREE, PALETTE.sky, 0.16);
    this.markerP = makeMarker(THREE, PALETTE.red, 0.18);
    this.markerT1 = makeMarker(THREE, PALETTE.emerald, 0.18);
    this.markerT2 = makeMarker(THREE, PALETTE.emerald, 0.18);

    this.lineOP = makeLine(THREE, PALETTE.lavender, true);
    this.radiusOT1 = makeLine(THREE, PALETTE.amber);
    this.radiusOT2 = makeLine(THREE, PALETTE.amber);
    this.tangentPT1 = makeLine(THREE, PALETTE.emerald);
    this.tangentPT2 = makeLine(THREE, PALETTE.emerald);

    this.tri1Mesh = makeTriMesh(THREE, PALETTE.emerald, 0.16);
    this.tri2Mesh = makeTriMesh(THREE, PALETTE.blue, 0.16);
    this.rightAngle1Mesh = makeRightAngleMesh(THREE, PALETTE.teal, 0.75);
    this.rightAngle2Mesh = makeRightAngleMesh(THREE, PALETTE.teal, 0.75);
    this.anglePMesh1 = makeAngleWedgeMesh(THREE, PALETTE.emerald, 0.65);
    this.anglePMesh2 = makeAngleWedgeMesh(THREE, PALETTE.blue, 0.65);
    this.angleOMesh1 = makeAngleWedgeMesh(THREE, PALETTE.emerald, 0.65);
    this.angleOMesh2 = makeAngleWedgeMesh(THREE, PALETTE.blue, 0.65);

    this.scene.add(
      this.markerO, this.markerP, this.markerT1, this.markerT2,
      this.lineOP, this.radiusOT1, this.radiusOT2,
      this.tangentPT1, this.tangentPT2,
      this.tri1Mesh, this.tri2Mesh,
      this.rightAngle1Mesh, this.rightAngle2Mesh,
      this.anglePMesh1, this.anglePMesh2,
      this.angleOMesh1, this.angleOMesh2
    );

    this.draggableTargets = [
      {
        id: 'P',
        mesh: this.markerP,
        onDrag: (angle, hit, store, lat) => {
          const dist3 = hit.length();
          const state = store.get();
          const r2D = state.radius || 120;
          const pixelDist = Math.max(r2D + 15, (dist3 / this.R) * r2D);
          store.set({ pointAngle: angle, pointDist: pixelDist, latP: lat });
        },
      },
    ];
  }

  render(state) {
    this.applyCommonVis(state);
    const { THREE, R } = this;
    const O = new THREE.Vector3(0, 0, 0);
    const distRatio = Math.max(1.15, (state.pointDist || 260) / (state.radius || 120));
    const d = R * distRatio;
    const angP = state.pointAngle || 0;
    const latP = state.latP ?? (Math.PI / 2);

    const P = new THREE.Vector3(
      d * Math.sin(latP) * Math.cos(angP),
      d * Math.cos(latP),
      d * Math.sin(latP) * Math.sin(angP)
    );
    const alpha = Math.acos(Math.min(1, Math.max(-1, R / d)));

    // Unit vector towards P
    const u = P.clone().normalize();
    // Orthogonal vector in the tangential plane
    let v = new THREE.Vector3(0, 1, 0).cross(u);
    if (v.lengthSq() < 0.01) v = new THREE.Vector3(1, 0, 0).cross(u);
    v.normalize();

    // Tangent contact points on sphere
    const T1 = u.clone().multiplyScalar(R * Math.cos(alpha)).add(v.clone().multiplyScalar(R * Math.sin(alpha)));
    const T2 = u.clone().multiplyScalar(R * Math.cos(alpha)).sub(v.clone().multiplyScalar(R * Math.sin(alpha)));

    this.markerO.position.copy(O);
    this.markerP.position.copy(P);
    this.markerT1.position.copy(T1);
    this.markerT2.position.copy(T2);

    this.lineOP.geometry.setFromPoints([O, P]);
    this.lineOP.computeLineDistances();
    this.radiusOT1.geometry.setFromPoints([O, T1]);
    this.radiusOT2.geometry.setFromPoints([O, T2]);
    this.tangentPT1.geometry.setFromPoints([P, T1]);
    this.tangentPT2.geometry.setFromPoints([P, T2]);

    setTriVertices(this.tri1Mesh.geometry, O, T1, P);
    setTriVertices(this.tri2Mesh.geometry, O, T2, P);
    setRightAngle3DVertices(this.rightAngle1Mesh, T1, O, P, 1.3);
    setRightAngle3DVertices(this.rightAngle2Mesh, T2, O, P, 1.3);

    const showArea = (state.vis3d?.area !== false) && (state.showArea !== false);
    this.tri1Mesh.visible = this.tri2Mesh.visible = (state.showCongruence !== false) && showArea;

    // 3D Angle Shading & Spatial Bisectors
    const showAngles = (state.vis3d?.angles !== false) && (state.showAngles !== false);
    this.rightAngle1Mesh.visible = this.rightAngle2Mesh.visible = showAngles;

    setAngleWedgeVertices3D(this.anglePMesh1, P, T1, O, 4.2);
    setAngleWedgeVertices3D(this.anglePMesh2, P, O, T2, 4.2);
    setAngleWedgeVertices3D(this.angleOMesh1, O, T1, P, 2.8);
    setAngleWedgeVertices3D(this.angleOMesh2, O, P, T2, 2.8);
    this.anglePMesh1.visible = this.anglePMesh2.visible = showAngles;
    this.angleOMesh1.visible = this.angleOMesh2.visible = showAngles;

    const degP1 = get3DAngleDegrees(P, T1, O, THREE);
    const degP2 = get3DAngleDegrees(P, O, T2, THREE);
    const degO1 = get3DAngleDegrees(O, T1, P, THREE);
    const degO2 = get3DAngleDegrees(O, P, T2, THREE);

    const angP1Pos = get3DAngleBisector(P, T1, O, 5.8, THREE);
    const angP2Pos = get3DAngleBisector(P, O, T2, 5.8, THREE);
    const angO1Pos = get3DAngleBisector(O, T1, P, 3.8, THREE);
    const angO2Pos = get3DAngleBisector(O, P, T2, 3.8, THREE);

    const right1Pos = get3DAngleBisector(T1, O, P, 3.0, THREE);
    const right2Pos = get3DAngleBisector(T2, O, P, 3.0, THREE);

    const T1_pos = T1.clone().multiplyScalar(1.15);
    const T2_pos = T2.clone().multiplyScalar(1.15);
    const P_pos = P.clone().multiplyScalar(1.08);
    const O_pos = new THREE.Vector3(0, 0.8, 0);

    this.currentLabels = [
      ...AXES_3D_LABELS,
      { key: 'O', at: O_pos, name: 'O', text: 'O', coords: O, color: 'color-sky' },
      { key: 'P', at: P_pos, name: 'P', text: 'P', coords: P, color: 'color-red' },
      { key: 'T1', at: T1_pos, name: 'T₁', text: 'T₁', coords: T1, color: 'color-emerald' },
      { key: 'T2', at: T2_pos, name: 'T₂', text: 'T₂', coords: T2, color: 'color-emerald' },
      { key: 'right1', at: right1Pos, text: '90°', isAngle: true, color: 'color-teal', show: showAngles },
      { key: 'right2', at: right2Pos, text: '90°', isAngle: true, color: 'color-teal', show: showAngles },
      { key: 'angO1', at: angO1Pos, text: `β = ${degO1.toFixed(1)}°`, isAngle: true, color: 'color-emerald', show: showAngles },
      { key: 'angO2', at: angO2Pos, text: `β = ${degO2.toFixed(1)}°`, isAngle: true, color: 'color-blue', show: showAngles },
      { key: 'angP1', at: angP1Pos, text: `α = ${degP1.toFixed(1)}°`, isAngle: true, color: 'color-emerald', show: showAngles },
      { key: 'angP2', at: angP2Pos, text: `α = ${degP2.toFixed(1)}°`, isAngle: true, color: 'color-blue', show: showAngles },
    ];
    this.overlay.render(this.currentLabels, state.vis3d);
  }
}

/**
 * 7. Perpendicular Chord Bisector 3D Scene View
 */
export class ChordBisector3DView extends BaseScene3DView {
  constructor(THREE, container) {
    super(THREE, container);
    const R = 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    this.circleWire.scale.setScalar(R);

    this.markerO = makeMarker(THREE, PALETTE.sky, 0.16);
    this.markerA = makeMarker(THREE, PALETTE.blue, 0.18);
    this.markerB = makeMarker(THREE, PALETTE.orange, 0.18);
    this.markerM = makeMarker(THREE, PALETTE.emerald, 0.18);

    this.chordAB = makeLine(THREE, PALETTE.blue);
    this.perpOM = makeLine(THREE, PALETTE.emerald);
    this.lineOA = makeLine(THREE, PALETTE.amber);
    this.lineOB = makeLine(THREE, PALETTE.amber);
    this.bisectorExtArrow = makeDoubleArrowLine(THREE, PALETTE.lavender);

    this.tri1Mesh = makeTriMesh(THREE, PALETTE.blue, 0.16);
    this.tri2Mesh = makeTriMesh(THREE, PALETTE.orange, 0.16);
    this.segmentMesh = makeTriMesh(THREE, PALETTE.sky, 0.12);
    this.rightAngleMesh = makeRightAngleMesh(THREE, PALETTE.teal, 0.75);

    this.scene.add(
      this.markerO, this.markerA, this.markerB, this.markerM,
      this.chordAB, this.perpOM, this.lineOA, this.lineOB,
      this.bisectorExtArrow.group,
      this.tri1Mesh, this.tri2Mesh, this.segmentMesh, this.rightAngleMesh
    );

    this.draggableTargets = [
      { id: 'A', mesh: this.markerA, field: 'angleA', latField: 'latA' },
      { id: 'B', mesh: this.markerB, field: 'angleB', latField: 'latB' },
    ];
  }

  render(state) {
    this.applyCommonVis(state);
    const { THREE, R } = this;
    const latA = state.latA ?? (Math.PI / 2);
    const latB = state.latB ?? (Math.PI / 2);
    const O = new THREE.Vector3(0, 0, 0);
    const A = new THREE.Vector3(
      R * Math.sin(latA) * Math.cos(state.angleA),
      R * Math.cos(latA),
      R * Math.sin(latA) * Math.sin(state.angleA)
    );
    const B = new THREE.Vector3(
      R * Math.sin(latB) * Math.cos(state.angleB),
      R * Math.cos(latB),
      R * Math.sin(latB) * Math.sin(state.angleB)
    );
    const M = new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5);

    this.markerO.position.copy(O);
    this.markerA.position.copy(A);
    this.markerB.position.copy(B);
    this.markerM.position.copy(M);

    this.chordAB.geometry.setFromPoints([A, B]);
    this.perpOM.geometry.setFromPoints([O, M]);

    this.lineOA.geometry.setFromPoints([O, A]);
    this.lineOB.geometry.setFromPoints([O, B]);
    this.lineOA.visible = this.lineOB.visible = state.showRadii !== false;

    const dirOM = M.clone().normalize();
    const ext1 = dirOM.clone().multiplyScalar(-14);
    const ext2 = dirOM.clone().multiplyScalar(14);
    this.bisectorExtArrow.setPoints(ext1, ext2);
    this.bisectorExtArrow.group.visible = state.showExtendedBisector !== false;

    setTriVertices(this.tri1Mesh.geometry, O, A, M);
    setTriVertices(this.tri2Mesh.geometry, O, B, M);
    setRightAngle3DVertices(this.rightAngleMesh, M, O, A, 1.4);

    const { start, sweep } = getMinorArcRange3D(state.angleA, state.angleB);
    setSegmentXZVertices(this.segmentMesh.geometry, 0, 0, R, start, sweep);

    const showArea = (state.vis3d?.area !== false) && (state.showArea !== false);
    this.tri1Mesh.visible = this.tri2Mesh.visible = showArea;
    this.segmentMesh.visible = showArea;

    // 3D Angle Shading & Spatial Bisector
    const showAngles = (state.vis3d?.angles !== false) && (state.showAngles !== false);
    this.rightAngleMesh.visible = showAngles;

    const rightPos = get3DAngleBisector(M, O, A, 3.2, THREE);

    const A_pos = A.clone().multiplyScalar(1.15);
    const B_pos = B.clone().multiplyScalar(1.15);
    const M_pos = M.clone().add(dirOM.clone().multiplyScalar(1.2));
    const O_pos = new THREE.Vector3(0, 0.8, 0);

    this.currentLabels = [
      ...AXES_3D_LABELS,
      { key: 'O', at: O_pos, name: 'O', text: 'O', coords: O, color: 'color-sky' },
      { key: 'A', at: A_pos, name: 'A', text: 'A', coords: A, color: 'color-blue' },
      { key: 'B', at: B_pos, name: 'B', text: 'B', coords: B, color: 'color-orange' },
      { key: 'M', at: M_pos, name: 'M', text: 'M', coords: M, color: 'color-emerald' },
      { key: 'right', at: rightPos, text: '90°', isAngle: true, color: 'color-teal', show: showAngles },
    ];
    this.overlay.render(this.currentLabels, state.vis3d);
  }
}


