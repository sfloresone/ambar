// localStorage that never throws: it can be blocked (private mode, extension contexts, policies).
// Only for conveniences and the mock session; real tokens never live here (see AGENTS.md).

export function readItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Blocked: the value lives for this page only.
  }
}

export function removeItem(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Blocked: nothing was stored.
  }
}
