/** Null Object used when WebGL or Three.js is unavailable, so the 2D visual keeps working. */
export class NullScene3DView {
  static stateKeys = [];

  available = false;
  domElement = null;

  render() {}
  renderFrame() {}
  resize() {}
  project() { return null; }
  setOrbitEnabled() {}
  pointerToRay() {}
  hitsPointP() { return false; }
  hitsPointA() { return false; }
  hitsPointB() { return false; }
  hitsCircumference() { return false; }
  pickCircumferenceRadius() { return null; }
  pickSphere() { return null; }
  setCameraPreset() {}
}
