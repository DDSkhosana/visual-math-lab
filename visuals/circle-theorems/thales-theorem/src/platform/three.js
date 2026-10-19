/** The only place that reads Three.js from the page (classic CDN scripts expose globals). */
export function loadThree() {
  const THREE = window.THREE;
  if (!THREE || !THREE.OrbitControls) throw new Error('Three.js is not available');
  return THREE;
}
