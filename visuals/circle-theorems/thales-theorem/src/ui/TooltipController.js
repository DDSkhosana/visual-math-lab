/** "Show Explanations" toggle plus hover/focus tooltips on derivation steps. */
export class TooltipController {
  constructor(root, alwaysVisibleToggle) {
    this.alwaysVisible = false;
    this.steps = [...root.querySelectorAll('.derivation-step')].flatMap((step) => {
      const math = step.querySelector('.step-math');
      const tooltip = root.querySelector(`#${step.dataset.tooltipId}`);
      return math && tooltip ? [{ math, tooltip }] : [];
    });

    for (const { math, tooltip } of this.steps) {
      math.tabIndex = 0;
      const show = () => !this.alwaysVisible && tooltip.classList.add('visible');
      const hide = () => !this.alwaysVisible && tooltip.classList.remove('visible');
      math.addEventListener('mouseenter', show);
      math.addEventListener('mouseleave', hide);
      math.addEventListener('focus', show);
      math.addEventListener('blur', hide);
    }

    alwaysVisibleToggle?.addEventListener('change', (event) => {
      this.alwaysVisible = event.target.checked;
      this.steps.forEach(({ tooltip }) => tooltip.classList.toggle('visible', this.alwaysVisible));
    });
  }
}
