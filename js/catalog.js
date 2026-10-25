function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

function renderVisualCard(visual, root = ".", defaultSuite = "circle-theorems") {
  const suite = visual.suite || defaultSuite;
  const thumbnail = visual.thumbnail || "assets/images/thales-thumbnail.svg";
  return `
    <a class="visual-card" href="${root}/visuals/${encodeURIComponent(suite)}/${encodeURIComponent(visual.slug)}/">
      <img src="${root}/${thumbnail}" alt="" width="1200" height="800" loading="lazy">
      <div class="visual-card__content">
        <h3 class="visual-card__title">${escapeHtml(visual.title)}</h3>
        <p class="visual-card__category">${escapeHtml(visual.category)}</p>
      </div>
    </a>
  `;
}

export async function renderCatalogue(container, root = ".") {
  const response = await fetch(`${root}/data/visuals.json`);
  if (!response.ok) {
    throw new Error(`Could not load visual catalogue (${response.status}).`);
  }

  const visuals = await response.json();
  const published = visuals.filter(
    (visual) => visual.published && (visual.suite || "circle-theorems") === "circle-theorems"
  );
  container.innerHTML = published
    .map((visual) => renderVisualCard(visual, root, "circle-theorems"))
    .join("");
}

export async function renderTrigCatalogue(container, root = ".") {
  let visuals;
  try {
    const res = await fetch(`${root}/data/visuals.json`);
    if (res.ok) {
      const all = await res.json();
      const trig = all.filter((v) => v.suite === "trigonometry");
      if (trig.length > 0) visuals = trig;
    }
  } catch (_) {}

  if (!visuals) {
    const response = await fetch(`${root}/visuals/trigonometry/data/trig-visuals.json`);
    if (!response.ok) {
      throw new Error(`Could not load trigonometry catalogue (${response.status}).`);
    }
    visuals = await response.json();
  }

  const published = visuals.filter((visual) => visual.published);
  container.innerHTML = published
    .map((visual) => renderVisualCard(visual, root, "trigonometry"))
    .join("");
}
