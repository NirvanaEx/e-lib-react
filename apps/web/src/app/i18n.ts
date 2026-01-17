import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      appName: "e-lib",
      login: "Login",
      password: "Password",
      signIn: "Sign in",
      admin: "Admin",
      manage: "Manage",
      user: "User",
      users: "Users",
      departments: "Departments",
      sessions: "Sessions",
      audit: "Audit log",
      sections: "Sections",
      categories: "Categories",
      files: "Files",
      trash: "Trash",
      stats: "Statistics",
      settings: "Settings",
      logout: "Logout",
      language: "Language"
    }
  },
  ru: {
    translation: {
      appName: "e-lib",
      login: "Логин",
      password: "Пароль",
      signIn: "Войти",
      admin: "Админ",
      manage: "Управление",
      user: "Пользователь",
      users: "Пользователи",
      departments: "Отделы",
      sessions: "Сессии",
      audit: "Аудит",
      sections: "Разделы",
      categories: "Категории",
      files: "Файлы",
      trash: "Корзина",
      stats: "Статистика",
      settings: "Настройки",
      logout: "Выйти",
      language: "Язык"
    }
  },
  uz: {
    translation: {
      appName: "e-lib",
      login: "Login",
      password: "Parol",
      signIn: "Kirish",
      admin: "Admin",
      manage: "Boshqaruv",
      user: "Foydalanuvchi",
      users: "Foydalanuvchilar",
      departments: "Bo'limlar",
      sessions: "Sessiyalar",
      audit: "Audit",
      sections: "Bo'limlar",
      categories: "Kategoriyalar",
      files: "Fayllar",
      trash: "Savatcha",
      stats: "Statistika",
      settings: "Sozlamalar",
      logout: "Chiqish",
      language: "Til"
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: "ru",
  fallbackLng: "ru",
  interpolation: { escapeValue: false }
});

export default i18n;
