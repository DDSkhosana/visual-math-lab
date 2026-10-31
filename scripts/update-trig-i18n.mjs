import fs from 'node:fs';

const path = 'visuals/trigonometry/js/trig-core.js';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  `export class TrigDerivationsView {
  constructor(container, visualId) {
    this.container = container;
    this.visualId = visualId;
    this.initialized = false;
    this.currentMode = null;
  }`,
  `export class TrigDerivationsView {
  constructor(container, visualId) {
    this.container = container;
    this.visualId = visualId;
    this.initialized = false;
    this.currentMode = null;
    this.lastState = null;
    if (typeof window !== "undefined") {
      window.addEventListener("vml:locale-changed", () => {
        this.initialized = false;
        if (this.lastState && this.container) {
          this.render(this.lastState);
        }
      });
    }
  }`
);

code = code.replace(
  `  render(state) {
    if (!this.container) return;
    const isModeChanged = this.currentMode !== (state.dimensionMode || 'planar');`,
  `  render(state) {
    if (!this.container) return;
    this.lastState = state;
    const isModeChanged = this.currentMode !== (state.dimensionMode || 'planar');`
);

fs.writeFileSync(path, code, 'utf8');
console.log("Updated trig-core.js successfully");

