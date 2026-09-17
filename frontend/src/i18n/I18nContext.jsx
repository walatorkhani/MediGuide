import { createContext, useContext, useEffect, useState } from "react";
import { LANGUAGES, TRANSLATIONS } from "./translations";

const I18nContext = createContext(null);

const DEFAULT_LANG = "fr";

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const stored = localStorage.getItem("lang");
    return LANGUAGES.some((l) => l.code === stored) ? stored : DEFAULT_LANG;
  });

  useEffect(() => {
    const meta = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
    document.documentElement.lang = meta.code;
    document.documentElement.dir = meta.dir;
    localStorage.setItem("lang", meta.code);
  }, [lang]);

  const t = (key) => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS[DEFAULT_LANG][key] ?? key;

  return (
    <I18nContext.Provider value={{ lang, setLang, t, languages: LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n doit être utilisé à l'intérieur d'un I18nProvider.");
  }
  return context;
}
