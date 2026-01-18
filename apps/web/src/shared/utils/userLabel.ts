export type UserLabelInput = {
  login?: string | null;
  surname?: string | null;
  name?: string | null;
  patronymic?: string | null;
  fullName?: string | null;
};

const buildShortName = (surname?: string | null, name?: string | null, patronymic?: string | null) => {
  const cleanSurname = surname?.trim();
  const nameInitial = name?.trim().charAt(0);
  const patronymicInitial = patronymic?.trim().charAt(0);
  const initials = [nameInitial, patronymicInitial]
    .filter(Boolean)
    .map((ch) => ch?.toUpperCase())
    .join(".");
  if (cleanSurname) {
    return initials ? `${cleanSurname} ${initials}.` : cleanSurname;
  }
  if (initials) {
    return `${initials}.`;
  }
  return null;
};

export const formatUserLabel = (user: UserLabelInput) => {
  const login = user.login?.trim();
  const directShort = buildShortName(user.surname, user.name, user.patronymic);
  let short = directShort;

  if (!short && user.fullName) {
    const parts = user.fullName.trim().split(/\s+/);
    if (parts.length > 0) {
      short = buildShortName(parts[0], parts[1], parts[2]);
    }
    if (!short) {
      short = user.fullName.trim();
    }
  }

  if (login && short) {
    return `${login} (${short})`;
  }
  return login || short || "";
};
