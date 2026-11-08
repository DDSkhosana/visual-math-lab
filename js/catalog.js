import { t } from "./i18n.js";

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

function renderVisualCard(visual, root = ".", defaultSuite = "circle-theorems") {
  const suite = visual.suite || defaultSuite;
  const thumbnail = visual.thumbnail || "assets/images/thales-thumbnail.svg";
  const translatedTitle = t(`visuals.${visual.slug}.title`, {}, visual.title);
  const translatedCategory = t(`visuals.${visual.slug}.category`, {}, visual.category);
  const translatedBadge = t(`visuals.${visual.slug}.badge`, {}, visual.badge);
  const badgeHtml = translatedBadge ? `<span class="visual-card__badge">${escapeHtml(translatedBadge)}</span>` : "";
  const formulaHtml = visual.formula ? `<div class="visual-card__formula"><code>${escapeHtml(visual.formula)}</code></div>` : "";
  return `
    <a class="visual-card" href="${root}/visuals/${encodeURIComponent(suite)}/${encodeURIComponent(visual.slug)}/" data-slug="${escapeHtml(visual.slug)}">
      <img src="${root}/${thumbnail}" alt="" width="1200" height="800" loading="lazy">
      <div class="visual-card__content">
        ${badgeHtml}
        <h3 class="visual-card__title">${escapeHtml(translatedTitle)}</h3>
        <p class="visual-card__category">${escapeHtml(translatedCategory)}</p>
        ${formulaHtml}
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
  const response = await fetch(`${root}/data/visuals.json`);
  if (!response.ok) {
    throw new Error(`Could not load trigonometry catalogue (${response.status}).`);
  }

  const visuals = await response.json();
  const published = visuals.filter(
    (visual) => visual.published && visual.suite === "trigonometry"
  );
  container.innerHTML = published
    .map((visual) => renderVisualCard(visual, root, "trigonometry"))
    .join("");
}

export async function renderFoundationsCatalogue(container, root = ".") {
  const response = await fetch(`${root}/visuals/foundations/data/foundations-visuals.json`);
  if (!response.ok) {
    throw new Error(`Could not load foundations catalogue (${response.status}).`);
  }

  const visuals = await response.json();
  const published = visuals.filter(
    (visual) => visual.published && visual.suite === "foundations"
  );
  container.innerHTML = published
    .map((visual) => renderVisualCard(visual, root, "foundations"))
    .join("");
}

if (typeof window !== "undefined") {
  window.addEventListener("vml:locale-changed", () => {
    document.querySelectorAll(".visual-card[data-slug]").forEach((card) => {
      const slug = card.getAttribute("data-slug");
      if (!slug) return;
      const titleEl = card.querySelector(".visual-card__title");
      const catEl = card.querySelector(".visual-card__category");
      const badgeEl = card.querySelector(".visual-card__badge");
      if (titleEl) titleEl.textContent = t(`visuals.${slug}.title`, {}, titleEl.textContent);
      if (catEl) catEl.textContent = t(`visuals.${slug}.category`, {}, catEl.textContent);
      if (badgeEl) badgeEl.textContent = t(`visuals.${slug}.badge`, {}, badgeEl.textContent);
    });
  });
}
