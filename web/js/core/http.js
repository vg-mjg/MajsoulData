export async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`failed to load ${path}: ${response.status}`);
  }
  return response.json();
}
