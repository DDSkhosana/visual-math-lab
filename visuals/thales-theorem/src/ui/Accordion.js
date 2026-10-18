import { syncPanelElevationTurn } from '../../../../js/workspace-dock.js';

export const CHEVRON_DOWN_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="7 8 12 13 17 8"></polyline><polyline points="7 13 12 18 17 13"></polyline></svg>`;
export const CHEVRON_UP_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="7 11 12 6 17 11"></polyline><polyline points="7 16 12 11 17 16"></polyline></svg>`;

export const CHEVRON_DOWN_SINGLE_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
export const CHEVRON_UP_SINGLE_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg>`;

export function setPanelMinimizeButtonUI(btn, isMinimized, label = 'Panel') {
  if (!btn) return;
  const isExpanded = !isMinimized;
  btn.setAttribute('aria-expanded', String(isExpanded));

  let resolvedLabel = label;
  if (btn.id?.includes('2d') || btn.id?.includes('stats-2d')) resolvedLabel = '2D Telemetry';
  else if (btn.id?.includes('3d') || btn.id?.includes('stats-3d')) resolvedLabel = '3D Telemetry';
  else if (btn.id?.includes('deriv')) resolvedLabel = 'Derivations Panel';
  else if (btn.id?.includes('controls') || btn.id?.includes('thales')) resolvedLabel = 'Controls Panel';
  else if (btn.id?.includes('toolbar-2d')) resolvedLabel = '2D Controls';
  else if (btn.id?.includes('toolbar-3d') || btn.id === 'toggle-toolbar-minimize') resolvedLabel = '3D Controls';

  btn.title = isExpanded ? `Minimize ${resolvedLabel}` : `Expand ${resolvedLabel}`;
  btn.classList.add('panel-minimize-btn');

  let icon = btn.querySelector('.panel-minimize-icon');
  if (!icon) {
    btn.innerHTML = `<span class="panel-minimize-icon" aria-hidden="true">${isExpanded ? CHEVRON_UP_SINGLE_SVG : CHEVRON_DOWN_SINGLE_SVG}</span>`;
  } else {
    icon.innerHTML = isExpanded ? CHEVRON_UP_SINGLE_SVG : CHEVRON_DOWN_SINGLE_SVG;
  }
}

export function setExpandButtonUI(btn, isExpanded) {
  if (!btn || btn.id === 'nav-visuals-btn' || btn.classList?.contains?.('site-nav__dropdown-trigger')) return;
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
      const expandBtn = panel.querySelector('.panel-expand-btn, [id$="-expand"]');
      const body = panel.querySelector('.panel-body');
      if (body) {
        const headers = this.headers(body);
        const openHeaders = headers.filter((h) => h.classList.contains('open'));
        const allOpen = headers.length > 0 && openHeaders.length === headers.length;
        if (expandBtn) setExpandButtonUI(expandBtn, allOpen);

        const totalOpen = openHeaders.length;
        panel.classList.toggle('has-expanded-subpanel', totalOpen > 0);
        body.classList.toggle('is-all-expanded', totalOpen > 1);

        const isSingle = totalOpen === 1;
        headers.forEach((h) => {
          const sec = h.closest('.collapsible-section');
          if (sec) {
            sec.classList.toggle('is-subpanel-overlay', isSingle && h.classList.contains('open'));
          }
        });
        syncPanelElevationTurn(panel, header.closest('.collapsible-section'));
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
    const panel = scope.closest?.('.ui-panel');
    if (panel) {
      const headers = this.headers(scope);
      const openHeaders = headers.filter((h) => h.classList.contains('open'));
      const totalOpen = openHeaders.length;
      panel.classList.toggle('has-expanded-subpanel', totalOpen > 0);
      scope.classList.toggle('is-all-expanded', totalOpen > 1);
      const isSingle = totalOpen === 1;
      headers.forEach((h) => {
        const sec = h.closest('.collapsible-section');
        if (sec) {
          sec.classList.toggle('is-subpanel-overlay', isSingle && h.classList.contains('open'));
        }
      });
      syncPanelElevationTurn(panel);
    }
  }
}
