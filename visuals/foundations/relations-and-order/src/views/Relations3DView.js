/**
 * Relations3DView — True 3D WebGL Counterparts for Binary Relations
 * Visual Mathematics Lab — Module 2: Relations, Order & Equivalence
 *
 * Implements 4 Interactive 3D Spatial Representations:
 * 1. Mode 1 ('spatial-digraph'): 3D Spatial Network with Bezier Conduits, Degree Elevations, and Self-Loop Tori
 * 2. Mode 2 ('matrix-beacons'): 3D Boolean Matrix Grid with Illuminated Beacons, Diagonal Rail, and Transposition Arcs
 * 3. Mode 3 ('quotient-3d'): 3D Modular Equivalence Cylinder / Torus with Cluster Halos and Winding Projections
 * 4. Mode 4 ('poset-3d'): 3D Stratified Poset Hasse Tower with Topological Rank Floors and Covering Rods
 */

import { RelationMath } from '../../../js/foundations-core.js';

export class Relations3DView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.animId = null;

    this.mode = 'spatial-digraph'; // 'spatial-digraph' | 'matrix-beacons' | 'quotient-3d' | 'poset-3d'
    this.cameraPreset = 'iso';

    this.dynamicGroup = null;
    this.particlesGroup = null;
    this.clock = null;

    this.colors = {
      sky: 0x38bdf8,
      purple: 0xa855f7,
      emerald: 0x34d399,
      amber: 0xfbbf24,
      rose: 0xf43f5e,
      slate: 0x475569,
      darkSlate: 0x1e293b,
      ground: 0x0a0f1d,
      grid: 0x1e293b,
      text: 0xf8fafc
    };

    this.init();
  }

  init() {
    if (typeof window === 'undefined' || !window.THREE) return;

    const THREE = window.THREE;
    this.clock = new THREE.Clock();

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090d16);
    this.scene.fog = new THREE.FogExp2(0x090d16, 0.022);

    // 2. Camera setup
    const rect = this.container.getBoundingClientRect();
    const width = rect.width || 600;
    const height = rect.height || 450;
    const aspect = width / height;

    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.applyCameraPreset('iso');

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    if (THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.06;
      this.controls.maxDistance = 50;
      this.controls.minDistance = 3;
    }

    // 5. Lighting
    this.setupLighting();

    // 6. Dynamic group
    this.dynamicGroup = new THREE.Group();
    this.scene.add(this.dynamicGroup);

    // 7. Event listeners
    window.addEventListener('resize', () => this.resize());

    // 8. Start animation loop
    this.animate();
  }

  setupLighting() {
    const THREE = window.THREE;
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight1.position.set(15, 20, 15);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 0.8);
    dirLight2.position.set(-15, 12, -15);
    this.scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xfbbf24, 0.9, 30);
    pointLight.position.set(0, 8, 0);
    this.scene.add(pointLight);
  }

  setMode(mode) {
    this.mode = mode;
    if (this.controller && this.controller.state) {
      this.render(this.controller.state);
    }
  }

  setCameraPreset(preset) {
    this.cameraPreset = preset;
    this.applyCameraPreset(preset);
  }

  applyCameraPreset(preset) {
    if (!this.camera) return;
    const targets = {
      iso: { pos: [11, 10, 11], lookAt: [0, 0, 0] },
      top: { pos: [0, 18, 0.001], lookAt: [0, 0, 0] },
      front: { pos: [0, 0, 18], lookAt: [0, 0, 0] },
      side: { pos: [18, 0, 0], lookAt: [0, 0, 0] }
    };
    const cfg = targets[preset] || targets.iso;
    this.camera.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
    if (this.controls) {
      this.controls.target.set(cfg.lookAt[0], cfg.lookAt[1], cfg.lookAt[2]);
      this.controls.update();
    } else {
      this.camera.lookAt(cfg.lookAt[0], cfg.lookAt[1], cfg.lookAt[2]);
    }
  }

  resize() {
    if (!this.renderer || !this.camera || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    const width = rect.width || 600;
    const height = rect.height || 450;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    this.animId = requestAnimationFrame(() => this.animate());
    const delta = this.clock ? this.clock.getDelta() : 0.016;
    const elapsed = this.clock ? this.clock.getElapsedTime() : 0;

    if (this.controls) {
      this.controls.update();
    }

    // Animate self-loop tori and conduits
    if (this.dynamicGroup) {
      this.dynamicGroup.traverse((child) => {
        if (child.userData && child.userData.isLoop) {
          child.rotation.z += delta * 1.2;
        } else if (child.userData && child.userData.isBeaconPulse) {
          const s = 1 + 0.06 * Math.sin(elapsed * 3 + child.userData.pulseOffset);
          child.scale.set(s, 1, s);
        } else if (child.userData && child.userData.isHelixRing) {
          child.rotation.y += delta * 0.25;
        }
      });
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  disposeGroup(group) {
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }
  }

  render(state) {
    if (typeof window === 'undefined' || !window.THREE || !this.dynamicGroup) return;

    this.disposeGroup(this.dynamicGroup);

    const { elements, pairs } = state;
    const analysis = RelationMath.analyzeRelation(elements, pairs);

    switch (this.mode) {
      case 'matrix-beacons':
        this.renderMatrixBeacons(elements, pairs, analysis, state);
        break;
      case 'quotient-3d':
        this.renderQuotient3D(elements, pairs, analysis, state);
        break;
      case 'poset-3d':
        this.renderPoset3D(elements, pairs, analysis, state);
        break;
      case 'spatial-digraph':
      default:
        this.renderSpatialDigraph(elements, pairs, analysis, state);
        break;
    }
  }

  // ==========================================================================
  // MODE 1: 3D Spatial Digraph (Elevated Network Graph)
  // ==========================================================================
  renderSpatialDigraph(elements, pairs, analysis, state) {
    const THREE = window.THREE;
    const n = elements.length;
    const pairSet = new Set(pairs.map(([a, b]) => `${a}->${b}`));

    // Compute node degrees for 3D elevation
    const inDeg = new Map(elements.map(e => [e, 0]));
    const outDeg = new Map(elements.map(e => [e, 0]));
    for (const [a, b] of pairs) {
      if (outDeg.has(a)) outDeg.set(a, outDeg.get(a) + 1);
      if (inDeg.has(b)) inDeg.set(b, inDeg.get(b) + 1);
    }

    // Ground reflective ring
    const groundGeo = new THREE.RingGeometry(2.5, 6.8, 48);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = Math.PI / 2;
    ground.position.y = -0.05;
    this.dynamicGroup.add(ground);

    // Position map for 3D coordinates
    const nodeCoords = new Map();
    const R = 5.2;

    elements.forEach((elem, idx) => {
      const angle = (idx / n) * 2 * Math.PI - Math.PI / 2;
      const x = R * Math.cos(angle);
      const z = R * Math.sin(angle);
      const netDeg = (inDeg.get(elem) || 0) - (outDeg.get(elem) || 0);
      const y = netDeg * 0.45; // Height modulated by net flux

      nodeCoords.set(elem, new THREE.Vector3(x, y, z));

      // Node Sphere
      const sphereGeo = new THREE.SphereGeometry(0.55, 32, 32);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x0f172a
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(x, y, z);
      this.dynamicGroup.add(sphere);

      // Glowing outer rim
      const rimGeo = new THREE.TorusGeometry(0.58, 0.05, 16, 32);
      const hasLoop = pairSet.has(`${elem}->${elem}`);
      const rimMat = new THREE.MeshBasicMaterial({
        color: hasLoop ? this.colors.sky : this.colors.slate
      });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.position.set(x, y, z);
      rim.rotation.x = Math.PI / 2;
      this.dynamicGroup.add(rim);

      // Vertical pedestal dropping to floor
      const pedLineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0, z),
        new THREE.Vector3(x, y, z)
      ]);
      const pedLineMat = new THREE.LineBasicMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.6
      });
      this.dynamicGroup.add(new THREE.Line(pedLineGeo, pedLineMat));

      // Text label sprite
      const sprite = this.createTextSprite(String(elem), '#38bdf8');
      sprite.position.set(x, y + 0.95, z);
      this.dynamicGroup.add(sprite);

      // Self-loop (a, a)
      if (hasLoop) {
        const loopGeo = new THREE.TorusGeometry(0.55, 0.08, 16, 32);
        const loopMat = new THREE.MeshStandardMaterial({
          color: this.colors.sky,
          emissive: this.colors.sky,
          emissiveIntensity: 0.45,
          metalness: 0.5,
          roughness: 0.3
        });
        const loopMesh = new THREE.Mesh(loopGeo, loopMat);
        loopMesh.position.set(x, y + 0.65, z);
        loopMesh.rotation.x = Math.PI / 3;
        loopMesh.userData = { isLoop: true };
        this.dynamicGroup.add(loopMesh);
      }
    });

    // Directed 3D Conduit Arcs
    for (const [a, b] of pairs) {
      if (a === b) continue; // Handled as self-loops above
      const posA = nodeCoords.get(a);
      const posB = nodeCoords.get(b);
      if (!posA || !posB) continue;

      const isSymmetric = pairSet.has(`${b}->${a}`);
      const color = isSymmetric ? this.colors.purple : this.colors.sky;

      // Arc out/upward
      const mid = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(posB, posA);
      const len = dir.length();
      const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

      const curveOffset = isSymmetric ? (a < b ? 1.2 : -1.2) : 0.8;
      const ctrl = mid.clone().add(perp.multiplyScalar(curveOffset));
      ctrl.y += Math.max(1.0, len * 0.25);

      const curve = new THREE.QuadraticBezierCurve3(posA, ctrl, posB);
      const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.07, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.35,
        roughness: 0.3
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      this.dynamicGroup.add(tube);

      // Directional Cone Arrowhead
      const arrowPoint = curve.getPoint(0.88);
      const tangent = curve.getTangent(0.88).normalize();
      const coneGeo = new THREE.ConeGeometry(0.18, 0.45, 16);
      const coneMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.copy(arrowPoint);
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      this.dynamicGroup.add(cone);
    }

    // Missing Transitive Shortcuts (Visualizing non-transitivity)
    if (state.highlightTransitiveViolations && analysis.missingTransitive && analysis.missingTransitive.length > 0) {
      for (const { a, c } of analysis.missingTransitive) {
        if (a === c) continue;
        const posA = nodeCoords.get(a);
        const posC = nodeCoords.get(c);
        if (!posA || !posC) continue;

        const mid = new THREE.Vector3().addVectors(posA, posC).multiplyScalar(0.5);
        mid.y -= 0.6; // Dip underneath
        const curve = new THREE.QuadraticBezierCurve3(posA, mid, posC);
        const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.04, 6, false);
        const tubeMat = new THREE.MeshBasicMaterial({
          color: this.colors.amber,
          transparent: true,
          opacity: 0.65
        });
        this.dynamicGroup.add(new THREE.Mesh(tubeGeo, tubeMat));
      }
    }
  }

  // ==========================================================================
  // MODE 2: 3D Boolean Matrix Grid with Beacons & Transposition Arcs
  // ==========================================================================
  renderMatrixBeacons(elements, pairs, analysis, state) {
    const THREE = window.THREE;
    const n = elements.length;
    const pairSet = new Set(pairs.map(([a, b]) => `${a}->${b}`));
    const cellSize = 1.6;
    const halfWidth = (n * cellSize) / 2;

    // Matrix Base Grid Platform
    const planeGeo = new THREE.PlaneGeometry(n * cellSize + 0.8, n * cellSize + 0.8);
    const planeMat = new THREE.MeshStandardMaterial({
      color: 0x0c1322,
      roughness: 0.4,
      metalness: 0.7
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.05;
    this.dynamicGroup.add(plane);

    // Diagonal Reflection Rail (i = j)
    const railPts = [
      new THREE.Vector3(-halfWidth, 0.02, -halfWidth),
      new THREE.Vector3(halfWidth, 0.02, halfWidth)
    ];
    const railGeo = new THREE.BufferGeometry().setFromPoints(railPts);
    const railMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
    this.dynamicGroup.add(new THREE.Line(railGeo, railMat));

    // Cell Beacons
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const u = elements[i];
        const v = elements[j];
        const hasRel = pairSet.has(`${u}->${v}`);
        const isDiagonal = i === j;
        const x = j * cellSize - halfWidth + cellSize / 2;
        const z = i * cellSize - halfWidth + cellSize / 2;

        // Ground cell plate
        const plateGeo = new THREE.PlaneGeometry(cellSize * 0.9, cellSize * 0.9);
        const plateMat = new THREE.MeshBasicMaterial({
          color: hasRel ? (isDiagonal ? 0x0369a1 : 0x4c1d95) : 0x1e293b,
          transparent: true,
          opacity: hasRel ? 0.85 : 0.4
        });
        const plate = new THREE.Mesh(plateGeo, plateMat);
        plate.rotation.x = -Math.PI / 2;
        plate.position.set(x, 0, z);
        this.dynamicGroup.add(plate);

        if (hasRel) {
          const isSymm = pairSet.has(`${v}->${u}`);
          const height = isDiagonal ? 3.0 : 2.4;
          const color = isDiagonal
            ? this.colors.sky
            : (isSymm ? this.colors.purple : this.colors.amber);

          // Elevated Beacon Column
          const colGeo = new THREE.CylinderGeometry(0.28, 0.32, height, 24);
          const colMat = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.35,
            metalness: 0.6,
            roughness: 0.3
          });
          const col = new THREE.Mesh(colGeo, colMat);
          col.position.set(x, height / 2, z);
          col.userData = { isBeaconPulse: true, pulseOffset: i + j };
          this.dynamicGroup.add(col);

          // Top Beacon Orb
          const orbGeo = new THREE.SphereGeometry(0.35, 24, 24);
          const orbMat = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.7
          });
          const orb = new THREE.Mesh(orbGeo, orbMat);
          orb.position.set(x, height + 0.15, z);
          this.dynamicGroup.add(orb);

          // Symmetry Arcs (connecting (i, j) to (j, i) across the diagonal rail)
          if (!isDiagonal && isSymm && i < j) {
            const xTwin = i * cellSize - halfWidth + cellSize / 2;
            const zTwin = j * cellSize - halfWidth + cellSize / 2;
            const p1 = new THREE.Vector3(x, height, z);
            const p2 = new THREE.Vector3(xTwin, height, zTwin);
            const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
            mid.y += 1.8; // Arch upwards

            const arcCurve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
            const arcTubeGeo = new THREE.TubeGeometry(arcCurve, 24, 0.06, 8, false);
            const arcTubeMat = new THREE.MeshStandardMaterial({
              color: this.colors.purple,
              emissive: this.colors.purple,
              emissiveIntensity: 0.4
            });
            this.dynamicGroup.add(new THREE.Mesh(arcTubeGeo, arcTubeMat));
          }
        }
      }
    }
  }

  // ==========================================================================
  // MODE 3: 3D Equivalence Partition Torus & Modular Congruence Dial
  // ==========================================================================
  renderQuotient3D(elements, pairs, analysis, state) {
    const THREE = window.THREE;
    const classes = RelationMath.computeEquivalenceClasses(elements, pairs);
    const numClasses = Math.max(1, classes.length);
    const classColors = [this.colors.sky, this.colors.purple, this.colors.emerald, this.colors.amber, this.colors.rose];

    const mainRadius = 5.5;

    classes.forEach((eqClass, cIdx) => {
      const classAngle = (cIdx / numClasses) * 2 * Math.PI;
      const classColor = classColors[cIdx % classColors.length];
      const cx = mainRadius * Math.cos(classAngle);
      const cz = mainRadius * Math.sin(classAngle);

      // Class Bounding Torus Ring on Floor
      const classRingGeo = new THREE.TorusGeometry(1.5, 0.08, 16, 48);
      const classRingMat = new THREE.MeshStandardMaterial({
        color: classColor,
        emissive: classColor,
        emissiveIntensity: 0.4,
        metalness: 0.5
      });
      const ringMesh = new THREE.Mesh(classRingGeo, classRingMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.set(cx, 0.05, cz);
      ringMesh.userData = { isHelixRing: true };
      this.dynamicGroup.add(ringMesh);

      // Label for Equivalence Class [x]
      const rep = eqClass[0];
      const classSprite = this.createTextSprite(`[${rep}] = {${eqClass.join(', ')}}`, `#${classColor.toString(16)}`);
      classSprite.position.set(cx, 2.4, cz);
      this.dynamicGroup.add(classSprite);

      // Elements inside class
      const m = eqClass.length;
      const subCoords = [];
      eqClass.forEach((elem, eIdx) => {
        const subAngle = (eIdx / m) * 2 * Math.PI;
        const subR = m > 1 ? 0.85 : 0;
        const ex = cx + subR * Math.cos(subAngle);
        const ez = cz + subR * Math.sin(subAngle);
        const ey = 0.6;

        subCoords.push(new THREE.Vector3(ex, ey, ez));

        const nodeGeo = new THREE.SphereGeometry(0.42, 24, 24);
        const nodeMat = new THREE.MeshStandardMaterial({
          color: classColor,
          emissive: classColor,
          emissiveIntensity: 0.5,
          metalness: 0.7,
          roughness: 0.2
        });
        const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
        nodeMesh.position.set(ex, ey, ez);
        this.dynamicGroup.add(nodeMesh);

        // Node ID Label
        const lbl = this.createTextSprite(String(elem), '#ffffff');
        lbl.position.set(ex, ey + 0.65, ez);
        this.dynamicGroup.add(lbl);
      });

      // Internal full connectivity cords for equivalence classes
      for (let i = 0; i < subCoords.length; i++) {
        for (let j = i + 1; j < subCoords.length; j++) {
          const cordGeo = new THREE.BufferGeometry().setFromPoints([subCoords[i], subCoords[j]]);
          const cordMat = new THREE.LineBasicMaterial({
            color: classColor,
            transparent: true,
            opacity: 0.6,
            linewidth: 2
          });
          this.dynamicGroup.add(new THREE.Line(cordGeo, cordMat));
        }
      }
    });
  }

  // ==========================================================================
  // MODE 4: 3D Poset Hasse Tower with Topological Rank Floors
  // ==========================================================================
  renderPoset3D(elements, pairs, analysis, state) {
    const THREE = window.THREE;
    const n = elements.length;

    // 1. Strict pairs (no self loops)
    const strictPairs = pairs.filter(([a, b]) => a !== b);

    // 2. Transitive reduction (strict covering a <• b)
    const isTransitive = (a, b) => {
      return strictPairs.some(([x, y]) => x === a && strictPairs.some(([u, v]) => u === y && v === b));
    };
    const coveringEdges = strictPairs.filter(([a, b]) => !isTransitive(a, b));

    // 3. Compute topological heights / ranks
    const rankMap = new Map();
    const childrenMap = new Map();
    const parentsMap = new Map();

    elements.forEach(e => {
      rankMap.set(e, 0);
      childrenMap.set(e, []);
      parentsMap.set(e, []);
    });

    for (const [a, b] of coveringEdges) {
      if (childrenMap.has(a)) childrenMap.get(a).push(b);
      if (parentsMap.has(b)) parentsMap.get(b).push(a);
    }

    // Relaxation algorithm for height
    for (let iter = 0; iter < n; iter++) {
      for (const [a, b] of coveringEdges) {
        const curA = rankMap.get(a) || 0;
        const curB = rankMap.get(b) || 0;
        if (curB <= curA) {
          rankMap.set(b, curA + 1);
        }
      }
    }

    // Group elements by rank
    const rankBuckets = new Map();
    elements.forEach(e => {
      const r = rankMap.get(e) || 0;
      if (!rankBuckets.has(r)) rankBuckets.set(r, []);
      rankBuckets.get(r).push(e);
    });

    const maxRank = Math.max(...Array.from(rankBuckets.keys()), 0);
    const nodeCoords = new Map();

    // Render horizontal Rank Floors
    for (let r = 0; r <= maxRank; r++) {
      const y = (r - maxRank / 2) * 2.8;

      const floorGeo = new THREE.PlaneGeometry(8, 8);
      const floorMat = new THREE.MeshBasicMaterial({
        color: r === 0 ? this.colors.emerald : (r === maxRank ? this.colors.amber : 0x1e293b),
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide
      });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = y;
      this.dynamicGroup.add(floor);

      // Rank Badge Sprite
      const rankText = r === 0 ? 'Rank 0 (Minima / ⊥)' : (r === maxRank ? `Rank ${r} (Maxima / ⊤)` : `Level ${r}`);
      const rankSprite = this.createTextSprite(rankText, '#94a3b8');
      rankSprite.position.set(-4.5, y + 0.3, 0);
      this.dynamicGroup.add(rankSprite);

      // Position vertices on this floor
      const bucket = rankBuckets.get(r) || [];
      const m = bucket.length;
      bucket.forEach((elem, idx) => {
        const x = (idx - (m - 1) / 2) * 2.2;
        const z = 0;
        nodeCoords.set(elem, new THREE.Vector3(x, y + 0.45, z));

        const isMin = (parentsMap.get(elem) || []).length === 0;
        const isMax = (childrenMap.get(elem) || []).length === 0;
        const color = isMin ? this.colors.emerald : (isMax ? this.colors.amber : this.colors.sky);

        // Poset Node
        const sphereGeo = new THREE.SphereGeometry(0.48, 24, 24);
        const sphereMat = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.45,
          metalness: 0.7
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.set(x, y + 0.45, z);
        this.dynamicGroup.add(sphere);

        // Node ID
        const lbl = this.createTextSprite(String(elem), '#ffffff');
        lbl.position.set(x, y + 1.15, z);
        this.dynamicGroup.add(lbl);
      });
    }

    // Covering Rods (Upward transitive reduction edges)
    for (const [a, b] of coveringEdges) {
      const posA = nodeCoords.get(a);
      const posB = nodeCoords.get(b);
      if (!posA || !posB) continue;

      const rodPts = [posA, posB];
      const curve = new THREE.CatmullRomCurve3(rodPts);
      const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.08, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: this.colors.emerald,
        emissive: this.colors.emerald,
        emissiveIntensity: 0.45,
        metalness: 0.6
      });
      this.dynamicGroup.add(new THREE.Mesh(tubeGeo, tubeMat));

      // Upward Arrowhead
      const mid = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(posB, posA).normalize();
      const coneGeo = new THREE.ConeGeometry(0.2, 0.45, 16);
      const coneMat = new THREE.MeshStandardMaterial({ color: this.colors.emerald, emissive: this.colors.emerald });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.copy(mid);
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      this.dynamicGroup.add(cone);
    }
  }

  // ==========================================================================
  // Utility: Text Sprite Generator
  // ==========================================================================
  createTextSprite(text, colorStr = '#38bdf8') {
    const THREE = window.THREE;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(10, 8, 236, 48, 8);
    ctx.fill();
    ctx.strokeStyle = colorStr;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = colorStr;
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2.4, 0.6, 1);
    return sprite;
  }
}
