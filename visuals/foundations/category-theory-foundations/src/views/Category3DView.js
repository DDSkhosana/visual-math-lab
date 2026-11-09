/**
 * Category3DView — Three.js WebGL 3D Counterpart View for Category Theory & Universal Properties
 * Visual Mathematics Lab — Module 4
 *
 * Implements 4 true 3D spatial representations:
 * 1. 'spatial-simplex' : 3D Commutative Simplex / Tetrahedron with curved morphism tube conduits, illuminated object spheres, and semi-transparent commuting facet planes.
 * 2. 'composition-3d'  : 3D Composition Landscape Grid with height towers comparing (g ∘ f)(a, c) vs h(a, c).
 * 3. 'universal-cone'  : 3D Universal Cone & Product Factorization with apex X, projection beams π₁, π₂, and unique mediated ray ∃! u.
 * 4. 'functor-3d'      : 3D Functorial Parallel Hyper-Planes with category C, category D, and vertical natural transformation conduits.
 */

export class Category3DView {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.animId = null;
    this.initialized = false;
    this.mode = 'spatial-simplex'; // 'spatial-simplex' | 'composition-3d' | 'universal-cone' | 'functor-3d'
    this.lastState = null;

    this.presets = {
      iso:   { pos: [150, 180, 220], target: [0, 0, 0] },
      top:   { pos: [0, 300, 0.01],  target: [0, 0, 0] },
      front: { pos: [0, 0, 280],    target: [0, 0, 0] },
      side:  { pos: [280, 0, 0],    target: [0, 0, 0] }
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

    const topLight = new window.THREE.PointLight(0x34d399, 0.5, 500);
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

    if (this.mode === 'spatial-simplex') {
      this.buildSpatialSimplex(state);
    } else if (this.mode === 'composition-3d') {
      this.buildComposition3D(state);
    } else if (this.mode === 'universal-cone') {
      this.buildUniversalCone(state);
    } else if (this.mode === 'functor-3d') {
      this.buildFunctor3D(state);
    }
  }

  /**
   * Mode 1: 3D Commutative Simplex / Triangle
   * Objects A, B, C placed as 3D elevated vertices.
   * Directed Bezier tubes connect A->B (f), B->C (g), and A->C (h).
   * Semi-transparent facet plane lights up green if g ∘ f = h, or amber if non-commuting.
   */
  buildSpatialSimplex(state) {
    const THREE = window.THREE;
    const isCommuting = state.triangleCommutes !== false;

    // Object vertex positions in 3D
    const posA = new THREE.Vector3(-65, -20, 40);
    const posB = new THREE.Vector3(0, 55, -20);
    const posC = new THREE.Vector3(65, -20, 40);

    const objects = [
      { name: 'A', pos: posA, color: this.palette.sky },
      { name: 'B', pos: posB, color: this.palette.fuchsia },
      { name: 'C', pos: posC, color: this.palette.emerald }
    ];

    // Commuting interior facet plane
    const facetGeo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      posA.x, posA.y, posA.z,
      posB.x, posB.y, posB.z,
      posC.x, posC.y, posC.z
    ]);
    facetGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    facetGeo.computeVertexNormals();

    const facetMat = new THREE.MeshStandardMaterial({
      color: isCommuting ? this.palette.emerald : this.palette.amber,
      emissive: isCommuting ? this.palette.emerald : this.palette.amber,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    const facet = new THREE.Mesh(facetGeo, facetMat);
    this.scene.add(facet);

    // Object spheres
    objects.forEach(obj => {
      const geo = new THREE.SphereGeometry(7, 24, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: obj.color,
        emissive: obj.color,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.6
      });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.copy(obj.pos);
      this.scene.add(sphere);

      // Pedestal to ground plane y = -45
      const pedGeo = new THREE.CylinderGeometry(0.6, 0.6, obj.pos.y - (-45), 8);
      const pedMat = new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.5 });
      const ped = new THREE.Mesh(pedGeo, pedMat);
      ped.position.set(obj.pos.x, (obj.pos.y + (-45)) / 2, obj.pos.z);
      this.scene.add(ped);
    });

    // Morphism conduits: f: A -> B, g: B -> C, h: A -> C
    const morphisms = [
      { from: posA, to: posB, label: 'f', color: this.palette.sky, arch: new THREE.Vector3(-10, 10, 5) },
      { from: posB, to: posC, label: 'g', color: this.palette.fuchsia, arch: new THREE.Vector3(10, 10, 5) },
      { from: posA, to: posC, label: 'h', color: isCommuting ? this.palette.emerald : this.palette.rose, arch: new THREE.Vector3(0, -15, 10) }
    ];

    morphisms.forEach(m => {
      const mid = m.from.clone().add(m.to).multiplyScalar(0.5).add(m.arch);
      const curve = new THREE.QuadraticBezierCurve3(m.from, mid, m.to);
      const tubeGeo = new THREE.TubeGeometry(curve, 28, 1.8, 10, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: m.color,
        emissive: m.color,
        emissiveIntensity: 0.45,
        roughness: 0.2,
        metalness: 0.5
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      this.scene.add(tube);

      // Arrow cone
      const tangent = curve.getTangent(0.85).normalize();
      const pos = curve.getPoint(0.85);
      const coneGeo = new THREE.ConeGeometry(3.5, 8, 12);
      const coneMat = new THREE.MeshStandardMaterial({ color: m.color, emissive: m.color, emissiveIntensity: 0.6 });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.copy(pos);
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      this.scene.add(cone);
    });

    // Reference ground grid
    const grid = new THREE.GridHelper(180, 10, 0x334155, 0x1e293b);
    grid.position.y = -45;
    this.scene.add(grid);
  }

  /**
   * Mode 2: 3D Composition Landscape Grid
   * Matrix product (g ∘ f)(a, c) compared against h(a, c).
   * Towers rise at coordinate cells (a, c).
   */
  buildComposition3D(state) {
    const THREE = window.THREE;
    const isCommuting = state.triangleCommutes !== false;
    const nA = 3;
    const nC = 3;
    const cellSize = 28;
    const gridSpanX = nC * cellSize;
    const gridSpanZ = nA * cellSize;

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(gridSpanX + 24, gridSpanZ + 24);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(Math.max(gridSpanX, gridSpanZ), 6, 0x38bdf8, 0x334155);
    gridHelper.position.y = 0.5;
    this.scene.add(gridHelper);

    // Build composition landscape towers
    for (let r = 0; r < nA; r++) {
      for (let c = 0; c < nC; c++) {
        const posX = -(gridSpanX / 2) + (c + 0.5) * cellSize;
        const posZ = -(gridSpanZ / 2) + (r + 0.5) * cellSize;

        // Ideal composition matches on diagonal
        const idealMatch = r === c;
        const directHMatch = isCommuting ? idealMatch : (r === (c + 1) % 3);

        const h1 = idealMatch ? 32 : 4;
        const h2 = directHMatch ? 32 : 4;
        const hasDiscrepancy = h1 !== h2;

        // Path 1 (g ∘ f) cylinder column
        const towerGeo = new THREE.CylinderGeometry(4.5, 4.5, h1, 16);
        const colColor = hasDiscrepancy ? this.palette.rose : (idealMatch ? this.palette.emerald : 0x334155);
        const towerMat = new THREE.MeshStandardMaterial({
          color: colColor,
          emissive: colColor,
          emissiveIntensity: idealMatch ? 0.45 : 0.1,
          metalness: 0.5
        });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.set(posX, h1 / 2, posZ);
        this.scene.add(tower);

        // Top halo or discrepancy spike
        if (hasDiscrepancy) {
          const spikeGeo = new THREE.ConeGeometry(2, 10, 8);
          const spikeMat = new THREE.MeshBasicMaterial({ color: this.palette.amber });
          const spike = new THREE.Mesh(spikeGeo, spikeMat);
          spike.position.set(posX, h1 + 5, posZ);
          this.scene.add(spike);
        } else if (idealMatch) {
          const orbGeo = new THREE.SphereGeometry(3, 12, 12);
          const orbMat = new THREE.MeshBasicMaterial({ color: this.palette.emerald });
          const orb = new THREE.Mesh(orbGeo, orbMat);
          orb.position.set(posX, h1 + 2, posZ);
          this.scene.add(orb);
        }
      }
    }
  }

  /**
   * Mode 3: 3D Universal Cone & Product Adjunction
   * Product object A × B with projections π₁: A × B -> A and π₂: A × B -> B.
   * Arbitrary test object X with f₁: X -> A and f₂: X -> B.
   * Unique mediating morphism ∃! u: X -> A × B rendered as a pulsating golden ray beam!
   */
  buildUniversalCone(state) {
    const THREE = window.THREE;

    // Node coordinates in 3D
    const posA = new THREE.Vector3(-60, -30, 30);
    const posB = new THREE.Vector3(60, -30, 30);
    const posProd = new THREE.Vector3(0, -10, 0); // A × B
    const posApex = new THREE.Vector3(0, 60, -40); // Test object X

    const nodes = [
      { name: 'A', pos: posA, color: this.palette.sky },
      { name: 'B', pos: posB, color: this.palette.fuchsia },
      { name: 'A × B', pos: posProd, color: this.palette.emerald },
      { name: 'X', pos: posApex, color: this.palette.violet }
    ];

    // Spheres
    nodes.forEach(n => {
      const geo = new THREE.SphereGeometry(n.name.includes('×') ? 8 : 6.5, 24, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: n.color,
        emissive: n.color,
        emissiveIntensity: 0.5,
        roughness: 0.25,
        metalness: 0.6
      });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.copy(n.pos);
      this.scene.add(sphere);
    });

    // Projections π₁: (A × B) -> A and π₂: (A × B) -> B
    const projections = [
      { from: posProd, to: posA, color: this.palette.sky, label: 'π₁' },
      { from: posProd, to: posB, color: this.palette.fuchsia, label: 'π₂' }
    ];

    projections.forEach(p => {
      const curve = new THREE.LineCurve3(p.from, p.to);
      const tubeGeo = new THREE.TubeGeometry(curve, 12, 1.8, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({ color: p.color, emissive: p.color, emissiveIntensity: 0.4 });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      this.scene.add(tube);
    });

    // Projections f₁: X -> A and f₂: X -> B
    const testRays = [
      { from: posApex, to: posA, color: 0x64748b },
      { from: posApex, to: posB, color: 0x64748b }
    ];
    testRays.forEach(r => {
      const curve = new THREE.LineCurve3(r.from, r.to);
      const tubeGeo = new THREE.TubeGeometry(curve, 12, 1.2, 6, false);
      const tubeMat = new THREE.MeshBasicMaterial({ color: r.color, transparent: true, opacity: 0.6 });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      this.scene.add(tube);
    });

    // Unique mediating morphism ∃! u: X -> A × B (Golden ray)
    const uCurve = new THREE.LineCurve3(posApex, posProd);
    const uGeo = new THREE.TubeGeometry(uCurve, 20, 2.4, 10, false);
    const uMat = new THREE.MeshStandardMaterial({
      color: this.palette.gold,
      emissive: this.palette.gold,
      emissiveIntensity: 0.7,
      metalness: 0.8
    });
    const uTube = new THREE.Mesh(uGeo, uMat);
    this.scene.add(uTube);

    // Glowing halo around product node to symbolize universality
    const haloGeo = new THREE.TorusGeometry(12, 1.2, 16, 32);
    const haloMat = new THREE.MeshBasicMaterial({ color: this.palette.gold, wireframe: true });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.copy(posProd);
    halo.rotation.x = Math.PI / 4;
    this.scene.add(halo);
  }

  /**
   * Mode 4: 3D Functorial Parallel Hyper-Planes
   * Two parallel horizontal sheets in 3D representing Category C (bottom) and Category D (top).
   * Vertical natural transformation conduits bridge F(X) -> G(X).
   */
  buildFunctor3D(state) {
    const THREE = window.THREE;

    // Plane C at y = -35, Plane D at y = +35
    const sheetGeo = new THREE.PlaneGeometry(140, 90);
    const sheetMatC = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    const sheetC = new THREE.Mesh(sheetGeo, sheetMatC);
    sheetC.rotation.x = -Math.PI / 2;
    sheetC.position.y = -35;
    this.scene.add(sheetC);

    const sheetMatD = new THREE.MeshStandardMaterial({
      color: 0x047857,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    const sheetD = new THREE.Mesh(sheetGeo, sheetMatD);
    sheetD.rotation.x = -Math.PI / 2;
    sheetD.position.y = 35;
    this.scene.add(sheetD);

    // Objects in Category C
    const cObj1 = new THREE.Vector3(-40, -35, 0);
    const cObj2 = new THREE.Vector3(40, -35, 0);

    // Objects in Category D (images under Functors F and G)
    const dObjF1 = new THREE.Vector3(-40, 35, -20);
    const dObjG1 = new THREE.Vector3(-40, 35, 20);
    const dObjF2 = new THREE.Vector3(40, 35, -20);
    const dObjG2 = new THREE.Vector3(40, 35, 20);

    const allSpheres = [
      { pos: cObj1, color: this.palette.sky },
      { pos: cObj2, color: this.palette.sky },
      { pos: dObjF1, color: this.palette.emerald },
      { pos: dObjG1, color: this.palette.amber },
      { pos: dObjF2, color: this.palette.emerald },
      { pos: dObjG2, color: this.palette.amber }
    ];

    allSpheres.forEach(s => {
      const geo = new THREE.SphereGeometry(5, 16, 16);
      const mat = new THREE.MeshStandardMaterial({ color: s.color, emissive: s.color, emissiveIntensity: 0.4 });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.copy(s.pos);
      this.scene.add(sphere);
    });

    // Functor vertical conduits F: C -> D and G: C -> D
    const functorConduits = [
      { from: cObj1, to: dObjF1, color: this.palette.emerald },
      { from: cObj1, to: dObjG1, color: this.palette.amber },
      { from: cObj2, to: dObjF2, color: this.palette.emerald },
      { from: cObj2, to: dObjG2, color: this.palette.amber }
    ];

    functorConduits.forEach(fc => {
      const curve = new THREE.LineCurve3(fc.from, fc.to);
      const tubeGeo = new THREE.TubeGeometry(curve, 12, 1.2, 6, false);
      const tubeMat = new THREE.MeshBasicMaterial({ color: fc.color, transparent: true, opacity: 0.7 });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      this.scene.add(tube);
    });

    // Natural transformation bridges α_X: F(X) -> G(X)
    const natTransBridges = [
      { from: dObjF1, to: dObjG1 },
      { from: dObjF2, to: dObjG2 }
    ];

    natTransBridges.forEach(b => {
      const curve = new THREE.LineCurve3(b.from, b.to);
      const tubeGeo = new THREE.TubeGeometry(curve, 12, 2, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: this.palette.fuchsia,
        emissive: this.palette.fuchsia,
        emissiveIntensity: 0.6
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      this.scene.add(tube);
    });
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
