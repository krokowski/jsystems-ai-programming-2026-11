import type { Category, CaseType } from "../schemas/enums";

const categoryLabels: Record<Category, string> = {
  smartphone: "Smartfon",
  laptop: "Laptop",
  tablet: "Tablet",
  desktop: "Komputer stacjonarny",
  monitor: "Monitor",
  tv: "Telewizor",
  audio: "Słuchawki / Audio",
  wearable: "Smartwatch / Urządzenie noszone",
  other: "Inne",
};

const caseTypeLabels: Record<CaseType, string> = {
  return: "Zwrot",
  complaint: "Reklamacja",
};

export const form = {
  caseTypeLegend: "Rodzaj zgłoszenia",
  caseTypeLabels,
  caseTypeDescriptions: {
    return: "Oddaj produkt bez podania przyczyny w ciągu 14 dni od zakupu.",
    complaint: "Zgłoś wadę lub usterkę produktu.",
  } satisfies Record<CaseType, string>,
  categoryLabel: "Kategoria sprzętu",
  categoryPlaceholder: "Wybierz kategorię",
  categoryLabels,
  productNameLabel: "Nazwa produktu / model",
  productNamePlaceholder: "np. Galaxy S24, ThinkPad X1",
  purchaseDateLabel: "Data zakupu",
  purchaseDatePlaceholder: "Wybierz datę",
  previousMonth: "Poprzedni miesiąc",
  nextMonth: "Następny miesiąc",
  reasonLabel: "Powód",
  reasonRequired: "(wymagane)",
  reasonOptional: "(opcjonalne)",
  reasonHelper: {
    return: "Dlaczego zwracasz produkt?",
    complaint: "Opisz usterkę: co nie działa i od kiedy",
  } satisfies Record<CaseType, string>,
  reasonCounter: (n: number): string => `${n} / 2000`,
  photoLabel: "Zdjęcie produktu",
  photoButton: "Wybierz plik",
  photoLimits: "JPEG, PNG lub WebP, maks. 10 MB",
  photoHelper: {
    return: "Pokaż produkt w całości, bez śladów użytkowania",
    complaint: "Pokaż uszkodzenie wyraźnie i z bliska",
  } satisfies Record<CaseType, string>,
  photoRemove: "Usuń",
  submit: "Wyślij zgłoszenie",
  errors: {
    caseTypeRequired: "Wybierz rodzaj zgłoszenia.",
    categoryRequired: "Wybierz kategorię sprzętu.",
    productNameLength: "Nazwa produktu musi mieć od 2 do 100 znaków.",
    purchaseDateRequired: "Wybierz datę zakupu.",
    purchaseDateFuture: "Data zakupu nie może być z przyszłości",
    purchaseDateInvalid: "Podaj prawidłową datę zakupu.",
    reasonTooShort: "Opis usterki musi mieć co najmniej 10 znaków.",
    reasonTooLong: "Powód może mieć najwyżej 2000 znaków.",
    photoRequired: "Dodaj zdjęcie produktu.",
    photoFormat: "Dozwolone formaty: JPEG, PNG, WebP",
    photoTooLarge: "Plik przekracza limit 10 MB",
  },
} as const;
