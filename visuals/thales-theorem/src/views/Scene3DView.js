import { point3DToGreatCircle, sphericalToCartesian } from '../model/thales-math.js';
import { createThalesScene } from './scene3d/scene-factory.js';
import { rightAngleVertices, sectorVertices, setPositions } from './scene3d/geometry.js';
import { ArcballTrackballControls } from '../../../../js/circle-3d.js';

/** Facade over Three.js: the rest of the app never touches THREE objects directly. */
export class Scene3DView {
  static stateKeys = ['radius', 'lat3D', 'lon3D', 'baselineRotation', 'vis3d', 'show3dArea', 'show3dAngles', 'hoverP3D', 'hoverA3D', 'hoverB3D'];

  constructor(THREE, container) {
    this.THREE = THREE;
    this.container = container;
    this.objects = createThalesScene(THREE);
    this.dragging = false;
    this.raycaster = new THREE.Raycaster();

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.set(30, 20, 30);
    this.camera.up.set(0, 1, 0);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    this.controls = new ArcballTrackballControls(THREE, this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
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
    const rot = state.baselineRotation || 0;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);
    const raw = sphericalToCartesian(r, state.lat3D, state.lon3D);
    const x = raw.x * cosR - raw.y * sinR;
    const y = raw.x * sinR + raw.y * cosR;
    const z = raw.z;

    o.grids.xz.visible = state.vis3d.gridXZ;
    o.grids.xy.visible = state.vis3d.gridXY;
    o.grids.yz.visible = state.vis3d.gridYZ;
    if (o.axes) {
      o.axes.visible = state.vis3d.axes !== undefined ? Boolean(state.vis3d.axes) : true;
    }
    o.sphere.visible = o.sphereLines.visible = state.vis3d.sphere;
    o.sphere.scale.setScalar(r);
    o.sphereLines.scale.setScalar(r);

    const { psi } = point3DToGreatCircle(raw, r);
    if (o.greatCircleWire) {
      o.greatCircleWire.rotation.order = 'ZYX';
      o.greatCircleWire.rotation.z = rot;
      o.greatCircleWire.rotation.x = psi;
      o.greatCircleWire.scale.setScalar(r);
      o.greatCircleWire.visible = state.vis3d.circleWire !== undefined ? Boolean(state.vis3d.circleWire) : Boolean(state.vis3d.sphere);
    }

    o.pointP.position.set(x, y, z);
    o.pointA.position.set(-r * cosR, -r * sinR, 0);
    o.pointB.position.set(r * cosR, r * sinR, 0);
    o.pointP.material = state.hoverP3D ? o.materials.markerHover : o.materials.markerHidden;
    o.pointA.material = state.hoverA3D ? o.materials.markerHover : o.materials.markerHidden;
    o.pointB.material = state.hoverB3D ? o.materials.markerHover : o.materials.markerHidden;

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
      const proj = x * cosR + y * sinR;
      const foot = new THREE.Vector3(proj * cosR, proj * sinR, 0);
      o.altitudeLine.geometry.setFromPoints([foot, o.pointP.position]);
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

    const towardBFromA = new THREE.Vector3(cosR, sinR, 0);
    const towardAFromB = new THREE.Vector3(-cosR, -sinR, 0);
    const toPFromA = new THREE.Vector3().subVectors(o.pointP.position, o.pointA.position);
    const toPFromB = new THREE.Vector3().subVectors(o.pointP.position, o.pointB.position);

    if (o.alphaSector) {
      if (toPFromA.lengthSq() > 1e-4) {
        this.updateSector(o.alphaSector, o.pointA.position, towardBFromA, toPFromA, r * 0.28, false);
        o.alphaSector.visible = state.show3dAngles;
      } else {
        o.alphaSector.visible = false;
      }
    }

    if (o.alphaReflexSector) {
      if (toPFromA.lengthSq() > 1e-4) {
        this.updateSector(o.alphaReflexSector, o.pointA.position, towardBFromA, toPFromA, r * 0.22, true);
        o.alphaReflexSector.visible = Boolean(state.vis3d.reflex);
      } else {
        o.alphaReflexSector.visible = false;
      }
    }

    if (o.betaSector) {
      if (toPFromB.lengthSq() > 1e-4) {
        this.updateSector(o.betaSector, o.pointB.position, towardAFromB, toPFromB, r * 0.28, false);
        o.betaSector.visible = state.show3dAngles;
      } else {
        o.betaSector.visible = false;
      }
    }

    if (o.betaReflexSector) {
      if (toPFromB.lengthSq() > 1e-4) {
        this.updateSector(o.betaReflexSector, o.pointB.position, towardAFromB, toPFromB, r * 0.22, true);
        o.betaReflexSector.visible = Boolean(state.vis3d.reflex);
      } else {
        o.betaReflexSector.visible = false;
      }
    }

    if (o.pReflexSector) {
      if (toA.lengthSq() > 1e-4 && toB.lengthSq() > 1e-4) {
        this.updateSector(o.pReflexSector, o.pointP.position, toA, toB, 1.2, true);
        o.pReflexSector.visible = Boolean(state.vis3d.reflex);
      } else {
        o.pReflexSector.visible = false;
      }
    }

    const min = 0.001;
    o.volumeBox.scale.set(Math.max(Math.abs(x), min), Math.max(Math.abs(y), min), Math.max(Math.abs(z), min));
    o.volumeBox.position.set(x / 2, y / 2, z / 2);
    o.volumeWire.scale.copy(o.volumeBox.scale);
    o.volumeWire.position.copy(o.volumeBox.position);
    o.volumeBox.visible = o.volumeWire.visible = state.vis3d.volume;
  }

  updateSector(mesh, center, from, to, radius, sweepReflex = false) {
    const vertices = sectorVertices(this.THREE, center, from, to, radius, sweepReflex);
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
    this.lastPointerCoords = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  /** Pick methods use the ray and screen-space proximity from latest pointerToRay call. */
  hitsPointP() {
    if (!this.objects?.pointP) return false;
    if (this.raycaster.intersectObject(this.objects.pointP).length > 0) return true;
    const screenPt = this.project(this.objects.pointP.position);
    if (screenPt && this.lastPointerCoords) {
      if (Math.hypot(this.lastPointerCoords.x - screenPt.x, this.lastPointerCoords.y - screenPt.y) < 14) return true;
    }
    return false;
  }

  hitsPointA() {
    if (!this.objects?.pointA) return false;
    if (this.raycaster.intersectObject(this.objects.pointA).length > 0) return true;
    const screenPt = this.project(this.objects.pointA.position);
    if (screenPt && this.lastPointerCoords) {
      if (Math.hypot(this.lastPointerCoords.x - screenPt.x, this.lastPointerCoords.y - screenPt.y) < 14) return true;
    }
    return false;
  }

  hitsPointB() {
    if (!this.objects?.pointB) return false;
    if (this.raycaster.intersectObject(this.objects.pointB).length > 0) return true;
    const screenPt = this.project(this.objects.pointB.position);
    if (screenPt && this.lastPointerCoords) {
      if (Math.hypot(this.lastPointerCoords.x - screenPt.x, this.lastPointerCoords.y - screenPt.y) < 14) return true;
    }
    return false;
  }

  hitsCircumference(radius = 10) {
    if (!this.raycaster?.ray) return false;
    const vOrigin = this.raycaster.ray.origin;
    const vDir = this.raycaster.ray.direction;
    const b = vOrigin.dot(vDir);
    const distRayToOrigin = Math.sqrt(Math.max(0, vOrigin.lengthSq() - b * b));
    return Math.abs(distRayToOrigin - radius) < 1.4;
  }

  pickCircumferenceRadius(min = 5, max = 15) {
    if (!this.raycaster?.ray) return null;
    const vOrigin = this.raycaster.ray.origin;
    const vDir = this.raycaster.ray.direction;
    const b = vOrigin.dot(vDir);
    const distRayToOrigin = Math.sqrt(Math.max(0, vOrigin.lengthSq() - b * b));
    return Math.min(max, Math.max(min, Math.round(distRayToOrigin * 2) / 2));
  }

  pickSphere(baselineRotation = 0) {
    const hits = this.raycaster.intersectObject(this.objects.sphere);
    let pt = hits.length ? hits[0].point : null;

    if (!pt) {
      // When dragged past the sphere's edge, clamp to the nearest point on the sphere silhouette
      const r = this.objects.sphere.scale.x;
      const ray = this.raycaster.ray;
      const t = -ray.origin.dot(ray.direction);
      if (t > 0) {
        const closestPointOnRay = ray.origin.clone().addScaledVector(ray.direction, t);
        if (closestPointOnRay.lengthSq() > 0) {
          pt = closestPointOnRay.normalize().multiplyScalar(r);
        }
      }
    }
    if (!pt) return null;

    if (baselineRotation) {
      const c = Math.cos(-baselineRotation);
      const s = Math.sin(-baselineRotation);
      return new this.THREE.Vector3(
        pt.x * c - pt.y * s,
        pt.x * s + pt.y * c,
        pt.z
      );
    }
    return pt;
  }

  pickBaselinePlane() {
    if (!this.raycaster?.ray) return null;
    const planeZ0 = new this.THREE.Plane(new this.THREE.Vector3(0, 0, 1), 0);
    const planeHit = new this.THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(planeZ0, planeHit);
    if (hit && planeHit.lengthSq() > 1e-4) {
      return planeHit;
    }
    return this.pickSphere(0);
  }

  setCameraPreset(presetName) {
    const presets = {
      default: { pos: new this.THREE.Vector3(30, 20, 30), up: new this.THREE.Vector3(0, 1, 0) },
      isometric: { pos: new this.THREE.Vector3(30, 20, 30), up: new this.THREE.Vector3(0, 1, 0) },
      top: { pos: new this.THREE.Vector3(0, 48, 0.001), up: new this.THREE.Vector3(0, 1, 0) },
      front: { pos: new this.THREE.Vector3(0, 0, 48), up: new this.THREE.Vector3(0, 1, 0) },
      side: { pos: new this.THREE.Vector3(48, 0, 0), up: new this.THREE.Vector3(0, 1, 0) },
    };
    const target = presets[presetName] || presets.default;
    this.#animateCamera(target.pos, target.up);
  }

  #animateCamera(targetPos, targetUp) {
    if (this.controls?.angularVelocity) this.controls.angularVelocity.angle = 0;
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
