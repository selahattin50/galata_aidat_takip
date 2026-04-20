const EXTERNAL_INTENT_KEY = 'galata_external_intent_at';
const EXTERNAL_INTENT_TTL_MS = 15000;

export const markExternalIntent = () => {
  try {
    sessionStorage.setItem(EXTERNAL_INTENT_KEY, Date.now().toString());
  } catch {
    // ignore storage issues
  }
};

export const consumeRecentExternalIntent = () => {
  try {
    const raw = sessionStorage.getItem(EXTERNAL_INTENT_KEY);
    if (!raw) return false;

    sessionStorage.removeItem(EXTERNAL_INTENT_KEY);
    const timestamp = Number(raw);
    return Number.isFinite(timestamp) && Date.now() - timestamp <= EXTERNAL_INTENT_TTL_MS;
  } catch {
    return false;
  }
};
