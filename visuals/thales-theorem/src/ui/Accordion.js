export const CHEVRON_DOWN_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="7 8 12 13 17 8"></polyline><polyline points="7 13 12 18 17 13"></polyline></svg>`;
export const CHEVRON_UP_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="7 11 12 6 17 11"></polyline><polyline points="7 16 12 11 17 16"></polyline></svg>`;

export function setExpandButtonUI(btn, isExpanded) {
  if (!btn) return;
  btn.setAttribute('aria-expanded', String(isExpanded));
  btn.title = isExpanded ? 'Collapse all sections' : 'Expand all sections';

  let icon = btn.querySelector('.panel-expand-icon');
  let label = btn.querySelector('.panel-expand-label');

  if (!icon || !label) {
    btn.classList.add('panel-expand-btn');
    btn.innerHTML = `
      <span class="panel-expand-icon" aria-hidden="true">${isExpanded ? CHEVRON_UP_SVG : CHEVRON_DOWN_SVG}</span>
      <span class="panel-expand-label">${isExpanded ? 'Collapse All' : 'Expand All'}</span>
    `;
    return;
  }

  icon.innerHTML = isExpanded ? CHEVRON_UP_SVG : CHEVRON_DOWN_SVG;
  label.textContent = isExpanded ? 'Collapse All' : 'Expand All';
}

const HEADER = '.collapsible-header';

/** Collapsible sections using event delegation; adds the ARIA and keyboard support the markup lacked. */
export class Accordion {
  constructor(root) {
    this.root = root;
    root.querySelectorAll(HEADER).forEach((header) => {
      header.setAttribute('role', 'button');
      header.tabIndex = 0;
      this.setOpen(header, false);
    });
    root.addEventListener('click', (event) => this.#activate(event));
    root.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        if (this.#activate(event)) event.preventDefault();
      }
    });
  }

  #activate(event) {
    const header = event.target.closest(HEADER);
    if (!header || !this.root.contains(header)) return false;
    const nextState = !header.classList.contains('open');
    this.setOpen(header, nextState);
    const panel = header.closest('.ui-panel');
    if (panel) {
      const expandBtn = panel.querySelector('[id$="-btn"], [id$="-expand"]');
      const body = panel.querySelector('.panel-body');
      if (expandBtn && body) {
        const headers = this.headers(body);
        const allOpen = headers.length > 0 && headers.every((h) => h.classList.contains('open'));
        setExpandButtonUI(expandBtn, allOpen);
      }
    }
    return true;
  }

  setOpen(header, open) {
    header.classList.toggle('open', open);
    header.setAttribute('aria-expanded', String(open));
    const section = header.closest('.collapsible-section');
    if (section) section.classList.toggle('collapsed', !open);
    const content = header.nextElementSibling || section?.querySelector('.collapsible-content');
    if (content) {
      content.classList.toggle('open', open);
      content.classList.toggle('collapsed', !open);
    }
    const icon = header.querySelector('.icon');
    if (icon) {
      icon.textContent = open ? '▼' : '▶';
    }
  }

  headers(scope = this.root) {
    return [...scope.querySelectorAll(HEADER)];
  }

  allOpen(scope) {
    const headers = this.headers(scope);
    return headers.length > 0 && headers.every((header) => header.classList.contains('open'));
  }

  setAll(scope, open) {
    this.headers(scope).forEach((header) => this.setOpen(header, open));
  }
}
