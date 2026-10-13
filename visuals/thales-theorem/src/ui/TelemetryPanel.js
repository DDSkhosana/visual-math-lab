/**
 * Collapsible telemetry overlay panel attached to a canvas viewport.
 */
export class TelemetryPanel {
  /**
   * @param {HTMLElement} element Root container (.stats-overlay)
   * @param {{ header: HTMLElement, toggleButton: HTMLElement, body: HTMLElement }} parts
   * @param {boolean} [startCollapsed=true]
   */
  constructor(element, { header, toggleButton, body }, startCollapsed = true) {
    this.element = element;
    this.header = header;
    this.toggleButton = toggleButton;
    this.body = body;

    this.header.setAttribute('role', 'button');
    this.header.tabIndex = 0;

    this.header.addEventListener('click', () => this.setCollapsed(!this.collapsed));
    this.header.addEventListener('keydown', (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target === this.header) {
        event.preventDefault();
        this.setCollapsed(!this.collapsed);
      }
    });

    this.setCollapsed(startCollapsed);
  }

  get collapsed() {
    return this.body.classList.contains('hidden');
  }

  setCollapsed(collapsed) {
    this.body.classList.toggle('hidden', collapsed);
    this.element.classList.toggle('collapsed', collapsed);
    this.header.setAttribute('aria-expanded', String(!collapsed));
    this.toggleButton.setAttribute('aria-expanded', String(!collapsed));
    this.toggleButton.textContent = collapsed ? '+' : '−';
  }
}
