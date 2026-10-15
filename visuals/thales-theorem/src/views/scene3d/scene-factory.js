import { PALETTE } from '../../config/palette.js';

const translucent = (THREE, color, opacity, extra = {}) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, ...extra });

function createGrid(THREE, scene, configure) {
  const grid = new THREE.GridHelper(60, 60, PALETTE.slate600, PALETTE.slate700);
  configure(grid);
  scene.add(grid);
  return grid;
}

function createAxis(THREE, direction, color, length) {
  const group = new THREE.Group();
  const origin = new THREE.Vector3();
  group.add(new THREE.ArrowHelper(direction, origin, length, color, 0.5, 0.3));
  const negative = direction.clone().negate().multiplyScalar(length);
  const dashed = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([origin, negative]),
    new THREE.LineDashedMaterial({ color, dashSize: 0.2, gapSize: 0.2 }),
  );
  dashed.computeLineDistances();
  group.add(dashed);
  return group;
}

/** Builds every static and dynamic object once and returns them by name. Nothing here reads application state. */
export function createThalesScene(THREE) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.slate800);
  const add = (object) => { scene.add(object); return object; };

  const grids = {
    xz: createGrid(THREE, scene, (g) => { g.position.y = -0.01; }),
    xy: createGrid(THREE, scene, (g) => { g.rotation.x = Math.PI / 2; g.position.z = -0.01; }),
    yz: createGrid(THREE, scene, (g) => { g.rotation.z = Math.PI / 2; g.position.x = -0.01; }),
  };

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(20, 30, 20);
  scene.add(sun);

  const sphere = add(new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.MeshPhysicalMaterial({ color: PALETTE.sky, transparent: true, opacity: 0.15, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false }),
  ));

  const wire = new THREE.LineBasicMaterial({ color: PALETTE.sky, transparent: true, opacity: 0.35 });
  const sphereLines = add(new THREE.Group());
  sphereLines.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(1, 1, 0.01, 32)), wire));
  sphereLines.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(1, 1, 0.01, 32).rotateZ(Math.PI / 2)), wire));

  const axes = add(new THREE.Group());
  axes.add(createAxis(THREE, new THREE.Vector3(1, 0, 0), PALETTE.amber, 15));
  axes.add(createAxis(THREE, new THREE.Vector3(0, 1, 0), PALETTE.lime, 15));
  axes.add(createAxis(THREE, new THREE.Vector3(0, 0, 1), PALETTE.steel, 15));

  const diameter = add(new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: PALETTE.red })));

  const markerGeometry = new THREE.SphereGeometry(0.35, 16, 16);
  const materials = {
    markerHidden: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    markerHover: new THREE.MeshBasicMaterial({ color: PALETTE.violet, transparent: true, opacity: 0.9, depthWrite: false }),
  };
  const pointA = add(new THREE.Mesh(markerGeometry, materials.markerHidden));
  const pointB = add(new THREE.Mesh(markerGeometry, materials.markerHidden));
  const pointP = add(new THREE.Mesh(markerGeometry, materials.markerHidden));

  const arrowPA = add(new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 1, PALETTE.blue, 1, 0.5));
  const arrowPB = add(new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 1, PALETTE.orange, 1, 0.5));

  const volumeBox = add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), translucent(THREE, PALETTE.violet, 0.18, { side: THREE.FrontSide })));
  const volumeWire = add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    new THREE.LineBasicMaterial({ color: PALETTE.violetLight, transparent: true, opacity: 0.8 }),
  ));

  const circlePoints = [];
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    circlePoints.push(new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0));
  }
  const greatCircleWire = add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(circlePoints),
    new THREE.LineBasicMaterial({ color: PALETTE.sky, transparent: true, opacity: 0.7 }),
  ));

  return {
    scene, grids, sphere, sphereLines, greatCircleWire, axes, diameter, materials,
    pointA, pointB, pointP, arrowPA, arrowPB, volumeBox, volumeWire,
    areaTriangle: add(new THREE.Mesh(new THREE.BufferGeometry(), translucent(THREE, PALETTE.green, 0.2))),
    radiusLine: add(new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: PALETTE.indigo, dashSize: 0.5, gapSize: 0.3 }))),
    altitudeLine: add(new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: PALETTE.lime, dashSize: 0.4, gapSize: 0.25 }))),
    thetaSector: add(new THREE.Mesh(new THREE.BufferGeometry(), translucent(THREE, PALETTE.yellow, 0.25))),
    phiSector: add(new THREE.Mesh(new THREE.BufferGeometry(), translucent(THREE, PALETTE.magenta, 0.25))),
    rightAngle: add(new THREE.Mesh(new THREE.BufferGeometry(), translucent(THREE, PALETTE.teal, 0.8))),
    alphaSector: add(new THREE.Mesh(new THREE.BufferGeometry(), translucent(THREE, PALETTE.lime, 0.35))),
    betaSector: add(new THREE.Mesh(new THREE.BufferGeometry(), translucent(THREE, PALETTE.amber, 0.35))),
  };
}
