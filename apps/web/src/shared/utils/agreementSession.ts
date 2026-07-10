// The agreement must be answered once per login, but BaseLayout remounts whenever the
// user switches panels. Session storage survives those remounts and dies with the tab,
// so it tracks "already answered during this login" without outliving the session.
const STORAGE_KEY = "agreement-answered";

// Re-prompt when the agreement text changes under a logged-in user.
export function agreementSignature(userId: number, updatedAt?: string | null) {
  return `${userId}:${updatedAt || ""}`;
}

export function isAgreementAnswered(signature: string) {
  return sessionStorage.getItem(STORAGE_KEY) === signature;
}

export function markAgreementAnswered(signature: string) {
  sessionStorage.setItem(STORAGE_KEY, signature);
}

export function clearAgreementAnswered() {
  sessionStorage.removeItem(STORAGE_KEY);
}
