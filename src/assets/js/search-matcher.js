const SEARCH_RESULT_LIMIT_DEFAULT = 10;
const MAX_QUERY_LENGTH = 120;

function stringValue(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function normalizeSearchText(value) {
  return stringValue(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function compactText(value) {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

function tokenScore(queryNormalized, queryCompact, titleNormalized, titleCompact, idText) {
  let score = 0;

  if (idText === queryNormalized) {
    score = Math.max(score, 160);
  } else if (idText.startsWith(queryNormalized)) {
    score = Math.max(score, 120);
  }

  if (titleNormalized === queryNormalized) {
    score = Math.max(score, 150);
  } else if (titleNormalized.startsWith(queryNormalized)) {
    score = Math.max(score, 120);
  } else if (titleNormalized.includes(queryNormalized)) {
    score = Math.max(score, 92);
  }

  if (queryCompact.length > 0) {
    if (titleCompact === queryCompact) {
      score = Math.max(score, 145);
    } else if (titleCompact.startsWith(queryCompact)) {
      score = Math.max(score, 110);
    } else if (titleCompact.includes(queryCompact)) {
      score = Math.max(score, 84);
    }
  }

  return score;
}

function entryScore(entry, queryNormalized, queryCompact) {
  const name = stringValue(entry && entry.name);
  const titleNormalized = normalizeSearchText(name);
  const titleCompact = compactText(name);
  const idText = stringValue(entry && entry.id);
  return tokenScore(queryNormalized, queryCompact, titleNormalized, titleCompact, idText);
}

export function matchSearchEntries(index, query, options = {}) {
  const rawQuery = stringValue(query).slice(0, MAX_QUERY_LENGTH);
  const queryNormalized = normalizeSearchText(rawQuery);
  const queryCompact = compactText(rawQuery);
  if (!queryNormalized) return [];

  const limit = Math.max(1, Number(options.limit || SEARCH_RESULT_LIMIT_DEFAULT));
  const matches = [];

  for (const entry of Array.isArray(index) ? index : []) {
    const score = entryScore(entry, queryNormalized, queryCompact);
    if (score <= 0) continue;
    matches.push({ entry, score });
  }

  matches.sort((left, right) => {
    if (left.score !== right.score) return right.score - left.score;
    if (left.entry.type !== right.entry.type) return stringValue(left.entry.type).localeCompare(stringValue(right.entry.type));
    const titleCompare = stringValue(left.entry.name).localeCompare(stringValue(right.entry.name));
    if (titleCompare !== 0) return titleCompare;
    return Number(left.entry.id || 0) - Number(right.entry.id || 0);
  });

  return matches.slice(0, limit).map((match) => match.entry);
}
