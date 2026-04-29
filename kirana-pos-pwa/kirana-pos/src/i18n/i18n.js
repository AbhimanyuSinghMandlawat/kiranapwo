import { translations, LANGUAGES } from "./translations";

let currentLang = localStorage.getItem("pos_lang") || LANGUAGES.EN;

export function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("pos_lang", lang);
  window.dispatchEvent(new Event("languageChanged"));
}

export function getLanguage() {
  return currentLang;
}

export function t(path) {
  const keys = path.split(".");
  let value = translations[currentLang];

  for (const k of keys) {
    value = value?.[k];
    if (!value) return path;
  }

  return value;
}
