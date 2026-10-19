function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

export async function renderCatalogue(container, root = ".") {
  const response = await fetch(`${root}/data/visuals.json`);
  if (!response.ok) {
    throw new Error(`Could not load visual catalogue (${response.status}).`);
  }

  const visuals = await response.json();
  const published = visuals.filter((visual) => visual.published);
  container.innerHTML = published.map((visual) => {
    const suite = visual.suite || "circle-theorems";
    return `
    <a class="visual-card" href="${root}/visuals/${encodeURIComponent(suite)}/${encodeURIComponent(visual.slug)}/">
      <img src="${root}/${visual.thumbnail}" alt="" width="1200" height="800" loading="lazy">
      <div class="visual-card__content">
        <h3 class="visual-card__title">${escapeHtml(visual.title)}</h3>
        <p class="visual-card__category">${escapeHtml(visual.category)}</p>
      </div>
    </a>
  `;
  }).join("");
}

export async function renderTrigCatalogue(container, root = ".") {
  const response = await fetch(`${root}/visuals/trigonometry/data/trig-visuals.json`);
  if (!response.ok) {
    throw new Error(`Could not load trigonometry catalogue (${response.status}).`);
  }

  const visuals = await response.json();
  const published = visuals.filter((visual) => visual.published);
  container.innerHTML = published.map((visual) => `
    <a class="visual-card" href="${root}/visuals/trigonometry/${encodeURIComponent(visual.slug)}/">
      <div class="visual-card__content" style="padding: 1.35rem; display: flex; flex-direction: column; gap: 0.55rem;">
        <span class="eyebrow" style="font-size: 0.72rem; color: #38bdf8;">${escapeHtml(visual.badge || visual.category)}</span>
        <h3 class="visual-card__title">${escapeHtml(visual.title)}</h3>
        <p class="visual-card__category" style="line-height: 1.5; opacity: 0.85;">${escapeHtml(visual.description)}</p>
        <code style="margin-top: auto; padding: 0.45rem 0.65rem; border-radius: 0.45rem; background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(56, 189, 248, 0.25); color: #5eead4; font-size: 0.78rem;">${escapeHtml(visual.formula || "")}</code>
      </div>
    </a>
  `).join("");
}
