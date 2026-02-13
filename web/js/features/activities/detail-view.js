import { makeInitials } from "../../../utils.js";
import { loadCharacterImageSource } from "../../services/asset-image-loader.js";
import { loadActivityDetail } from "../../services/activities-data.js";

function createElement(tagName, className = "", text = "") {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function textOrDash(value) {
  const text = String(value || "").trim();
  return text.length > 0 ? text : "-";
}

function createStatCell(label, value) {
  const cell = createElement("div", "activity-detail-stat-cell");
  cell.append(
    createElement("div", "activity-detail-stat-label", label),
    createElement("div", "activity-detail-stat-value", textOrDash(value)),
  );
  return cell;
}

async function hydrateBannerImage(placeholder, candidates, altText) {
  if (!Array.isArray(candidates) || candidates.length === 0) return;
  const source = await loadCharacterImageSource(candidates);
  if (!source || !placeholder.isConnected) return;

  const image = createElement("img", "activity-detail-banner");
  image.src = source;
  image.alt = altText;
  placeholder.replaceWith(image);
}

function createItemChip(item, onOpenItemDetail) {
  const chip = createElement("button", "activity-item-chip", `${item.name} x${item.count}`);
  chip.type = "button";
  chip.addEventListener("click", () => {
    const itemId = Number(item.id || 0);
    if (itemId <= 0) return;

    if (typeof onOpenItemDetail === "function") {
      onOpenItemDetail(itemId);
      return;
    }
    window.location.hash = `#/items/${itemId}`;
  });
  return chip;
}

function appendItemSection(container, title, items, onOpenItemDetail) {
  if (!Array.isArray(items) || items.length === 0) return;

  const block = createElement("section", "activity-item-group");
  block.append(createElement("h6", "activity-item-group-title", title));

  const list = createElement("div", "activity-item-chip-list");
  for (const item of items) {
    list.append(createItemChip(item, onOpenItemDetail));
  }
  block.append(list);
  container.append(block);
}

function createTableSummaryCard(table) {
  const card = createElement("article", "activity-table-card");

  const top = createElement("div", "activity-table-card-top");
  const title = createElement("h6", "activity-table-card-title", table.tableLabel);
  const scope = createElement(
    "span",
    `activity-table-scope ${table.scope === "direct" ? "direct" : "derived"}`,
    table.scope,
  );
  top.append(title, scope);

  const meta = createElement(
    "p",
    "activity-table-card-meta",
    `${table.rowCount} rows · ${table.relation}`,
  );

  const keys = createElement("div", "activity-table-keys");
  for (const key of table.sampleKeys || []) {
    keys.append(createElement("span", "activity-table-key", key));
  }

  card.append(top, meta, keys);

  if (Array.isArray(table.previewRows) && table.previewRows.length > 0) {
    const preview = createElement("pre", "activity-table-preview");
    preview.textContent = JSON.stringify(table.previewRows[0], null, 2);
    card.append(preview);
  }

  return card;
}

export async function renderActivityDetailPage({
  viewRoot,
  getLanguage,
  activityId,
  goToActivities,
  onOpenItemDetail,
}) {
  viewRoot.innerHTML = `<div class="empty-result">Loading activity detail...</div>`;

  try {
    const language = typeof getLanguage === "function" ? getLanguage() : "en";
    const detail = await loadActivityDetail(activityId, language);
    if (!detail) {
      viewRoot.innerHTML = `<div class="empty-result">Activity not found.</div>`;
      return;
    }

    const page = createElement("div", "activity-detail-page");

    const topRow = createElement("div", "d-flex flex-wrap align-items-center gap-2 mb-1");
    const backButton = createElement("button", "btn btn-sm btn-outline-secondary character-filter-btn", "Back to activities");
    backButton.type = "button";
    backButton.addEventListener("click", () => {
      if (typeof goToActivities === "function") {
        goToActivities();
        return;
      }
      window.location.hash = "#/activities";
    });
    topRow.append(backButton);
    page.append(topRow);

    const topLayout = createElement("section", "activity-detail-top-layout");
    const bannerColumn = createElement("div", "activity-detail-banner-column");
    const bannerPlaceholder = createElement(
      "div",
      "activity-detail-banner placeholder",
      makeInitials(detail.name),
    );
    bannerColumn.append(bannerPlaceholder);
    void hydrateBannerImage(
      bannerPlaceholder,
      detail.banner ? detail.banner.candidates : [],
      `${detail.name} banner`,
    );

    const infoCard = createElement("section", "card border-0 shadow-sm");
    const infoBody = createElement("div", "card-body");
    const title = createElement("h1", "activity-detail-name", detail.name);
    const subtitle = createElement("p", "activity-detail-type", `#${detail.id} · ${detail.type}`);
    infoBody.append(title, subtitle);

    const statsGrid = createElement("div", "activity-detail-stats-grid");
    statsGrid.append(
      createStatCell("Need Popout", detail.needPopout > 0 ? "Yes" : "No"),
      createStatCell("Direct Tables", detail.stats.directTableCount),
      createStatCell("Derived Tables", detail.stats.derivedTableCount),
      createStatCell("Direct Rows", detail.stats.directRowCount),
      createStatCell("Derived Rows", detail.stats.derivedRowCount),
      createStatCell("Unique Rows", detail.stats.uniqueRowCount),
    );
    infoBody.append(statsGrid);

    if (detail.banner) {
      const bannerMeta = createElement("p", "activity-detail-banner-meta");
      bannerMeta.textContent = `Banner sort ${detail.banner.sort}, type ${detail.banner.bannerType}, remind ${detail.banner.timeRemind}`;
      infoBody.append(bannerMeta);
    }

    infoCard.append(infoBody);
    topLayout.append(bannerColumn, infoCard);
    page.append(topLayout);

    const itemSection = createElement("section", "card border-0 shadow-sm mt-2");
    const itemBody = createElement("div", "card-body");
    itemBody.append(createElement("h6", "detail-section-title mb-3", "Item References"));

    appendItemSection(itemBody, "Rewards", detail.itemReferences.reward, onOpenItemDetail);
    appendItemSection(itemBody, "Costs", detail.itemReferences.cost, onOpenItemDetail);
    appendItemSection(itemBody, "Unlock Items", detail.itemReferences.unlock, onOpenItemDetail);
    appendItemSection(itemBody, "Other Item IDs", detail.itemReferences.other, onOpenItemDetail);

    const hasAnyItems = [
      detail.itemReferences.reward,
      detail.itemReferences.cost,
      detail.itemReferences.unlock,
      detail.itemReferences.other,
    ].some((entries) => Array.isArray(entries) && entries.length > 0);
    if (!hasAnyItems) {
      itemBody.append(createElement("p", "text-secondary small mb-0", "No parsed item references."));
    }

    itemSection.append(itemBody);
    page.append(itemSection);

    const tableSection = createElement("section", "card border-0 shadow-sm mt-2");
    const tableBody = createElement("div", "card-body");
    tableBody.append(createElement("h6", "detail-section-title mb-3", "Linked Tables"));

    if (!Array.isArray(detail.tables) || detail.tables.length === 0) {
      tableBody.append(createElement("p", "text-secondary small mb-0", "No linked table rows."));
    } else {
      const grid = createElement("div", "activity-table-grid");
      for (const table of detail.tables) {
        grid.append(createTableSummaryCard(table));
      }
      tableBody.append(grid);
    }

    tableSection.append(tableBody);
    page.append(tableSection);

    viewRoot.innerHTML = "";
    viewRoot.append(page);
  } catch (error) {
    console.error(error);
    viewRoot.innerHTML = `<div class="empty-result">Failed to load activity detail.</div>`;
  }
}
