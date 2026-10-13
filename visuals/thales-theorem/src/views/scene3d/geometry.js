const SECTOR_SEGMENTS = 24;

export function setPositions(THREE, geometry, values) {
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(values, 3));
  geometry.computeVertexNormals();
}

/** Triangle fan for the angle between two directions at `center`; null when either direction is degenerate. */
export function sectorVertices(THREE, center, vec1, vec2, radius) {
  if (vec1.lengthSq() === 0 || vec2.lengthSq() === 0) return null;
  const v1 = vec1.clone().normalize();
  const v2 = vec2.clone().normalize();
  const angle = v1.angleTo(v2);
  const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
  if (normal.lengthSq() < 0.001) normal.set(0, 1, 0);

  const rim = [];
  for (let i = 0; i <= SECTOR_SEGMENTS; i++) {
    rim.push(v1.clone().applyAxisAngle(normal, angle * (i / SECTOR_SEGMENTS)).multiplyScalar(radius).add(center));
  }
  const vertices = [];
  for (let i = 0; i < SECTOR_SEGMENTS; i++) {
    vertices.push(center.x, center.y, center.z, rim[i].x, rim[i].y, rim[i].z, rim[i + 1].x, rim[i + 1].y, rim[i + 1].z);
  }
  return vertices;
}

/** Two triangles forming the small square that marks the right angle at P. */
export function rightAngleVertices(THREE, apex, towardA, towardB, size) {
  if (!towardA || !towardB || towardA.lengthSq() < 1e-4 || towardB.lengthSq() < 1e-4) {
    return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
  const c1 = apex.clone().add(towardA.clone().multiplyScalar(size));
  const c2 = c1.clone().add(towardB.clone().multiplyScalar(size));
  const c3 = apex.clone().add(towardB.clone().multiplyScalar(size));
  return [
    apex.x, apex.y, apex.z, c1.x, c1.y, c1.z, c2.x, c2.y, c2.z,
    apex.x, apex.y, apex.z, c2.x, c2.y, c2.z, c3.x, c3.y, c3.z,
  ];
}
