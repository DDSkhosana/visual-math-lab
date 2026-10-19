import { computeFrame, drawScene } from './canvas2d-draw.js';
import { generateSceneSVG } from './canvas2d-svg.js';

/** Owns the 2D canvas: sizing (via ResizeObserver) and painting. Holds no domain state. */
export class Canvas2DView {
  static stateKeys = ['radius', 'angle2D', 'lat3D', 'lon3D', 'plane2D', 'baselineRotation', 'pan', 'zoom', 'hoverP2D', 'hoverA2D', 'hoverB2D', 'vis2d', 'affineMode', 'affineStretch', 'affineAxisAngle'];

  constructor(canvas, container) {
    this.canvas = canvas;
    this.container = container;
    this.ctx = canvas.getContext('2d');
    this.state = null;
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
  }

  resize() {
    const { clientWidth: width, clientHeight: height } = this.container;
    if (!width || !height) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(width * dpr));
    this.canvas.height = Math.max(1, Math.floor(height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.logicalWidth = width;
    this.logicalHeight = height;
    this.draw();
  }

  render(state) {
    this.state = state;
    this.draw();
    this.updateTitle(state);
  }

  updateTitle(state) {
    const title = this.container.querySelector('#view-title-2d') || document.getElementById('view-title-2d');
    if (!title) return;
    const plane = state.plane2D ?? 'great-circle';
    const frame = this.frame(state);
    const px = frame.pCoords.x;
    const py = frame.pCoords.y;
    const qStr = py >= 0
      ? (px >= 0 ? 'Quadrant I (+X, +Y)' : 'Quadrant II (-X, +Y)')
      : (px < 0 ? 'Quadrant III (-X, -Y)' : 'Quadrant IV (+X, -Y)');

    let baseTitle = '';
    if (plane === 'xy') {
      baseTitle = `2D: XY Plane Projection — <span class="color-yellow">${qStr}</span> (<span class="color-amber">X: Diameter</span>, <span class="color-lime">Y: Elevation</span>)`;
    } else if (plane === 'xz') {
      baseTitle = `2D: XZ Plane Projection — <span class="color-fuchsia">${qStr}</span> (<span class="color-amber">X: Diameter</span>, <span class="color-steel">Z: Depth</span>)`;
    } else if (plane === 'yz') {
      baseTitle = `2D: YZ Plane Projection — <span class="color-steel">${qStr}</span> (<span class="color-steel">Z: Depth</span>, <span class="color-lime">Y: Elevation</span>, <span class="color-red">AB ⟂</span>)`;
    } else {
      baseTitle = `2D: Great-Circle Section — <span class="color-yellow">${qStr}</span> (<span class="color-teal">Right Angle 90°</span> at <span class="color-violet">P</span>)`;
    }

    const perspectiveBadges = {
      'great-circle': ' <span class="perspective-badge color-sky font-bold">[Isometric Perspective]</span>',
      'xz': ' <span class="perspective-badge color-yellow font-bold">[Top View: XZ Plan]</span>',
      'xy': ' <span class="perspective-badge color-lime font-bold">[Front View: XY Elevation]</span>',
      'yz': ' <span class="perspective-badge color-steel font-bold">[Side View: YZ Profile]</span>',
    };
    title.dataset.origTitle = baseTitle;
    title.innerHTML = `${baseTitle}${perspectiveBadges[plane] || perspectiveBadges['great-circle']}`;
  }

  draw() {
    if (!this.state || !this.canvas.width) return;
    drawScene(this.ctx, this.state, this.frame());
  }

  frame(state = this.state) {
    const w = this.logicalWidth || this.container.clientWidth || this.canvas.width;
    const h = this.logicalHeight || this.container.clientHeight || this.canvas.height;
    return computeFrame(state, w, h);
  }

  /** Pointer position in canvas pixels. */
  toLocal(event) {
    const rect = this.canvas.getBoundingClientRect();
    const w = this.logicalWidth || rect.width || this.canvas.width;
    const h = this.logicalHeight || rect.height || this.canvas.height;
    const scaleX = rect.width ? w / rect.width : 1;
    const scaleY = rect.height ? h / rect.height : 1;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  }

  exportPNG(filename = 'thales-theorem-2d.png') {
    const width = this.logicalWidth || this.canvas.width;
    const height = this.logicalHeight || this.canvas.height;
    if (!width || !height || !this.state) return;

    const offscreen = document.createElement('canvas');
    const scale = 2; // high-dpi crisp export
    offscreen.width = width * scale;
    offscreen.height = height * scale;
    const offCtx = offscreen.getContext('2d');
    offCtx.scale(scale, scale);

    // Dark background
    offCtx.fillStyle = '#0f172a';
    offCtx.fillRect(0, 0, width, height);

    // Render scene without hover state
    const exportState = { ...this.state, hoverP2D: false };
    drawScene(offCtx, exportState, this.frame(exportState));

    // Attribution watermark
    offCtx.fillStyle = 'rgba(148, 163, 184, 0.7)';
    offCtx.font = 'bold 11px monospace';
    offCtx.fillText("Thales' Theorem | Visual Mathematics Lab", 14, height - 12);

    offscreen.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  exportSVG(filename = 'thales-theorem-2d.svg') {
    if (!this.state || !this.canvas.width) return;
    const f = this.frame();
    if (!f) return;
    const svgStr = generateSceneSVG(this.state, f);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
