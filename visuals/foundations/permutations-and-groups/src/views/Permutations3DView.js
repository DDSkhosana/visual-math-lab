/**
 * Permutations3DView — Three.js WebGL 3D Counterpart View for Permutations & Symmetric Groups S_n
 * Visual Mathematics Lab — Module 3
 *
 * Implements 4 true 3D spatial representations:
 * 1. 'spatial-orbits'  : 3D Disjoint Cycle Orbits with elevated torus halos, directed Bezier conduits, and fixed-point beacons.
 * 2. 'braid-3d'        : True 3D Artin Braid Strands with physical tube geometry, over/under elevation braiding, and inversion rings.
 * 3. 'matrix-voxels'   : 3D Permutation Matrix Grid with illuminated rook beacons, gold y=x reflection rail, and 3D transposition arches.
 * 4. 'cayley-3d'       : 3D S3 Permutohedron Cayley Polyhedron with 6 vertex states, generator conduits (τ₁ in fuchsia, τ₂ in sky), and active state highlight.
 */

export class Permutations3DView {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.animId = null;
    this.initialized = false;
    this.mode = 'spatial-orbits'; // 'spatial-orbits' | 'braid-3d' | 'matrix-voxels' | 'cayley-3d'
    this.lastState = null;

    // Camera preset definitions
    this.presets = {
      iso:   { pos: [160, 200, 220], target: [0, 0, 0] },
      top:   { pos: [0, 320, 0.01],  target: [0, 0, 0] },
      front: { pos: [0, 0, 300],    target: [0, 0, 0] },
      side:  { pos: [300, 0, 0],    target: [0, 0, 0] }
    };

    this.palette = {
      sky: 0x38bdf8,
      fuchsia: 0xe879f9,
      emerald: 0x34d399,
      amber: 0xfbbf24,
      violet: 0xa78bfa,
      rose: 0xf43f5e,
      teal: 0x2dd4bf,
      gold: 0xfcd34d,
      grid: 0x1e293b,
      white: 0xf8fafc,
      inactive: 0x475569
    };

    this.cycleColors = [
      0x38bdf8, // Sky
      0xe879f9, // Fuchsia
      0x34d399, // Emerald
      0xfbbf24, // Amber
      0xa78bfa, // Violet
      0x2dd4bf  // Teal
    ];

    this.init();
  }

  init() {
    if (typeof window === 'undefined' || !window.THREE) return;
    if (!this.container) return;

    const width = this.container.clientWidth || 600;
    const height = this.container.clientHeight || 450;

    // 1. Scene
    this.scene = new window.THREE.Scene();
    this.scene.background = new window.THREE.Color(0x090d16);

    // 2. Camera
    this.camera = new window.THREE.PerspectiveCamera(45, width / height, 1, 2000);
    this.setCameraPreset('iso');

    // 3. Renderer
    this.renderer = new window.THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = window.THREE.PCFSoftShadowMap;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // 4. Controls
    if (window.THREE.OrbitControls) {
      this.controls = new window.THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxDistance = 800;
      this.controls.minDistance = 30;
    }

    // 5. Studio Lighting
    const ambientLight = new window.THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambientLight);

    const keyLight = new window.THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(120, 200, 150);
    this.scene.add(keyLight);

    const fillLight = new window.THREE.DirectionalLight(0x38bdf8, 0.4);
    fillLight.position.set(-150, -80, -100);
    this.scene.add(fillLight);

    const topLight = new window.THREE.PointLight(0xe879f9, 0.5, 500);
    topLight.position.set(0, 150, 0);
    this.scene.add(topLight);

    // 6. Animation Loop
    this.initialized = true;
    this.animate = this.animate.bind(this);
    this.animate();
  }

  animate() {
    this.animId = requestAnimationFrame(this.animate);
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  setCameraPreset(presetKey) {
    if (!this.camera || !this.presets[presetKey]) return;
    const p = this.presets[presetKey];
    this.camera.position.set(p.pos[0], p.pos[1], p.pos[2]);
    this.camera.lookAt(p.target[0], p.target[1], p.target[2]);
    if (this.controls) {
      this.controls.target.set(p.target[0], p.target[1], p.target[2]);
      this.controls.update();
    }
  }

  setMode(mode) {
    this.mode = mode;
    if (this.lastState) {
      this.render(this.lastState);
    }
  }

  clearScene() {
    if (!this.scene) return;
    const toRemove = [];
    this.scene.children.forEach(obj => {
      if (obj.type !== 'AmbientLight' && obj.type !== 'DirectionalLight' && obj.type !== 'PointLight') {
        toRemove.push(obj);
      }
    });
    toRemove.forEach(obj => {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
  }

  render(state) {
    if (!this.initialized || !this.scene) return;
    this.lastState = state;
    this.clearScene();

    const n = state.n || 5;
    const mapping = state.mapping || [1, 2, 3, 4, 5];

    if (this.mode === 'spatial-orbits') {
      this.buildSpatialOrbits(n, mapping);
    } else if (this.mode === 'braid-3d') {
      this.buildBraid3D(n, mapping);
    } else if (this.mode === 'matrix-voxels') {
      this.buildMatrixVoxels(n, mapping);
    } else if (this.mode === 'cayley-3d') {
      this.buildCayley3D(n, mapping);
    }
  }

  /**
   * Mode 1: 3D Spatial Disjoint Cycle Orbits
   * Each cycle forms a distinct halo ring elevated in Y.
   * Directed tubes connect elements x -> σ(x). Fixed points are golden beacon spheres.
   */
  buildSpatialOrbits(n, mapping) {
    const THREE = window.THREE;
    const cycles = this.toDisjointCycles(mapping);

    // Ground reference ring
    const groundGeo = new THREE.RingGeometry(85, 87, 64);
    const groundMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide });
    const groundRing = new THREE.Mesh(groundGeo, groundMat);
    groundRing.rotation.x = Math.PI / 2;
    groundRing.position.y = -30;
    this.scene.add(groundRing);

    // Compute cycle centers & layout
    const numCycles = cycles.length;
    cycles.forEach((cycle, cIdx) => {
      const colorHex = this.cycleColors[cIdx % this.cycleColors.length];
      const isFixedPoint = cycle.length === 1;

      // Position each cycle in 3D
      let center;
      if (numCycles === 1) {
        center = new THREE.Vector3(0, 0, 0);
      } else {
        const phi = (cIdx / numCycles) * Math.PI * 2;
        const rad = 50 + (numCycles > 2 ? 15 : 0);
        center = new THREE.Vector3(Math.cos(phi) * rad, 10 * Math.sin(phi * 2), Math.sin(phi) * rad);
      }

      const cycleRadius = isFixedPoint ? 0 : Math.max(16, cycle.length * 11);

      // Elevated cycle halo ring if length > 1
      if (!isFixedPoint) {
        const haloGeo = new THREE.TorusGeometry(cycleRadius, 1.2, 16, 64);
        const haloMat = new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: 0.35,
          roughness: 0.3,
          metalness: 0.4
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.position.copy(center);
        halo.rotation.x = Math.PI / 2;
        this.scene.add(halo);
      }

      // Nodes on the cycle
      const nodePositions = [];
      cycle.forEach((val, i) => {
        const angle = (i / cycle.length) * Math.PI * 2;
        const pos = isFixedPoint
          ? center.clone()
          : new THREE.Vector3(
              center.x + Math.cos(angle) * cycleRadius,
              center.y,
              center.z + Math.sin(angle) * cycleRadius
            );
        nodePositions.push(pos);

        // Sphere mesh
        const sphereGeo = new THREE.SphereGeometry(isFixedPoint ? 5.5 : 4.5, 32, 32);
        const sphereMat = new THREE.MeshStandardMaterial({
          color: isFixedPoint ? this.palette.gold : colorHex,
          emissive: isFixedPoint ? this.palette.gold : colorHex,
          emissiveIntensity: isFixedPoint ? 0.6 : 0.3,
          roughness: 0.2,
          metalness: 0.6
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.copy(pos);
        this.scene.add(sphere);

        // Vertical pedestal to ground
        const pedGeo = new THREE.CylinderGeometry(0.5, 0.5, pos.y - (-30), 8);
        const pedMat = new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.5 });
        const ped = new THREE.Mesh(pedGeo, pedMat);
        ped.position.set(pos.x, (pos.y + (-30)) / 2, pos.z);
        this.scene.add(ped);

        // Fixed point self-loop aura
        if (isFixedPoint) {
          const auraGeo = new THREE.TorusGeometry(8, 0.8, 16, 32);
          const auraMat = new THREE.MeshStandardMaterial({
            color: this.palette.gold,
            emissive: this.palette.gold,
            emissiveIntensity: 0.5
          });
          const aura = new THREE.Mesh(auraGeo, auraMat);
          aura.position.copy(pos);
          aura.rotation.x = Math.PI / 4;
          this.scene.add(aura);
        }
      });

      // Directed arched tube conduits between consecutive cycle elements: cycle[i] -> cycle[(i+1)%len]
      if (cycle.length > 1) {
        for (let i = 0; i < cycle.length; i++) {
          const p1 = nodePositions[i];
          const p2 = nodePositions[(i + 1) % cycle.length];
          const mid = p1.clone().add(p2).multiplyScalar(0.5);
          mid.y += 12; // Arch upward

          const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
          const tubeGeo = new THREE.TubeGeometry(curve, 24, 1.2, 8, false);
          const tubeMat = new THREE.MeshStandardMaterial({
            color: colorHex,
            emissive: colorHex,
            emissiveIntensity: 0.4,
            roughness: 0.3,
            metalness: 0.5
          });
          const tube = new THREE.Mesh(tubeGeo, tubeMat);
          this.scene.add(tube);

          // Arrow cone near destination
          const tangent = curve.getTangent(0.85).normalize();
          const arrowPos = curve.getPoint(0.85);
          const coneGeo = new THREE.ConeGeometry(2.5, 6, 12);
          const coneMat = new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 0.6 });
          const cone = new THREE.Mesh(coneGeo, coneMat);
          cone.position.copy(arrowPos);
          cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
          this.scene.add(cone);
        }
      }
    });
  }

  /**
   * Mode 2: True 3D Artin Braid Strands with Physical Depth Over/Under Crossings
   * Maps input wires at Z = -110 to outputs at Z = +110.
   * When strand i crosses strand j (inversion), strand i rises in Y and strand j dips in Y!
   */
  buildBraid3D(n, mapping) {
    const THREE = window.THREE;
    const strandSpacing = 24;
    const xOffset = -((n - 1) * strandSpacing) / 2;
    const zStart = -110;
    const zEnd = 110;

    // Boundary plates
    const plateGeo = new THREE.BoxGeometry(n * strandSpacing + 16, 8, 12);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const inPlate = new THREE.Mesh(plateGeo, plateMat);
    inPlate.position.set(0, 0, zStart);
    this.scene.add(inPlate);
    const outPlate = new THREE.Mesh(plateGeo, plateMat);
    outPlate.position.set(0, 0, zEnd);
    this.scene.add(outPlate);

    // Compute inversion pairs (i < j with mapping[i] > mapping[j])
    const inversions = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (mapping[i] > mapping[j]) {
          inversions.push({ i, j });
        }
      }
    }

    // Build 3D curves for each wire
    for (let i = 0; i < n; i++) {
      const startX = xOffset + i * strandSpacing;
      const targetIdx = mapping[i] - 1;
      const endX = xOffset + targetIdx * strandSpacing;

      const p0 = new THREE.Vector3(startX, 0, zStart);
      const p1 = new THREE.Vector3(startX, 0, zStart + 40);

      // Over/Under elevation: If this wire has net displacement, arch upward if moving right, dip if moving left
      let midY = 0;
      if (startX < endX) {
        midY = 16; // Arch over in Y
      } else if (startX > endX) {
        midY = -16; // Dip under in Y
      }

      const pMid = new THREE.Vector3((startX + endX) / 2, midY, 0);
      const p2 = new THREE.Vector3(endX, 0, zEnd - 40);
      const p3 = new THREE.Vector3(endX, 0, zEnd);

      const curve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
      // Elevate the midpoint smoothly
      const points = [
        p0,
        new THREE.Vector3(startX, midY * 0.4, zStart + 55),
        pMid,
        new THREE.Vector3(endX, midY * 0.4, zEnd - 55),
        p3
      ];
      const spline = new THREE.CatmullRomCurve3(points);

      const colorHex = this.cycleColors[i % this.cycleColors.length];
      const tubeGeo = new THREE.TubeGeometry(spline, 64, 2.2, 12, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.35,
        roughness: 0.25,
        metalness: 0.6
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      this.scene.add(tube);

      // Terminal spheres
      const sInGeo = new THREE.SphereGeometry(3.6, 16, 16);
      const sInMat = new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 0.5 });
      const sIn = new THREE.Mesh(sInGeo, sInMat);
      sIn.position.copy(p0);
      this.scene.add(sIn);

      const sOutGeo = new THREE.SphereGeometry(3.6, 16, 16);
      const sOut = new THREE.Mesh(sOutGeo, sInMat);
      sOut.position.copy(p3);
      this.scene.add(sOut);
    }

    // Inversion indicator rings at crossing points
    inversions.forEach((inv, invIdx) => {
      const x1 = xOffset + inv.i * strandSpacing;
      const x2 = xOffset + inv.j * strandSpacing;
      const crossX = (x1 + x2) / 2;
      const ringGeo = new THREE.TorusGeometry(5, 0.7, 12, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: this.palette.rose, wireframe: true });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(crossX, 0, (invIdx - inversions.length / 2) * 12);
      this.scene.add(ring);
    });
  }

  /**
   * Mode 3: 3D Permutation Matrix Grid with Transposition Arcs
   * Cells with P_ij = 1 host illuminated rook cylinder beacons.
   * Diagonal y=x is a luminous rail. Transpositions (2-cycles) span soaring parabolic arches.
   */
  buildMatrixVoxels(n, mapping) {
    const THREE = window.THREE;
    const cellSize = 24;
    const gridSpan = n * cellSize;
    const halfGrid = gridSpan / 2;

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(gridSpan + 20, gridSpan + 20);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    this.scene.add(ground);

    // Grid lines
    const gridHelper = new THREE.GridHelper(gridSpan, n, 0x38bdf8, 0x334155);
    gridHelper.position.y = 0;
    this.scene.add(gridHelper);

    // Diagonal y = x rail
    const pDiagStart = new THREE.Vector3(-halfGrid, 1, -halfGrid);
    const pDiagEnd = new THREE.Vector3(halfGrid, 1, halfGrid);
    const railCurve = new THREE.LineCurve3(pDiagStart, pDiagEnd);
    const railGeo = new THREE.TubeGeometry(railCurve, 16, 1.4, 8, false);
    const railMat = new THREE.MeshStandardMaterial({
      color: this.palette.gold,
      emissive: this.palette.gold,
      emissiveIntensity: 0.6,
      metalness: 0.8
    });
    const rail = new THREE.Mesh(railGeo, railMat);
    this.scene.add(rail);

    // Illuminated rook beacons at (i, σ(i))
    const cellPositions = [];
    for (let i = 0; i < n; i++) {
      const row = i; // 0-indexed row
      const col = mapping[i] - 1; // 0-indexed col
      const isFixed = row === col;

      const posX = -halfGrid + (col + 0.5) * cellSize;
      const posZ = -halfGrid + (row + 0.5) * cellSize;
      cellPositions.push({ row, col, posX, posZ, isFixed });

      // Cylinder beacon
      const beaconHeight = isFixed ? 36 : 28;
      const beaconGeo = new THREE.CylinderGeometry(4.5, 5.5, beaconHeight, 24);
      const colorHex = isFixed ? this.palette.gold : this.palette.sky;
      const beaconMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.45,
        roughness: 0.2,
        metalness: 0.7
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(posX, beaconHeight / 2, posZ);
      this.scene.add(beacon);

      // Top glowing orb
      const orbGeo = new THREE.SphereGeometry(3.5, 16, 16);
      const orbMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(posX, beaconHeight + 2, posZ);
      this.scene.add(orb);
    }

    // Transposition arches: For pairs (i, j) where σ(i) = j and σ(j) = i with i < j
    for (let i = 0; i < n; i++) {
      const j = mapping[i] - 1;
      if (i < j && mapping[j] - 1 === i) {
        // Find beacon positions for (i, j) and (j, i)
        const b1 = cellPositions[i];
        const b2 = cellPositions[j];

        const start = new THREE.Vector3(b1.posX, 28, b1.posZ);
        const end = new THREE.Vector3(b2.posX, 28, b2.posZ);
        const mid = start.clone().add(end).multiplyScalar(0.5);
        mid.y += 42; // Soaring arch over the diagonal rail

        const archCurve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const archGeo = new THREE.TubeGeometry(archCurve, 32, 1.8, 10, false);
        const archMat = new THREE.MeshStandardMaterial({
          color: this.palette.fuchsia,
          emissive: this.palette.fuchsia,
          emissiveIntensity: 0.6,
          metalness: 0.8
        });
        const arch = new THREE.Mesh(archGeo, archMat);
        this.scene.add(arch);
      }
    }
  }

  /**
   * Mode 4: 3D S3 Permutohedron / Cayley Polyhedron
   * 6 permutations of S_3 placed in a hexagon prism in 3D.
   * Generators τ₁ = (1 2) in fuchsia and τ₂ = (2 3) in sky.
   */
  buildCayley3D(n, mapping) {
    const THREE = window.THREE;

    // Define 6 permutations of S_3
    const s3Elements = [
      { name: 'e = ()',      p: [1, 2, 3], color: 0x34d399, pos: new THREE.Vector3(0, 50, 0) },
      { name: '(1 2)',       p: [2, 1, 3], color: 0xe879f9, pos: new THREE.Vector3(45, 15, 26) },
      { name: '(2 3)',       p: [1, 3, 2], color: 0x38bdf8, pos: new THREE.Vector3(-45, 15, 26) },
      { name: '(1 2 3)',     p: [2, 3, 1], color: 0xfbbf24, pos: new THREE.Vector3(45, -25, -26) },
      { name: '(1 3 2)',     p: [3, 1, 2], color: 0xa78bfa, pos: new THREE.Vector3(-45, -25, -26) },
      { name: '(1 3)',       p: [3, 2, 1], color: 0xf43f5e, pos: new THREE.Vector3(0, -50, 0) }
    ];

    // Generator edges: τ₁=(1 2) in fuchsia, τ₂=(2 3) in sky
    const edges = [
      { from: 0, to: 1, type: 'tau1' }, // e * (1 2) = (1 2)
      { from: 0, to: 2, type: 'tau2' }, // e * (2 3) = (2 3)
      { from: 1, to: 3, type: 'tau2' }, // (1 2) * (2 3) = (1 2 3)
      { from: 2, to: 4, type: 'tau1' }, // (2 3) * (1 2) = (1 3 2)
      { from: 3, to: 5, type: 'tau1' }, // (1 2 3) * (1 2) = (1 3)
      { from: 4, to: 5, type: 'tau2' }, // (1 3 2) * (2 3) = (1 3)
    ];

    // Check if current mapping matches an S3 element (first 3 items)
    const activeSub = mapping.slice(0, 3);
    const activeIdx = s3Elements.findIndex(el =>
      el.p.every((val, idx) => val === activeSub[idx])
    );

    // Draw generator edge conduits
    edges.forEach(e => {
      const p1 = s3Elements[e.from].pos;
      const p2 = s3Elements[e.to].pos;
      const curve = new THREE.LineCurve3(p1, p2);
      const isTau1 = e.type === 'tau1';
      const edgeColor = isTau1 ? this.palette.fuchsia : this.palette.sky;

      const tubeGeo = new THREE.TubeGeometry(curve, 12, 1.8, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: edgeColor,
        emissive: edgeColor,
        emissiveIntensity: 0.45,
        roughness: 0.3
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      this.scene.add(tube);
    });

    // Draw vertices
    s3Elements.forEach((el, idx) => {
      const isCurrentActive = idx === activeIdx;
      const r = isCurrentActive ? 9 : 6.5;
      const sphereGeo = new THREE.SphereGeometry(r, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: el.color,
        emissive: el.color,
        emissiveIntensity: isCurrentActive ? 0.75 : 0.3,
        roughness: 0.25,
        metalness: 0.6
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.copy(el.pos);
      this.scene.add(sphere);

      // Pulsing outer halo for active vertex
      if (isCurrentActive) {
        const haloGeo = new THREE.TorusGeometry(13, 1.4, 16, 32);
        const haloMat = new THREE.MeshBasicMaterial({ color: this.palette.gold, wireframe: true });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.position.copy(el.pos);
        halo.rotation.x = Math.PI / 3;
        this.scene.add(halo);
      }
    });
  }

  toDisjointCycles(mapping) {
    const n = mapping.length;
    const visited = new Array(n).fill(false);
    const cycles = [];

    for (let i = 0; i < n; i++) {
      if (visited[i]) continue;
      const cycle = [];
      let current = i;
      while (!visited[current]) {
        visited[current] = true;
        cycle.push(current + 1);
        current = mapping[current] - 1;
      }
      cycles.push(cycle);
    }
    return cycles;
  }

  resize() {
    if (!this.initialized || !this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
    if (this.renderer) {
      this.renderer.setSize(width, height);
    }
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.clearScene();
    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
