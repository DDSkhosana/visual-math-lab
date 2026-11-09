/**
 * Functions3DView — True 3D Spatial Representations for Functions, Inverses & Reversibility
 * Visual Mathematics Lab — Module 1
 * 
 * Provides 4 toggleable 3D representation modes:
 * 1. 'spatial-bipartite': 3D Venn / Spatial Bipartite Mapping on Parallel Planes (Z = -5 and Z = +5)
 *    with 3D Bezier conduit tubes, collision halos, and unhit element rings.
 * 2. 'analytic-surface': 3D Cartesian coordinates with continuous curve tube (x, f(x), 0),
 *    semi-transparent amber identity plane sheet (y = x), inverse curve (f(x), x, 0),
 *    and 3D reflection chords.
 * 3. 'grid-beacons': 3D Discrete Coordinate Matrix Grid (X × Y) with rising cylindrical beacons
 *    and animated vertical/horizontal line test scanning sheets.
 * 4. 'pipeline-3d': 3D Round-Trip Composition Helical Chamber Loop with animated flowing particles
 *    demonstrating (f⁻¹ ∘ f)(x) = x identity conservation vs information loss.
 */

export class Functions3DView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;

    this.mode = 'spatial-bipartite'; // 'spatial-bipartite' | 'analytic-surface' | 'grid-beacons' | 'pipeline-3d'
    this.cameraPreset = 'iso';

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.animFrameId = null;

    // Sub-scene object groups
    this.bipartiteGroup = null;
    this.analyticGroup = null;
    this.gridGroup = null;
    this.pipelineGroup = null;

    // Particle flow state
    this.particles = [];
    this.particleTime = 0;

    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;

    const THREE = window.THREE;
    if (!THREE) {
      this.container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:0.85rem;text-align:center;padding:20px;">
          <div style="font-size:1.8rem;margin-bottom:8px;">🌐</div>
          <div><strong>3D Spatial Viewport</strong></div>
          <div style="font-size:0.75rem;margin-top:4px;color:#64748b;">Loading Three.js spatial engine...</div>
        </div>
      `;
      return;
    }

    this.container.innerHTML = '';
    const width = this.container.clientWidth || 600;
    const height = this.container.clientHeight || 450;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070b14);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.setCameraPreset('iso');

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    if (THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.rotateSpeed = 0.85;
      this.controls.zoomSpeed = 1.0;
      this.controls.panSpeed = 0.8;
      this.controls.minDistance = 5;
      this.controls.maxDistance = 60;
    }

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 0.8);
    dirLight1.position.set(12, 20, 15);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xc084fc, 0.6);
    dirLight2.position.set(-12, -10, -15);
    this.scene.add(dirLight2);

    // 6. Object Groups
    this.bipartiteGroup = new THREE.Group();
    this.analyticGroup = new THREE.Group();
    this.gridGroup = new THREE.Group();
    this.pipelineGroup = new THREE.Group();

    this.scene.add(this.bipartiteGroup);
    this.scene.add(this.analyticGroup);
    this.scene.add(this.gridGroup);
    this.scene.add(this.pipelineGroup);

    // 7. Animation Loop
    const animate = () => {
      this.animFrameId = requestAnimationFrame(animate);
      if (this.controls) this.controls.update();

      this.particleTime += 0.015;
      this.updateAnimatedParticles();

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animate();

    window.addEventListener('resize', () => this.resize());
  }

  setCameraPreset(preset) {
    this.cameraPreset = preset;
    if (!this.camera) return;

    if (preset === 'top') {
      this.camera.position.set(0, 24, 0.001);
      this.camera.up.set(0, 0, -1);
    } else if (preset === 'front') {
      this.camera.position.set(0, 0, 24);
      this.camera.up.set(0, 1, 0);
    } else if (preset === 'side') {
      this.camera.position.set(24, 0, 0);
      this.camera.up.set(0, 1, 0);
    } else {
      // Default: Isometric / Perspective
      this.camera.position.set(14, 11, 16);
      this.camera.up.set(0, 1, 0);
    }

    if (this.controls) {
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }
  }

  setMode(mode) {
    this.mode = mode;
    if (!this.scene) return;

    this.bipartiteGroup.visible = (mode === 'spatial-bipartite');
    this.analyticGroup.visible = (mode === 'analytic-surface');
    this.gridGroup.visible = (mode === 'grid-beacons');
    this.pipelineGroup.visible = (mode === 'pipeline-3d');

    if (this.controller) {
      this.render(this.controller.state);
    }
  }

  resize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width > 0 && height > 0) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  render(state) {
    if (!this.scene) {
      const THREE = window.THREE;
      if (THREE) {
        this.init();
      } else {
        return;
      }
    }

    this.bipartiteGroup.visible = (this.mode === 'spatial-bipartite');
    this.analyticGroup.visible = (this.mode === 'analytic-surface');
    this.gridGroup.visible = (this.mode === 'grid-beacons');
    this.pipelineGroup.visible = (this.mode === 'pipeline-3d');

    if (this.mode === 'spatial-bipartite') {
      this.buildSpatialBipartite(state);
    } else if (this.mode === 'analytic-surface') {
      this.buildAnalyticSurface(state);
    } else if (this.mode === 'grid-beacons') {
      this.buildGridBeacons(state);
    } else if (this.mode === 'pipeline-3d') {
      this.buildPipeline3D(state);
    }
  }

  // ==========================================================================
  // MODE 1: 3D Spatial Bipartite / Venn on Parallel Planes (Z = -5 & Z = +5)
  // ==========================================================================
  buildSpatialBipartite(state) {
    const THREE = window.THREE;
    this.clearGroup(this.bipartiteGroup);

    const domain = state.domain || [1, 2, 3, 4, 5];
    const codomain = state.codomain || ['a', 'b', 'c', 'd', 'e'];
    const pairs = state.pairs || [];

    // Count hit frequency for codomain nodes (detect collisions / unhit)
    const hitCount = new Map();
    codomain.forEach(y => hitCount.set(String(y), 0));
    pairs.forEach(([_, y]) => {
      const key = String(y);
      hitCount.set(key, (hitCount.get(key) || 0) + 1);
    });

    // Count outgoing degree for domain nodes (detect partial / multi-valued)
    const outCount = new Map();
    domain.forEach(x => outCount.set(String(x), 0));
    pairs.forEach(([x, _]) => {
      const key = String(x);
      outCount.set(key, (outCount.get(key) || 0) + 1);
    });

    const domainZ = -4.5;
    const codomainZ = 4.5;
    const ringRadius = 4.2;

    // 1. Domain Disk & Ring at Z = -4.5 (Cyan / Emerald)
    const domainDiskGeo = new THREE.CircleGeometry(ringRadius + 0.6, 48);
    const domainDiskMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide
    });
    const domainDisk = new THREE.Mesh(domainDiskGeo, domainDiskMat);
    domainDisk.position.z = domainZ;
    this.bipartiteGroup.add(domainDisk);

    const domainRingGeo = new THREE.RingGeometry(ringRadius + 0.5, ringRadius + 0.65, 48);
    const domainRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const domainRing = new THREE.Mesh(domainRingGeo, domainRingMat);
    domainRing.position.z = domainZ;
    this.bipartiteGroup.add(domainRing);

    // 2. Codomain Disk & Ring at Z = +4.5 (Violet / Rose)
    const codomainDiskGeo = new THREE.CircleGeometry(ringRadius + 0.6, 48);
    const codomainDiskMat = new THREE.MeshBasicMaterial({
      color: 0x7c3aed,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide
    });
    const codomainDisk = new THREE.Mesh(codomainDiskGeo, codomainDiskMat);
    codomainDisk.position.z = codomainZ;
    this.bipartiteGroup.add(codomainDisk);

    const codomainRingGeo = new THREE.RingGeometry(ringRadius + 0.5, ringRadius + 0.65, 48);
    const codomainRingMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide });
    const codomainRing = new THREE.Mesh(codomainRingGeo, codomainRingMat);
    codomainRing.position.z = codomainZ;
    this.bipartiteGroup.add(codomainRing);

    // Helper: Node coordinates around rings
    const domainPositions = new Map();
    domain.forEach((x, i) => {
      const angle = (i / domain.length) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * (ringRadius * 0.72);
      const py = Math.sin(angle) * (ringRadius * 0.72);
      domainPositions.set(String(x), new THREE.Vector3(px, py, domainZ));

      // Domain Sphere
      const deg = outCount.get(String(x)) || 0;
      let nodeColor = 0x38bdf8; // Normal sky blue
      if (deg === 0) nodeColor = 0xf59e0b; // Amber: missing output (totality failure)
      else if (deg > 1) nodeColor = 0xf43f5e; // Rose: multi-valued output (uniqueness failure)

      const sphereGeo = new THREE.SphereGeometry(0.38, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: nodeColor,
        emissive: nodeColor,
        emissiveIntensity: 0.45,
        roughness: 0.2,
        metalness: 0.6
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(px, py, domainZ);
      this.bipartiteGroup.add(sphere);

      // Warning ring if totality / uniqueness violation
      if (deg !== 1) {
        const warnRingGeo = new THREE.RingGeometry(0.5, 0.62, 24);
        const warnRingMat = new THREE.MeshBasicMaterial({ color: nodeColor, side: THREE.DoubleSide });
        const warnRing = new THREE.Mesh(warnRingGeo, warnRingMat);
        warnRing.position.set(px, py, domainZ);
        this.bipartiteGroup.add(warnRing);
      }
    });

    const codomainPositions = new Map();
    codomain.forEach((y, j) => {
      const angle = (j / codomain.length) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * (ringRadius * 0.72);
      const py = Math.sin(angle) * (ringRadius * 0.72);
      codomainPositions.set(String(y), new THREE.Vector3(px, py, codomainZ));

      // Codomain Sphere
      const hits = hitCount.get(String(y)) || 0;
      let nodeColor = 0xa855f7; // Violet normal
      if (hits === 0) nodeColor = 0xf59e0b; // Amber: unhit (surjectivity failure)
      else if (hits > 1) nodeColor = 0xf43f5e; // Rose: collision (injectivity failure)

      const sphereGeo = new THREE.SphereGeometry(0.38, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: nodeColor,
        emissive: nodeColor,
        emissiveIntensity: 0.45,
        roughness: 0.2,
        metalness: 0.6
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(px, py, codomainZ);
      this.bipartiteGroup.add(sphere);

      // Warning halo for collision or unhit
      if (hits !== 1) {
        const warnRingGeo = new THREE.RingGeometry(0.5, 0.62, 24);
        const warnRingMat = new THREE.MeshBasicMaterial({ color: nodeColor, side: THREE.DoubleSide });
        const warnRing = new THREE.Mesh(warnRingGeo, warnRingMat);
        warnRing.position.set(px, py, codomainZ);
        this.bipartiteGroup.add(warnRing);
      }
    });

    // 3. 3D Conduit Tubes connecting (x, y) across space
    pairs.forEach(([x, y]) => {
      const start = domainPositions.get(String(x));
      const end = codomainPositions.get(String(y));
      if (!start || !end) return;

      const mid = new THREE.Vector3()
        .addVectors(start, end)
        .multiplyScalar(0.5);
      // Curve outward slightly in 3D
      mid.x += (mid.x >= 0 ? 0.6 : -0.6);
      mid.y += 0.4;

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const tubeGeo = new THREE.TubeGeometry(curve, 28, 0.08, 10, false);

      const hits = hitCount.get(String(y)) || 0;
      const isCollision = hits > 1;
      const tubeColor = isCollision ? 0xf87171 : 0x00f0ff;

      const tubeMat = new THREE.MeshStandardMaterial({
        color: tubeColor,
        emissive: tubeColor,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.88,
        roughness: 0.25
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      this.bipartiteGroup.add(tube);

      // Inverse return tube if requested
      if (state.showInverse) {
        const invMid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        invMid.y -= 0.6;
        const invCurve = new THREE.QuadraticBezierCurve3(end, invMid, start);
        const invTubeGeo = new THREE.TubeGeometry(invCurve, 28, 0.06, 8, false);
        const invTubeMat = new THREE.MeshStandardMaterial({
          color: 0xf472b6,
          emissive: 0xf472b6,
          emissiveIntensity: 0.55,
          transparent: true,
          opacity: 0.75
        });
        const invTube = new THREE.Mesh(invTubeGeo, invTubeMat);
        this.bipartiteGroup.add(invTube);
      }
    });

    // Center Coordinate Axis Guide
    const centerAxisGeo = new THREE.CylinderGeometry(0.03, 0.03, codomainZ - domainZ, 8);
    const centerAxisMat = new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.4 });
    const centerAxis = new THREE.Mesh(centerAxisGeo, centerAxisMat);
    centerAxis.rotation.x = Math.PI / 2;
    this.bipartiteGroup.add(centerAxis);
  }

  // ==========================================================================
  // MODE 2: 3D Continuous Analytic Curve & y = x Identity Sheet
  // ==========================================================================
  buildAnalyticSurface(state) {
    const THREE = window.THREE;
    this.clearGroup(this.analyticGroup);

    // 1. 3D Coordinate Grid & Axes
    const gridHelper = new THREE.GridHelper(16, 16, 0x334155, 0x1e293b);
    gridHelper.position.y = 0;
    this.analyticGroup.add(gridHelper);

    // X-axis (Red/Sky) & Y-axis (Green/Violet)
    const axisMatX = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
    const axisGeoX = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-8, 0, 0),
      new THREE.Vector3(8, 0, 0)
    ]);
    this.analyticGroup.add(new THREE.Line(axisGeoX, axisMatX));

    const axisMatY = new THREE.LineBasicMaterial({ color: 0xa855f7 });
    const axisGeoY = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -8, 0),
      new THREE.Vector3(0, 8, 0)
    ]);
    this.analyticGroup.add(new THREE.Line(axisGeoY, axisMatY));

    // 2. The 3D Semi-Transparent Amber Identity Plane (y = x)
    const planeGeo = new THREE.PlaneGeometry(16, 8);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const mirrorPlane = new THREE.Mesh(planeGeo, planeMat);
    mirrorPlane.rotation.z = Math.PI / 4; // 45 degrees: y = x
    this.analyticGroup.add(mirrorPlane);

    // Amber identity border line
    const mirrorLineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 });
    const mirrorLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-8, -8, 0),
      new THREE.Vector3(8, 8, 0)
    ]);
    this.analyticGroup.add(new THREE.Line(mirrorLineGeo, mirrorLineMat));

    // 3. Continuous Curve (x, f(x), 0)
    const formulaStr = state.customFormulaStr || '2*x + 1';
    let fn = (x) => 2 * x + 1;
    if (state.analyticPreset === 'linear') fn = (x) => 2 * x + 1;
    else if (state.analyticPreset === 'exponential') fn = (x) => Math.exp(x * 0.5);
    else if (state.analyticPreset === 'cubic') fn = (x) => 0.15 * Math.pow(x, 3);
    else if (state.analyticPreset === 'quadratic') fn = (x) => 0.25 * x * x;
    else if (state.customModel && typeof state.customModel.evaluate === 'function') {
      fn = (x) => state.customModel.evaluate(x);
    }

    const minX = state.restrictDomain ? 0 : -5;
    const maxX = 5;
    const samples = 140;
    const pointsF = [];
    const pointsInv = [];

    for (let i = 0; i <= samples; i++) {
      const x = minX + (i / samples) * (maxX - minX);
      const y = fn(x);
      if (Number.isFinite(y) && Math.abs(y) <= 8.5) {
        pointsF.push(new THREE.Vector3(x, y, 0));
        pointsInv.push(new THREE.Vector3(y, x, 0)); // Reflected across y = x
      }
    }

    if (pointsF.length > 2) {
      const curveF = new THREE.CatmullRomCurve3(pointsF);
      const tubeGeoF = new THREE.TubeGeometry(curveF, pointsF.length * 2, 0.09, 10, false);
      const tubeMatF = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 0.6,
        roughness: 0.3
      });
      this.analyticGroup.add(new THREE.Mesh(tubeGeoF, tubeMatF));
    }

    if (pointsInv.length > 2) {
      const curveInv = new THREE.CatmullRomCurve3(pointsInv);
      const tubeGeoInv = new THREE.TubeGeometry(curveInv, pointsInv.length * 2, 0.08, 10, false);
      const tubeMatInv = new THREE.MeshStandardMaterial({
        color: 0xb57edc,
        emissive: 0xb57edc,
        emissiveIntensity: 0.55,
        roughness: 0.3
      });
      this.analyticGroup.add(new THREE.Mesh(tubeGeoInv, tubeMatInv));
    }

    // 4. Interactive Tracer Point P(x, y) & Reflected Point P'(y, x)
    const tracerX = state.tracerX ?? 1.5;
    const tracerY = fn(tracerX);
    if (Number.isFinite(tracerY)) {
      const pF = new THREE.Vector3(tracerX, tracerY, 0);
      const pInv = new THREE.Vector3(tracerY, tracerX, 0);
      const pMid = new THREE.Vector3((tracerX + tracerY) / 2, (tracerX + tracerY) / 2, 0);

      // Spheres
      const tracerGeo = new THREE.SphereGeometry(0.24, 20, 20);
      const tracerMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.8 });
      const sphereF = new THREE.Mesh(tracerGeo, tracerMat);
      sphereF.position.copy(pF);
      this.analyticGroup.add(sphereF);

      const invMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: 0xf472b6, emissiveIntensity: 0.8 });
      const sphereInv = new THREE.Mesh(tracerGeo, invMat);
      sphereInv.position.copy(pInv);
      this.analyticGroup.add(sphereInv);

      const midMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.9 });
      const sphereMid = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), midMat);
      sphereMid.position.copy(pMid);
      this.analyticGroup.add(sphereMid);

      // Dashed Reflection Chord between P and P'
      const chordGeo = new THREE.BufferGeometry().setFromPoints([pF, pInv]);
      const chordMat = new THREE.LineDashedMaterial({
        color: 0xfbbf24,
        dashSize: 0.25,
        gapSize: 0.15,
        linewidth: 2
      });
      const chordLine = new THREE.Line(chordGeo, chordMat);
      chordLine.computeLineDistances();
      this.analyticGroup.add(chordLine);
    }

    // 5. Discrete Pairs Projection Chords in 3D
    const pairs = state.pairs || [];
    pairs.forEach(([xVal, yVal]) => {
      let xNum = typeof xVal === 'number' ? xVal : parseFloat(xVal);
      let yNum = typeof yVal === 'number' ? yVal : (yVal.charCodeAt ? yVal.charCodeAt(0) - 96 : parseFloat(yVal));
      if (!isNaN(xNum) && !isNaN(yNum)) {
        const ptF = new THREE.Vector3(xNum, yNum, 0);
        const ptInv = new THREE.Vector3(yNum, xNum, 0);

        const ptGeo = new THREE.SphereGeometry(0.16, 16, 16);
        const ptMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.5 });
        const sphere = new THREE.Mesh(ptGeo, ptMat);
        sphere.position.copy(ptF);
        this.analyticGroup.add(sphere);

        const sphereR = new THREE.Mesh(ptGeo, new THREE.MeshStandardMaterial({ color: 0xb57edc, emissive: 0xb57edc, emissiveIntensity: 0.5 }));
        sphereR.position.copy(ptInv);
        this.analyticGroup.add(sphereR);

        const chord = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([ptF, ptInv]),
          new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.5 })
        );
        this.analyticGroup.add(chord);
      }
    });
  }

  // ==========================================================================
  // MODE 3: 3D Discrete Matrix Coordinate Grid with Rising Beacons & Scanners
  // ==========================================================================
  buildGridBeacons(state) {
    const THREE = window.THREE;
    this.clearGroup(this.gridGroup);

    const domain = state.domain || [1, 2, 3, 4, 5];
    const codomain = state.codomain || ['a', 'b', 'c', 'd', 'e'];
    const pairs = state.pairs || [];

    const spacing = 1.4;
    const originX = -((domain.length - 1) * spacing) / 2;
    const originZ = -((codomain.length - 1) * spacing) / 2;

    // Ground Grid
    const groundGeo = new THREE.PlaneGeometry(domain.length * spacing + 1, codomain.length * spacing + 1);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    this.gridGroup.add(ground);

    // Active Beacons at (x, y)
    pairs.forEach(([x, y]) => {
      const xi = domain.indexOf(x);
      const yj = codomain.indexOf(y);
      if (xi >= 0 && yj >= 0) {
        const posX = originX + xi * spacing;
        const posZ = originZ + yj * spacing;

        const isDiagonal = xi === yj;
        const beaconColor = isDiagonal ? 0xfbbf24 : 0x00f0ff;

        const cylinderGeo = new THREE.CylinderGeometry(0.3, 0.35, 2.2, 24);
        const cylinderMat = new THREE.MeshStandardMaterial({
          color: beaconColor,
          emissive: beaconColor,
          emissiveIntensity: 0.65,
          roughness: 0.2,
          metalness: 0.8
        });
        const beacon = new THREE.Mesh(cylinderGeo, cylinderMat);
        beacon.position.set(posX, 1.1, posZ);
        this.gridGroup.add(beacon);

        // Top halo
        const haloGeo = new THREE.SphereGeometry(0.22, 16, 16);
        const haloMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.position.set(posX, 2.25, posZ);
        this.gridGroup.add(halo);
      }
    });

    // 3D Vertical Line Test Scanner Plane
    const scanPlaneGeo = new THREE.PlaneGeometry(0.15, 3.5);
    const scanPlaneMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const scanPlane = new THREE.Mesh(scanPlaneGeo, scanPlaneMat);
    scanPlane.position.set(0, 1.75, 0);
    this.gridGroup.add(scanPlane);
  }

  // ==========================================================================
  // MODE 4: 3D Round-Trip Composition Helical Chamber Loop
  // ==========================================================================
  buildPipeline3D(state) {
    const THREE = window.THREE;
    this.clearGroup(this.pipelineGroup);

    // 3 Stages: Chamber 1 (X at Z = -6), Chamber 2 (Y at Z = 0), Chamber 3 (X' at Z = +6)
    const stages = [
      { name: 'Domain X', z: -5.5, color: 0x0284c7, rimColor: 0x38bdf8 },
      { name: 'Codomain Y', z: 0, color: 0x7c3aed, rimColor: 0xa855f7 },
      { name: 'Recovered X\'', z: 5.5, color: 0x059669, rimColor: 0x34d399 }
    ];

    stages.forEach((st) => {
      const cylGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.6, 32);
      const cylMat = new THREE.MeshStandardMaterial({
        color: st.color,
        transparent: true,
        opacity: 0.45,
        roughness: 0.3
      });
      const cyl = new THREE.Mesh(cylGeo, cylMat);
      cyl.rotation.x = Math.PI / 2;
      cyl.position.z = st.z;
      this.pipelineGroup.add(cyl);

      const ringGeo = new THREE.TorusGeometry(2.4, 0.08, 16, 48);
      const ringMat = new THREE.MeshBasicMaterial({ color: st.rimColor });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.z = st.z;
      this.pipelineGroup.add(ring);
    });

    // Conduits from Stage 1 -> 2, and Stage 2 -> 3
    const pairs = state.pairs || [];
    const domain = state.domain || [1, 2, 3, 4, 5];
    const codomain = state.codomain || ['a', 'b', 'c', 'd', 'e'];

    pairs.forEach(([x, y]) => {
      const xi = domain.indexOf(x);
      const yj = codomain.indexOf(y);
      if (xi >= 0 && yj >= 0) {
        const a1 = (xi / domain.length) * Math.PI * 2;
        const p1 = new THREE.Vector3(Math.cos(a1) * 1.6, Math.sin(a1) * 1.6, -5.5);

        const a2 = (yj / codomain.length) * Math.PI * 2;
        const p2 = new THREE.Vector3(Math.cos(a2) * 1.6, Math.sin(a2) * 1.6, 0);

        const a3 = a1; // Ideal round-trip return
        const p3 = new THREE.Vector3(Math.cos(a3) * 1.6, Math.sin(a3) * 1.6, 5.5);

        // Forward Tube
        const curve1 = new THREE.QuadraticBezierCurve3(
          p1,
          new THREE.Vector3((p1.x + p2.x) / 2 + 0.3, (p1.y + p2.y) / 2, -2.75),
          p2
        );
        const tube1 = new THREE.Mesh(
          new THREE.TubeGeometry(curve1, 20, 0.06, 8, false),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.5 })
        );
        this.pipelineGroup.add(tube1);

        // Return Tube
        const curve2 = new THREE.QuadraticBezierCurve3(
          p2,
          new THREE.Vector3((p2.x + p3.x) / 2 - 0.3, (p2.y + p3.y) / 2, 2.75),
          p3
        );
        const tube2 = new THREE.Mesh(
          new THREE.TubeGeometry(curve2, 20, 0.06, 8, false),
          new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x34d399, emissiveIntensity: 0.5 })
        );
        this.pipelineGroup.add(tube2);
      }
    });

    // Create particle tracers for the pipeline
    this.initPipelineParticles(pairs, domain, codomain);
  }

  initPipelineParticles(pairs, domain, codomain) {
    const THREE = window.THREE;
    this.particles = [];

    pairs.forEach(([x, y]) => {
      const xi = domain.indexOf(x);
      const yj = codomain.indexOf(y);
      if (xi >= 0 && yj >= 0) {
        const a1 = (xi / domain.length) * Math.PI * 2;
        const p1 = new THREE.Vector3(Math.cos(a1) * 1.6, Math.sin(a1) * 1.6, -5.5);
        const a2 = (yj / codomain.length) * Math.PI * 2;
        const p2 = new THREE.Vector3(Math.cos(a2) * 1.6, Math.sin(a2) * 1.6, 0);
        const a3 = a1;
        const p3 = new THREE.Vector3(Math.cos(a3) * 1.6, Math.sin(a3) * 1.6, 5.5);

        const curve1 = new THREE.QuadraticBezierCurve3(p1, new THREE.Vector3((p1.x + p2.x) / 2 + 0.3, (p1.y + p2.y) / 2, -2.75), p2);
        const curve2 = new THREE.QuadraticBezierCurve3(p2, new THREE.Vector3((p2.x + p3.x) / 2 - 0.3, (p2.y + p3.y) / 2, 2.75), p3);

        const pGeo = new THREE.SphereGeometry(0.12, 12, 12);
        const pMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        const mesh = new THREE.Mesh(pGeo, pMat);
        this.pipelineGroup.add(mesh);

        this.particles.push({ mesh, curve1, curve2, offset: Math.random() });
      }
    });
  }

  updateAnimatedParticles() {
    if (this.mode !== 'pipeline-3d' || !this.particles.length) return;
    this.particles.forEach((p) => {
      const progress = (this.particleTime + p.offset) % 2.0; // 0 to 2: 0..1 for curve1, 1..2 for curve2
      if (progress < 1.0) {
        const pt = p.curve1.getPoint(progress);
        p.mesh.position.copy(pt);
      } else {
        const pt = p.curve2.getPoint(progress - 1.0);
        p.mesh.position.copy(pt);
      }
    });
  }

  clearGroup(group) {
    if (!group) return;
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }
  }

  dispose() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.controls) this.controls.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
