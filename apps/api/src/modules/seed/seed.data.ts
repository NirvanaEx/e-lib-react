import { Lang } from "../../common/utils/lang";

export type SeedTitles = Record<Lang, string>;

export type PresetSection = {
  key: string;
  icon: string;
  iconColor: string;
  titles: SeedTitles;
};

export type PresetCategory = {
  key: string;
  sectionKey: string;
  icon: string;
  iconColor: string;
  titles: SeedTitles;
};

export type DemoDepartment = {
  name: string;
  children?: string[];
};

export type DemoDocument = {
  key: string;
  sectionKey: string;
  categoryKey: string | null;
  accessType: "public" | "department_closed" | "restricted";
  departmentName?: string;
  assetLangs: Lang[];
  titles: SeedTitles;
  descriptions?: Partial<SeedTitles>;
};

export const PRESET_SECTIONS: PresetSection[] = [
  {
    key: "npa",
    icon: "gavel",
    iconColor: "#dc2626",
    titles: {
      ru: "Нормативно-правовые акты",
      en: "Regulatory legal acts",
      uz: "Normativ-huquqiy hujjatlar"
    }
  },
  {
    key: "icao",
    icon: "public",
    iconColor: "#2563eb",
    titles: {
      ru: "Международные стандарты ICAO",
      en: "ICAO international standards",
      uz: "ICAO xalqaro standartlari"
    }
  },
  {
    key: "manuals",
    icon: "menu-book",
    iconColor: "#7c3aed",
    titles: {
      ru: "Руководства и инструкции",
      en: "Manuals and instructions",
      uz: "Qo'llanmalar va yo'riqnomalar"
    }
  },
  {
    key: "orders",
    icon: "assignment",
    iconColor: "#ea580c",
    titles: {
      ru: "Приказы и распоряжения",
      en: "Orders and directives",
      uz: "Buyruqlar va farmoyishlar"
    }
  },
  {
    key: "safety",
    icon: "health-and-safety",
    iconColor: "#16a34a",
    titles: {
      ru: "Безопасность полётов",
      en: "Flight safety",
      uz: "Parvozlar xavfsizligi"
    }
  },
  {
    key: "aeronav",
    icon: "flight",
    iconColor: "#0ea5e9",
    titles: {
      ru: "Аэронавигационная информация",
      en: "Aeronautical information",
      uz: "Aeronavigatsiya axboroti"
    }
  },
  {
    key: "tech",
    icon: "engineering",
    iconColor: "#64748b",
    titles: {
      ru: "Техническая документация",
      en: "Technical documentation",
      uz: "Texnik hujjatlar"
    }
  },
  {
    key: "training",
    icon: "school",
    iconColor: "#d97706",
    titles: {
      ru: "Обучение и подготовка",
      en: "Training and development",
      uz: "O'qitish va tayyorlash"
    }
  }
];

export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    key: "laws",
    sectionKey: "npa",
    icon: "balance",
    iconColor: "#4f46e5",
    titles: { ru: "Законы", en: "Laws", uz: "Qonunlar" }
  },
  {
    key: "regulations",
    sectionKey: "npa",
    icon: "rule",
    iconColor: "#0d9488",
    titles: {
      ru: "Авиационные правила",
      en: "Aviation regulations",
      uz: "Aviatsiya qoidalari"
    }
  },
  {
    key: "resolutions",
    sectionKey: "npa",
    icon: "account-balance",
    iconColor: "#a21caf",
    titles: {
      ru: "Постановления",
      en: "Government resolutions",
      uz: "Hukumat qarorlari"
    }
  },
  {
    key: "annexes",
    sectionKey: "icao",
    icon: "collections-bookmark",
    iconColor: "#2563eb",
    titles: { ru: "Приложения ICAO", en: "ICAO Annexes", uz: "ICAO ilovalari" }
  },
  {
    key: "docs",
    sectionKey: "icao",
    icon: "article",
    iconColor: "#06b6d4",
    titles: {
      ru: "Документы серии Doc",
      en: "Doc series documents",
      uz: "Doc seriyasidagi hujjatlar"
    }
  },
  {
    key: "ops",
    sectionKey: "manuals",
    icon: "auto-stories",
    iconColor: "#7c3aed",
    titles: {
      ru: "Эксплуатационные руководства",
      en: "Operations manuals",
      uz: "Ekspluatatsiya qo'llanmalari"
    }
  },
  {
    key: "job",
    sectionKey: "manuals",
    icon: "badge",
    iconColor: "#db2777",
    titles: {
      ru: "Должностные инструкции",
      en: "Job descriptions",
      uz: "Lavozim yo'riqnomalari"
    }
  },
  {
    key: "agency",
    sectionKey: "orders",
    icon: "assignment-turned-in",
    iconColor: "#ea580c",
    titles: {
      ru: "Приказы предприятия",
      en: "Enterprise orders",
      uz: "Korxona buyruqlari"
    }
  },
  {
    key: "sms",
    sectionKey: "safety",
    icon: "gpp-good",
    iconColor: "#16a34a",
    titles: {
      ru: "Система управления безопасностью",
      en: "Safety management system",
      uz: "Xavfsizlikni boshqarish tizimi"
    }
  },
  {
    key: "incidents",
    sectionKey: "safety",
    icon: "report",
    iconColor: "#dc2626",
    titles: {
      ru: "Расследование авиационных событий",
      en: "Occurrence investigation",
      uz: "Aviatsiya hodisalarini tekshirish"
    }
  },
  {
    key: "aip",
    sectionKey: "aeronav",
    icon: "map",
    iconColor: "#0ea5e9",
    titles: {
      ru: "Сборник AIP",
      en: "AIP publication",
      uz: "AIP to'plami"
    }
  },
  {
    key: "notam",
    sectionKey: "aeronav",
    icon: "campaign",
    iconColor: "#eab308",
    titles: { ru: "NOTAM", en: "NOTAM", uz: "NOTAM" }
  },
  {
    key: "equipment",
    sectionKey: "tech",
    icon: "settings-input-antenna",
    iconColor: "#64748b",
    titles: {
      ru: "Радиотехническое оборудование",
      en: "Radio equipment",
      uz: "Radiotexnik uskunalar"
    }
  },
  {
    key: "programs",
    sectionKey: "training",
    icon: "checklist",
    iconColor: "#d97706",
    titles: {
      ru: "Программы подготовки",
      en: "Training programs",
      uz: "Tayyorlash dasturlari"
    }
  }
];

export const DEMO_DEPARTMENTS: DemoDepartment[] = [
  {
    name: "Администрация",
    children: ["Отдел кадров", "Юридический отдел", "Бухгалтерия"]
  },
  {
    name: "Служба организации воздушного движения",
    children: [
      "Центр управления воздушным движением",
      "Служба аэронавигационной информации"
    ]
  },
  {
    name: "Инженерно-техническая служба",
    children: ["Отдел радиотехнического обеспечения", "Отдел информационных технологий"]
  },
  { name: "Служба безопасности полётов" }
];

export const DEMO_DOCUMENTS: DemoDocument[] = [
  {
    key: "annex-11",
    sectionKey: "icao",
    categoryKey: "annexes",
    accessType: "public",
    assetLangs: ["ru", "en"],
    titles: {
      ru: "Приложение 11. Обслуживание воздушного движения",
      en: "Annex 11 — Air Traffic Services",
      uz: "11-ilova — Havo harakatiga xizmat ko'rsatish"
    },
    descriptions: {
      ru: "Международные стандарты и рекомендуемая практика ICAO по обслуживанию воздушного движения.",
      en: "ICAO international standards and recommended practices for air traffic services.",
      uz: "Havo harakatiga xizmat ko'rsatish bo'yicha ICAO xalqaro standartlari va tavsiya etilgan amaliyoti."
    }
  },
  {
    key: "doc-4444",
    sectionKey: "icao",
    categoryKey: "docs",
    accessType: "public",
    assetLangs: ["ru", "en"],
    titles: {
      ru: "Doc 4444. Организация воздушного движения (PANS-ATM)",
      en: "Doc 4444 — Air Traffic Management (PANS-ATM)",
      uz: "Doc 4444 — Havo harakatini tashkil etish (PANS-ATM)"
    },
    descriptions: {
      ru: "Правила аэронавигационного обслуживания: организация воздушного движения.",
      en: "Procedures for air navigation services: air traffic management.",
      uz: "Aeronavigatsiya xizmatlari qoidalari: havo harakatini tashkil etish."
    }
  },
  {
    key: "air-code",
    sectionKey: "npa",
    categoryKey: "laws",
    accessType: "public",
    assetLangs: ["ru", "uz"],
    titles: {
      ru: "Воздушный кодекс Республики Узбекистан",
      en: "Air Code of the Republic of Uzbekistan",
      uz: "O'zbekiston Respublikasining Havo kodeksi"
    },
    descriptions: {
      ru: "Основной закон, регулирующий использование воздушного пространства и деятельность авиации.",
      en: "The principal law governing the use of airspace and aviation activities.",
      uz: "Havo hududidan foydalanish va aviatsiya faoliyatini tartibga soluvchi asosiy qonun."
    }
  },
  {
    key: "avia-rules-91",
    sectionKey: "npa",
    categoryKey: "regulations",
    accessType: "public",
    assetLangs: ["ru"],
    titles: {
      ru: "Авиационные правила. Часть 91 — Производство полётов",
      en: "Aviation Regulations Part 91 — Flight Operations",
      uz: "Aviatsiya qoidalari 91-qism — Parvozlarni bajarish"
    },
    descriptions: {
      ru: "Общие правила производства полётов гражданской авиации.",
      en: "General flight operation rules for civil aviation.",
      uz: "Fuqaro aviatsiyasida parvozlarni bajarishning umumiy qoidalari."
    }
  },
  {
    key: "ops-manual",
    sectionKey: "manuals",
    categoryKey: "ops",
    accessType: "public",
    assetLangs: ["ru", "en", "uz"],
    titles: {
      ru: "Руководство по производству полётов",
      en: "Flight Operations Manual",
      uz: "Parvozlarni bajarish bo'yicha qo'llanma"
    },
    descriptions: {
      ru: "Руководство, определяющее порядок организации и выполнения полётов.",
      en: "Manual defining how flights are organised and performed.",
      uz: "Parvozlarni tashkil etish va bajarish tartibini belgilovchi qo'llanma."
    }
  },
  {
    key: "atc-job-desc",
    sectionKey: "manuals",
    categoryKey: "job",
    accessType: "department_closed",
    departmentName: "Служба организации воздушного движения",
    assetLangs: ["ru"],
    titles: {
      ru: "Должностная инструкция диспетчера УВД",
      en: "ATC controller job description",
      uz: "HHB dispetcherining lavozim yo'riqnomasi"
    },
    descriptions: {
      ru: "Права, обязанности и ответственность диспетчера управления воздушным движением.",
      en: "Rights, duties and responsibilities of an air traffic controller.",
      uz: "Havo harakatini boshqarish dispetcherining huquq va majburiyatlari."
    }
  },
  {
    key: "order-142",
    sectionKey: "orders",
    categoryKey: "agency",
    accessType: "department_closed",
    departmentName: "Администрация",
    assetLangs: ["ru", "uz"],
    titles: {
      ru: "Приказ №142 «О введении зимнего расписания»",
      en: "Order No. 142 “On the winter schedule”",
      uz: "142-son buyruq «Qishki jadvalni joriy etish to'g'risida»"
    },
    descriptions: {
      ru: "О переходе на зимнее расписание работы смен.",
      en: "On the transition to the winter shift schedule.",
      uz: "Smenalarning qishki ish jadvaliga o'tishi to'g'risida."
    }
  },
  {
    key: "sms-manual",
    sectionKey: "safety",
    categoryKey: "sms",
    accessType: "public",
    assetLangs: ["ru", "en"],
    titles: {
      ru: "Руководство по системе управления безопасностью полётов",
      en: "Safety Management System Manual",
      uz: "Parvozlar xavfsizligini boshqarish tizimi qo'llanmasi"
    },
    descriptions: {
      ru: "Политика, процедуры и процессы системы управления безопасностью полётов.",
      en: "Policy, procedures and processes of the safety management system.",
      uz: "Parvozlar xavfsizligini boshqarish tizimining siyosati va jarayonlari."
    }
  },
  {
    key: "incident-report",
    sectionKey: "safety",
    categoryKey: "incidents",
    accessType: "restricted",
    departmentName: "Служба безопасности полётов",
    assetLangs: ["ru"],
    titles: {
      ru: "Отчёт о расследовании инцидента И-2026/03",
      en: "Incident investigation report I-2026/03",
      uz: "I-2026/03 hodisani tekshirish hisoboti"
    },
    descriptions: {
      ru: "Материалы расследования авиационного инцидента И-2026/03.",
      en: "Investigation materials for aviation incident I-2026/03.",
      uz: "I-2026/03 aviatsiya hodisasini tekshirish materiallari."
    }
  },
  {
    key: "aip",
    sectionKey: "aeronav",
    categoryKey: "aip",
    accessType: "public",
    assetLangs: ["ru", "en", "uz"],
    titles: {
      ru: "Сборник аэронавигационной информации (AIP)",
      en: "Aeronautical Information Publication (AIP)",
      uz: "Aeronavigatsiya axboroti to'plami (AIP)"
    },
    descriptions: {
      ru: "Официальный сборник аэронавигационной информации Республики Узбекистан.",
      en: "Official aeronautical information publication of the Republic of Uzbekistan.",
      uz: "O'zbekiston Respublikasining rasmiy aeronavigatsiya axboroti to'plami."
    }
  },
  {
    key: "radar-maintenance",
    sectionKey: "tech",
    categoryKey: "equipment",
    accessType: "public",
    assetLangs: ["ru"],
    titles: {
      ru: "Регламент технического обслуживания радиолокационной станции",
      en: "Radar station maintenance regulations",
      uz: "Radiolokatsiya stansiyasiga texnik xizmat ko'rsatish reglamenti"
    },
    descriptions: {
      ru: "Периодичность и порядок технического обслуживания РЛС.",
      en: "Frequency and procedure of radar station maintenance.",
      uz: "RLSga texnik xizmat ko'rsatish davriyligi va tartibi."
    }
  },
  {
    key: "training-program",
    sectionKey: "training",
    categoryKey: "programs",
    accessType: "public",
    assetLangs: ["ru", "uz"],
    titles: {
      ru: "Программа переподготовки диспетчеров УВД",
      en: "ATC controller refresher training program",
      uz: "HHB dispetcherlarini qayta tayyorlash dasturi"
    },
    descriptions: {
      ru: "Учебная программа периодической переподготовки диспетчерского состава.",
      en: "Curriculum for periodic refresher training of controllers.",
      uz: "Dispetcherlarni davriy qayta tayyorlash o'quv dasturi."
    }
  }
];
