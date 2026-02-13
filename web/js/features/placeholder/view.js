export function renderPlaceholderPage({ viewRoot, tabName }) {
  viewRoot.innerHTML = `<div class="empty-result">${tabName} page is not implemented yet.</div>`;
}
