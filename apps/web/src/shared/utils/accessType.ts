/**
 * Single source of truth for how an access type is named and coloured.
 *
 * Four states:
 *  - public            — visible and downloadable by everyone, no attachments
 *  - department_open   — attached to a department, readable by everyone
 *  - department_closed — attached to a department, readable only by it
 *  - restricted        — specific departments and specific people
 *
 * The label/colour logic used to be copy-pasted across six pages, which is why
 * adding a state meant touching all of them.
 */
export type AccessType = "public" | "department_open" | "department_closed" | "restricted";

export function isOpenAccess(accessType?: string | null) {
  return accessType === "public" || accessType === "department_open";
}

export function accessLabelKey(accessType?: string | null) {
  if (accessType === "restricted") return "accessRestricted";
  if (accessType === "department_closed") return "accessDepartmentClosed";
  if (accessType === "department_open") return "accessDepartmentOpen";
  return "accessPublic";
}

export function accessColor(accessType?: string | null) {
  if (accessType === "restricted") return "warning.main";
  if (accessType === "department_closed") return "info.main";
  // department_open is readable by everyone, so it reads as open like public.
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
