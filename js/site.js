import { initializeAnalytics } from "./analytics.js";
import { mountSharedChrome } from "./components.js?v=20260521";
import { renderCatalogue } from "./catalog.js";

initializeAnalytics();
mountSharedChrome();

const catalogue = document.querySelector("[data-catalogue]");
if (catalogue) {
  renderCatalogue(catalogue, ".").catch((error) => {
    catalogue.innerHTML = '<p class="notice">The visual catalogue is temporarily unavailable.</p>';
    console.error(error);
  });
}
