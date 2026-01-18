const permissions = [
  "dashboard.access",
  "role.read",
  "role.update",
  "role.add",
  "user.read",
  "user.add",
  "user.update",
  "user.delete",
  "user.restore",
  "user.reset_password",
  "department.read",
  "department.add",
  "department.update",
  "department.delete",
  "session.read",
  "audit.read",
  "section.read",
  "section.add",
  "section.update",
  "section.delete",
  "category.read",
  "category.add",
  "category.update",
  "category.delete",
  "file.read",
  "file.add",
  "file.update",
  "file.delete",
  "file.restore",
  "file.force_delete",
  "file.access.update",
  "file.version.read",
  "file.version.add",
  "file.version.delete",
  "file.version.restore",
  "file.version.set_current",
  "file.asset.upload",
  "file.asset.delete",
  "file.trash.read",
  "file.download",
  "file.download.restricted",
  "content.read",
  "content.update",
  "stats.read",
  "storage.read"
];

const descriptions = {
  "dashboard.access": {
    en: "Access dashboard",
    ru: "Доступ к панели",
    uz: "Panelga kirish"
  },
  "role.read": {
    en: "View roles",
    ru: "Просмотр ролей",
    uz: "Rollarni ko'rish"
  },
  "role.add": {
    en: "Create roles",
    ru: "Создание ролей",
    uz: "Rollarni yaratish"
  },
  "role.update": {
    en: "Update roles",
    ru: "Изменение ролей",
    uz: "Rollarni yangilash"
  },
  "user.read": {
    en: "View users",
    ru: "Просмотр пользователей",
    uz: "Foydalanuvchilarni ko'rish"
  },
  "user.add": {
    en: "Create users",
    ru: "Создание пользователей",
    uz: "Foydalanuvchilarni yaratish"
  },
  "user.update": {
    en: "Update users",
    ru: "Изменение пользователей",
    uz: "Foydalanuvchilarni yangilash"
  },
  "user.delete": {
    en: "Delete users",
    ru: "Удаление пользователей",
    uz: "Foydalanuvchilarni o'chirish"
  },
  "user.restore": {
    en: "Restore users",
    ru: "Восстановление пользователей",
    uz: "Foydalanuvchilarni tiklash"
  },
  "user.reset_password": {
    en: "Reset user passwords",
    ru: "Сброс паролей пользователей",
    uz: "Foydalanuvchi parollarini tiklash"
  },
  "department.read": {
    en: "View departments",
    ru: "Просмотр отделов",
    uz: "Bo'limlarni ko'rish"
  },
  "department.add": {
    en: "Create departments",
    ru: "Создание отделов",
    uz: "Bo'limlarni yaratish"
  },
  "department.update": {
    en: "Update departments",
    ru: "Изменение отделов",
    uz: "Bo'limlarni yangilash"
  },
  "department.delete": {
    en: "Delete departments",
    ru: "Удаление отделов",
    uz: "Bo'limlarni o'chirish"
  },
  "session.read": {
    en: "View sessions",
    ru: "Просмотр сессий",
    uz: "Sessiyalarni ko'rish"
  },
  "audit.read": {
    en: "View audit log",
    ru: "Просмотр аудита",
    uz: "Auditni ko'rish"
  },
  "section.read": {
    en: "View sections",
    ru: "Просмотр разделов",
    uz: "Bo'limlarni ko'rish"
  },
  "section.add": {
    en: "Create sections",
    ru: "Создание разделов",
    uz: "Bo'limlarni yaratish"
  },
  "section.update": {
    en: "Update sections",
    ru: "Изменение разделов",
    uz: "Bo'limlarni yangilash"
  },
  "section.delete": {
    en: "Delete sections",
    ru: "Удаление разделов",
    uz: "Bo'limlarni o'chirish"
  },
  "category.read": {
    en: "View categories",
    ru: "Просмотр категорий",
    uz: "Kategoriyalarni ko'rish"
  },
  "category.add": {
    en: "Create categories",
    ru: "Создание категорий",
    uz: "Kategoriyalarni yaratish"
  },
  "category.update": {
    en: "Update categories",
    ru: "Изменение категорий",
    uz: "Kategoriyalarni yangilash"
  },
  "category.delete": {
    en: "Delete categories",
    ru: "Удаление категорий",
    uz: "Kategoriyalarni o'chirish"
  },
  "file.read": {
    en: "View files",
    ru: "Просмотр файлов",
    uz: "Fayllarni ko'rish"
  },
  "file.add": {
    en: "Create files",
    ru: "Создание файлов",
    uz: "Fayllarni yaratish"
  },
  "file.update": {
    en: "Update files",
    ru: "Изменение файлов",
    uz: "Fayllarni yangilash"
  },
  "file.delete": {
    en: "Delete files",
    ru: "Удаление файлов",
    uz: "Fayllarni o'chirish"
  },
  "file.restore": {
    en: "Restore files",
    ru: "Восстановление файлов",
    uz: "Fayllarni tiklash"
  },
  "file.force_delete": {
    en: "Delete files permanently",
    ru: "Безвозвратное удаление файлов",
    uz: "Fayllarni butunlay o'chirish"
  },
  "file.access.update": {
    en: "Update file access",
    ru: "Изменение доступа к файлам",
    uz: "Fayl kirishini yangilash"
  },
  "file.version.read": {
    en: "View file versions",
    ru: "Просмотр версий файлов",
    uz: "Fayl versiyalarini ko'rish"
  },
  "file.version.add": {
    en: "Create file versions",
    ru: "Создание версий файлов",
    uz: "Fayl versiyalarini yaratish"
  },
  "file.version.delete": {
    en: "Delete file versions",
    ru: "Удаление версий файлов",
    uz: "Fayl versiyalarini o'chirish"
  },
  "file.version.restore": {
    en: "Restore file versions",
    ru: "Восстановление версий файлов",
    uz: "Fayl versiyalarini tiklash"
  },
  "file.version.set_current": {
    en: "Set current file version",
    ru: "Сделать текущей версией файла",
    uz: "Joriy fayl versiyasini belgilash"
  },
  "file.asset.upload": {
    en: "Upload file assets",
    ru: "Загрузка ассетов файлов",
    uz: "Fayl assetlarini yuklash"
  },
  "file.asset.delete": {
    en: "Delete file assets",
    ru: "Удаление ассетов файлов",
    uz: "Fayl assetlarini o'chirish"
  },
  "file.trash.read": {
    en: "View trash",
    ru: "Просмотр корзины",
    uz: "Savatchani ko'rish"
  },
  "file.download": {
    en: "Download files",
    ru: "Скачивание файлов",
    uz: "Fayllarni yuklab olish"
  },
  "file.download.restricted": {
    en: "Download restricted files",
    ru: "Скачивание ограниченных файлов",
    uz: "Cheklangan fayllarni yuklab olish"
  },
  "content.read": {
    en: "View content pages",
    ru: "Просмотр контента",
    uz: "Kontentni ko'rish"
  },
  "content.update": {
    en: "Update content pages",
    ru: "Изменение контента",
    uz: "Kontentni yangilash"
  },
  "stats.read": {
    en: "View statistics",
    ru: "Просмотр статистики",
    uz: "Statistikani ko'rish"
  },
  "storage.read": {
    en: "View storage usage",
    ru: "Просмотр хранилища",
    uz: "Xotira ishlatilishini ko'rish"
  }
};

exports.seed = async function (knex) {
  await knex("role_permissions").del();
  await knex("permissions").del();
  await knex("permissions").insert(
    permissions.map((name) => {
      const meta = descriptions[name] || {};
      return {
        name,
        description_en: meta.en || null,
        description_ru: meta.ru || null,
        description_uz: meta.uz || null
      };
    })
  );
};
