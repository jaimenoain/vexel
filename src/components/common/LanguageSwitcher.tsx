'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex items-center gap-2 text-xs font-medium text-[#666666]">
      {languages.map((lang, index) => (
        <React.Fragment key={lang.code}>
          <button
            onClick={() => i18n.changeLanguage(lang.code)}
            className={clsx(
              "hover:text-[#111111] transition-colors cursor-pointer",
              i18n.resolvedLanguage === lang.code ? "text-[#111111] font-bold" : ""
            )}
          >
            {lang.label}
          </button>
          {index < languages.length - 1 && <span className="select-none">|</span>}
        </React.Fragment>
      ))}
    </div>
  );
}
