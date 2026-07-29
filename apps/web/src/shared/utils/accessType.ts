/**
 * Single source of truth for how an access type is named and coloured.
 *
 * Four states:
 *  - public            — visible and downloadable by everyone, no attachments
 *  - restricted        — attached to departments and named people, only they read it
 *  - restricted_open   — same attachments, but the "open to everyone" switch is
 *                        on: everybody reads and downloads it, and the per-user
 *                        list no longer applies
 *  - department_closed — belongs to one department and is hidden from the shared
 *                        library entirely; it only shows in that department's tab
 *
 * The label/colour logic used to be copy-pasted across six pages, which is why
 * adding a state meant touching all of them.
 */
export type AccessType = "public" | "restricted" | "restricted_open" | "department_closed";

/** The two states the "open to everyone" switch flips between. */
export function isRestrictedFamily(accessType?: string | null) {
  return accessType === "restricted" || accessType === "restricted_open";
}

export function isOpenAccess(accessType?: string | null) {
  return accessType === "public" || accessType === "restricted_open";
}

export function accessLabelKey(accessType?: string | null) {
  if (accessType === "restricted") return "accessRestricted";
  if (accessType === "department_closed") return "accessDepartmentClosed";
  if (accessType === "restricted_open") return "accessRestrictedOpen";
  return "accessPublic";
}

export function accessColor(accessType?: string | null) {
  if (accessType === "restricted") return "warning.main";
  if (accessType === "department_closed") return "info.main";
  // restricted_open is readable by everyone, so it reads as open like public.
  return "success.main";
}

export function accessChipSx(accessType?: string | null) {
  if (isOpenAccess(accessType)) {
    return { backgroundColor: "rgba(22, 163, 74, 0.12)", color: "#15803d" };
  }
  if (accessType === "department_closed") {
    return { backgroundColor: "rgba(2, 132, 199, 0.12)", color: "#0369a1" };
  }
  return { backgroundColor: "rgba(161, 98, 7, 0.14)", color: "#a16207" };
}
