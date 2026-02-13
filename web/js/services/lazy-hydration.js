const OBSERVER_ROOT_MARGIN = "280px 0px";

const pendingQueue = [];
const observedEntries = new Map();

let visibleObserver = null;

function supportsIntersectionObserver() {
  return typeof window !== "undefined" && typeof window.IntersectionObserver === "function";
}

function ensureObserver() {
  if (visibleObserver || !supportsIntersectionObserver()) {
    return visibleObserver;
  }

  visibleObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting && entry.intersectionRatio <= 0) continue;

      const taskEntry = observedEntries.get(entry.target);
      if (!taskEntry || taskEntry.cancelled) continue;

      visibleObserver.unobserve(entry.target);
      enqueueTaskEntry(taskEntry);
    }
  }, {
    root: null,
    rootMargin: OBSERVER_ROOT_MARGIN,
    threshold: 0.01,
  });

  return visibleObserver;
}

function dequeueNextTask() {
  while (pendingQueue.length > 0) {
    const nextEntry = pendingQueue.shift();
    if (!nextEntry || nextEntry.cancelled) continue;
    return nextEntry;
  }
  return null;
}

function runTaskQueue() {
  let entry = dequeueNextTask();
  while (entry) {
    const currentEntry = entry;
    Promise.resolve()
      .then(() => {
        if (currentEntry.cancelled) return;
        return currentEntry.task();
      })
      .catch(() => {
        // Ignore task failures so hydration keeps moving.
      })
      .finally(() => {
        observedEntries.delete(currentEntry.element);
      });

    entry = dequeueNextTask();
  }
}

function enqueueTaskEntry(entry) {
  if (!entry || entry.cancelled || entry.queued) return;
  entry.queued = true;
  pendingQueue.push(entry);
  runTaskQueue();
}

function cancelTaskEntry(entry) {
  if (!entry || entry.cancelled) return;
  entry.cancelled = true;
  observedEntries.delete(entry.element);
  if (visibleObserver && entry.element) {
    visibleObserver.unobserve(entry.element);
  }
}

export function scheduleVisibleTask(element, task) {
  if (!(element instanceof Element) || typeof task !== "function") {
    return () => {};
  }

  const existing = observedEntries.get(element);
  if (existing) {
    cancelTaskEntry(existing);
  }

  const entry = {
    element,
    task,
    queued: false,
    cancelled: false,
  };

  observedEntries.set(element, entry);

  const observer = ensureObserver();
  if (observer) {
    observer.observe(element);
  } else {
    enqueueTaskEntry(entry);
  }

  return () => cancelTaskEntry(entry);
}

export function clearLazyHydrationQueue() {
  for (const entry of observedEntries.values()) {
    cancelTaskEntry(entry);
  }
  observedEntries.clear();
  pendingQueue.length = 0;
}
