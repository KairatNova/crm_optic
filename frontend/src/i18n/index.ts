import { en } from "./en";
import { ky } from "./ky";
import { ru } from "./ru";
import type { Locale } from "./locales";

export type Dictionary = typeof ru;

export function getDictionary(locale: Locale): Dictionary {
  switch (locale) {
    case "ru":
      return ru;
    case "ky":
      return ky as unknown as Dictionary;
    case "en":
      return en as unknown as Dictionary;
  }
}

