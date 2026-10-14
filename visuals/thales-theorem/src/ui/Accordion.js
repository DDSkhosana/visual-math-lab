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
        expandBtn.textContent = allOpen ? 'Collapse All' : 'Expand All';
      }
    }
    return true;
  }

  setOpen(header, open) {
    header.classList.toggle('open', open);
    header.setAttribute('aria-expanded', String(open));
    header.nextElementSibling?.classList.toggle('open', open);
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
