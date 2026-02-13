import { loadAchievementsData } from "../../services/achievements-data.js";

function textOrDash(value) {
  const text = String(value || "").trim();
  return text.length > 0 ? text : "-";
}

function createGroupButtons(groups, activeGroupId, countsByGroupId, onClick) {
  const container = document.createElement("div");
  container.className = "achievement-group-filters";

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = `btn btn-sm character-filter-btn ${activeGroupId === 0 ? "btn-secondary" : "btn-outline-secondary"}`;
  const allCount = groups.reduce((sum, group) => sum + Number(countsByGroupId.get(group.id) || 0), 0);
  allButton.textContent = `All (${allCount})`;
  allButton.addEventListener("click", () => onClick(0));
  container.append(allButton);

  for (const group of groups) {
    const count = Number(countsByGroupId.get(group.id) || 0);
    if (count <= 0) continue;

    const button = document.createElement("button");
    button.type = "button";
    button.className = `btn btn-sm character-filter-btn ${activeGroupId === group.id ? "btn-secondary" : "btn-outline-secondary"}`;
    button.textContent = `${group.name} (${count})`;
    button.addEventListener("click", () => onClick(group.id));
    container.append(button);
  }

  return container;
}

function createMetaBadge(text, tone = "normal") {
  const badge = document.createElement("span");
  badge.className = `achievement-meta-badge achievement-meta-${tone}`;
  badge.textContent = text;
  return badge;
}

function rareBadgeTone(rare) {
  const value = Number(rare || 0);
  if (value >= 3) return "rare-3";
  if (value === 2) return "rare-2";
  if (value === 1) return "rare-1";
  return "rare-0";
}

function createRewardChip(reward, onOpenItemDetail) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "achievement-reward-chip achievement-reward-chip-button";
  chip.addEventListener("click", () => {
    const itemId = Number(reward.id || 0);
    if (itemId <= 0) return;

    if (typeof onOpenItemDetail === "function") {
      onOpenItemDetail(itemId);
      return;
    }

    window.location.hash = `#/items/${itemId}`;
  });

  const mark = document.createElement("span");
  mark.className = "achievement-reward-mark";
  mark.setAttribute("aria-hidden", "true");
  chip.append(mark);

  const text = document.createElement("span");
  text.className = "achievement-reward-text";
  text.textContent = `${reward.name} x${reward.count}`;

  chip.append(text);
  return chip;
}

function createAchievementCard(achievement, onOpenItemDetail) {
  const card = document.createElement("article");
  card.className = "achievement-entry";

  const title = document.createElement("h6");
  title.className = "achievement-entry-title";
  title.textContent = achievement.name;

  const description = document.createElement("p");
  description.className = "achievement-entry-description";
  description.textContent = textOrDash(achievement.description);

  const meta = document.createElement("div");
  meta.className = "achievement-entry-meta";
  meta.append(createMetaBadge(`Rare ${achievement.rare}`, rareBadgeTone(achievement.rare)));
  if (achievement.hidden > 0) {
    meta.append(createMetaBadge("Hidden", "warning"));
  }
  if (achievement.locked > 0) {
    meta.append(createMetaBadge("Locked", "warning"));
  }
  if (achievement.deprecated > 0) {
    meta.append(createMetaBadge("Deprecated", "muted"));
  }
  card.append(title, description, meta);

  if (achievement.rewards.length > 0) {
    const rewards = document.createElement("div");
    rewards.className = "achievement-reward-list";
    for (const reward of achievement.rewards) {
      rewards.append(createRewardChip(reward, onOpenItemDetail));
    }
    card.append(rewards);
  }

  return card;
}

function renderAchievementsList(root, achievements, onOpenItemDetail) {
  root.innerHTML = "";
  if (achievements.length === 0) {
    root.innerHTML = `<div class="empty-result">No achievements found for this filter.</div>`;
    return;
  }

  const grid = document.createElement("div");
  grid.className = "achievement-entry-grid";
  for (const achievement of achievements) {
    grid.append(createAchievementCard(achievement, onOpenItemDetail));
  }
  root.append(grid);
}

export async function renderAchievementsPage({ viewRoot, getLanguage, onOpenItemDetail }) {
  viewRoot.innerHTML = `<div class="empty-result">Loading achievements...</div>`;

  try {
    const language = typeof getLanguage === "function" ? getLanguage() : "en";
    const data = await loadAchievementsData(language);

    if (!Array.isArray(data.achievements) || data.achievements.length === 0) {
      viewRoot.innerHTML = `<div class="empty-result">No achievements found.</div>`;
      return;
    }

    const activeGroups = data.groups.filter((group) => group.deprecated === 0);
    const activeGroupIdSet = new Set(activeGroups.map((group) => group.id));
    const baseAchievements = data.achievements.filter((achievement) => (
      activeGroupIdSet.has(achievement.groupId) && achievement.deprecated === 0
    ));

    if (baseAchievements.length === 0) {
      viewRoot.innerHTML = `<div class="empty-result">No active achievements found.</div>`;
      return;
    }

    viewRoot.innerHTML = "";

    let groupFilterId = 0;

    const groupFilterRoot = document.createElement("div");
    const listRoot = document.createElement("div");

    const render = () => {
      const countsByGroupId = new Map();
      for (const achievement of baseAchievements) {
        countsByGroupId.set(
          achievement.groupId,
          Number(countsByGroupId.get(achievement.groupId) || 0) + 1,
        );
      }

      const filtered = baseAchievements.filter((achievement) => (
        groupFilterId === 0 ? true : achievement.groupId === groupFilterId
      ));

      if (groupFilterId !== 0 && !countsByGroupId.has(groupFilterId)) {
        groupFilterId = 0;
      }

      groupFilterRoot.replaceChildren(
        createGroupButtons(activeGroups, groupFilterId, countsByGroupId, (nextGroupId) => {
          if (nextGroupId === groupFilterId) return;
          groupFilterId = nextGroupId;
          render();
        }),
      );

      renderAchievementsList(listRoot, filtered, onOpenItemDetail);
    };

    render();

    viewRoot.append(groupFilterRoot, listRoot);
  } catch (error) {
    console.error(error);
    viewRoot.innerHTML = `<div class="empty-result">Failed to load achievements data.</div>`;
  }
}
