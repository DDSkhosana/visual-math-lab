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
  container.innerHTML = published.map((visual) => `
    <a class="visual-card" href="${root}/visuals/${encodeURIComponent(visual.slug)}/">
      <img src="${root}/${visual.thumbnail}" alt="" width="1200" height="800" loading="lazy">
      <div class="visual-card__content">
        <h3 class="visual-card__title">${escapeHtml(visual.title)}</h3>
        <p class="visual-card__category">${escapeHtml(visual.category)}</p>
      </div>
    </a>
  `).join("");
}
