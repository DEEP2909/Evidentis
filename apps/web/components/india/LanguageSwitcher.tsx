"use client";

import { Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "@evidentis/shared";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const selectedLanguage = SUPPORTED_LANGUAGES.some((language) => language.code === i18n.language)
    ? i18n.language
    : "en";

  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85">
      <Globe2 className="h-4 w-4" />
      <select
        aria-label="language-switcher"
        className="bg-transparent outline-none"
        value={selectedLanguage}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <option key={language.code} value={language.code} className="text-slate-900">
            {language.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
