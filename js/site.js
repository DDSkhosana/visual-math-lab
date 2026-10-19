import { initializeAnalytics } from "./analytics.js?v=20260523";
import { mountSharedChrome } from "./components.js?v=20260523";
import { renderCatalogue, renderTrigCatalogue } from "./catalog.js";

initializeAnalytics();
mountSharedChrome();

const root = document.body?.dataset?.root || ".";

const catalogue = document.querySelector("[data-catalogue]");
if (catalogue) {
  renderCatalogue(catalogue, root).catch((error) => {
    catalogue.innerHTML = '<p class="notice">The visual catalogue is temporarily unavailable.</p>';
    console.error(error);
  });
}

const trigCatalogue = document.querySelector("[data-trig-catalogue]");
if (trigCatalogue) {
  renderTrigCatalogue(trigCatalogue, root).catch((error) => {
    trigCatalogue.innerHTML = '<p class="notice">The trigonometry catalogue is temporarily unavailable.</p>';
    console.error(error);
  });
}
