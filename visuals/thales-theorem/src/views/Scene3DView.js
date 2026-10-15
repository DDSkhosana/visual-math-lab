import { point3DToGreatCircle, sphericalToCartesian } from '../model/thales-math.js';
import { createThalesScene } from './scene3d/scene-factory.js';
import { rightAngleVertices, sectorVertices, setPositions } from './scene3d/geometry.js';

/** Facade over Three.js: the rest of the app never touches THREE objects directly. */
export class Scene3DView {
  static stateKeys = ['radius', 'lat3D', 'lon3D', 'vis3d', 'show3dArea', 'show3dAngles', 'hoverP3D'];

  constructor(THREE, container) {
    this.THREE = THREE;
    this.container = container;
    this.objects = createThalesScene(THREE);
    this.dragging = false;
    this.raycaster = new THREE.Raycaster();

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.set(30, 20, 30);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    new ResizeObserver(() => this.resize()).observe(container);
  }

  get domElement() {
    return this.renderer.domElement;
  }

  resize() {
    const { clientWidth: width, clientHeight: height } = this.container;
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  render(state) {
    const { THREE } = this;
    const o = this.objects;
    const r = state.radius;
    const { x, y, z } = sphericalToCartesian(r, state.lat3D, state.lon3D);

    o.grids.xz.visible = state.vis3d.gridXZ;
    o.grids.xy.visible = state.vis3d.gridXY;
    o.grids.yz.visible = state.vis3d.gridYZ;
    if (o.axes) {
      o.axes.visible = state.vis3d.axes !== undefined ? Boolean(state.vis3d.axes) : true;
    }
    o.sphere.visible = o.sphereLines.visible = state.vis3d.sphere;
    o.sphere.scale.setScalar(r);
    o.sphereLines.scale.setScalar(r);

    const { psi } = point3DToGreatCircle({ x, y, z }, r);
    if (o.greatCircleWire) {
      o.greatCircleWire.rotation.x = psi;
      o.greatCircleWire.scale.setScalar(r);
      o.greatCircleWire.visible = state.vis3d.circleWire !== undefined ? Boolean(state.vis3d.circleWire) : Boolean(state.vis3d.sphere);
    }

    o.pointP.position.set(x, y, z);
    o.pointA.position.set(-r, 0, 0);
    o.pointB.position.set(r, 0, 0);
    o.pointP.material = state.hoverP3D ? o.materials.markerHover : o.materials.markerHidden;

    const toA = new THREE.Vector3().subVectors(o.pointA.position, o.pointP.position);
    const toB = new THREE.Vector3().subVectors(o.pointB.position, o.pointP.position);
    for (const [arrow, vector] of [[o.arrowPA, toA], [o.arrowPB, toB]]) {
      arrow.position.copy(o.pointP.position);
      if (vector.lengthSq() > 1e-4) {
        arrow.setDirection(vector.clone().normalize());
        arrow.setLength(vector.length(), 0.8, 0.4);
        arrow.visible = true;
      } else {
        arrow.visible = false;
      }
    }

    o.diameter.geometry.setFromPoints([o.pointA.position, o.pointB.position]);
    o.radiusLine.geometry.setFromPoints([new THREE.Vector3(), o.pointP.position]);
    o.radiusLine.computeLineDistances();

    const a = o.pointA.position, b = o.pointB.position, p = o.pointP.position;
    setPositions(THREE, o.areaTriangle.geometry, [a.x, a.y, a.z, b.x, b.y, b.z, p.x, p.y, p.z]);
    o.areaTriangle.visible = state.show3dArea;

    if (o.altitudeLine) {
      o.altitudeLine.geometry.setFromPoints([new THREE.Vector3(x, 0, 0), o.pointP.position]);
      o.altitudeLine.computeLineDistances();
      o.altitudeLine.visible = state.show3dArea;
    }

    const origin = new THREE.Vector3();
    this.updateSector(o.thetaSector, origin, new THREE.Vector3(0, 1, 0), p, r * 0.35);
    this.updateSector(o.phiSector, origin, new THREE.Vector3(0, 0, 1), new THREE.Vector3(x, 0, z), r * 0.45);
    if (toA.lengthSq() > 1e-4 && toB.lengthSq() > 1e-4) {
      setPositions(THREE, o.rightAngle.geometry, rightAngleVertices(THREE, p, toA.clone().normalize(), toB.clone().normalize(), 0.8));
      o.rightAngle.visible = state.show3dAngles;
    } else {
      o.rightAngle.visible = false;
    }

    const towardBFromA = new THREE.Vector3(1, 0, 0);
    const towardAFromB = new THREE.Vector3(-1, 0, 0);
    const toPFromA = new THREE.Vector3().subVectors(o.pointP.position, o.pointA.position);
    const toPFromB = new THREE.Vector3().subVectors(o.pointP.position, o.pointB.position);

    if (o.alphaSector) {
      if (toPFromA.lengthSq() > 1e-4) {
        this.updateSector(o.alphaSector, o.pointA.position, towardBFromA, toPFromA, r * 0.28);
        o.alphaSector.visible = state.show3dAngles;
      } else {
        o.alphaSector.visible = false;
      }
    }

    if (o.betaSector) {
      if (toPFromB.lengthSq() > 1e-4) {
        this.updateSector(o.betaSector, o.pointB.position, towardAFromB, toPFromB, r * 0.28);
        o.betaSector.visible = state.show3dAngles;
      } else {
        o.betaSector.visible = false;
      }
    }

    const min = 0.001;
    o.volumeBox.scale.set(Math.max(Math.abs(x), min), Math.max(Math.abs(y), min), Math.max(Math.abs(z), min));
    o.volumeBox.position.set(x / 2, y / 2, z / 2);
    o.volumeWire.scale.copy(o.volumeBox.scale);
    o.volumeWire.position.copy(o.volumeBox.position);
    o.volumeBox.visible = o.volumeWire.visible = state.vis3d.volume;
  }

  updateSector(mesh, center, from, to, radius) {
    const vertices = sectorVertices(this.THREE, center, from, to, radius);
    if (vertices) setPositions(this.THREE, mesh.geometry, vertices);
  }

  /** Called every animation frame (orbit damping needs it). */
  renderFrame() {
    this.controls.update();
    this.renderer.render(this.objects.scene, this.camera);
  }

  /** World point to container pixels, or null when behind the camera. */
  project(point) {
    const { clientWidth: width, clientHeight: height } = this.container;
    if (!width) return null;
    const v = new this.THREE.Vector3(point.x, point.y, point.z).project(this.camera);
    if (v.z > 1) return null;
    return { x: (v.x * 0.5 + 0.5) * width, y: (v.y * -0.5 + 0.5) * height };
  }

  setOrbitEnabled(enabled) {
    this.controls.enabled = enabled;
  }

  pointerToRay(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new this.THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
  }

  /** Both pick methods use the ray from the latest pointerToRay call. */
  hitsPointP() {
    if (this.raycaster.intersectObject(this.objects.pointP).length > 0) return true;
    return this.raycaster.ray.distanceToPoint(this.objects.pointP.position) < 2.0;
  }

  pickSphere() {
    const hits = this.raycaster.intersectObject(this.objects.sphere);
    if (hits.length) return hits[0].point;

    // When dragged past the sphere's edge, clamp to the nearest point on the sphere silhouette
    const r = this.objects.sphere.scale.x;
    const ray = this.raycaster.ray;
    const t = -ray.origin.dot(ray.direction);
    if (t > 0) {
      const closestPointOnRay = ray.origin.clone().addScaledVector(ray.direction, t);
      if (closestPointOnRay.lengthSq() > 0) {
        return closestPointOnRay.normalize().multiplyScalar(r);
      }
    }
    return null;
  }

  setCameraPreset(presetName) {
    const presets = {
      default: { pos: new this.THREE.Vector3(30, 20, 30), up: new this.THREE.Vector3(0, 1, 0) },
      top: { pos: new this.THREE.Vector3(0, 48, 0), up: new this.THREE.Vector3(0, 0, -1) },
      front: { pos: new this.THREE.Vector3(0, 0, 48), up: new this.THREE.Vector3(0, 1, 0) },
      side: { pos: new this.THREE.Vector3(48, 0, 0), up: new this.THREE.Vector3(0, 1, 0) },
    };
    const target = presets[presetName] || presets.default;
    this.#animateCamera(target.pos, target.up);
  }

  #animateCamera(targetPos, targetUp) {
    if (this.camAnim) cancelAnimationFrame(this.camAnim);
    const startPos = this.camera.position.clone();
    const startUp = this.camera.up.clone();
    const startTime = performance.now();
    const duration = 400;

    const step = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const t = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      this.camera.position.lerpVectors(startPos, targetPos, t);
      this.camera.up.lerpVectors(startUp, targetUp, t).normalize();
      this.camera.lookAt(0, 0, 0);
      this.controls.target.set(0, 0, 0);
      this.controls.update();

      if (progress < 1) {
        this.camAnim = requestAnimationFrame(step);
      } else {
        this.camAnim = null;
      }
    };
    this.camAnim = requestAnimationFrame(step);
  }
}
