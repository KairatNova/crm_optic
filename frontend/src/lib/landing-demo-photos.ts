/**
 * Временные демо-фото для лендинга (Unsplash License — замените на свои для продакшена).
 * https://unsplash.com/license
 *
 * Источники (для замены): UsALNdok2m4, 1511499767150, e8TtkC5xyv4, w7ZyuGYNpRQ, 4hH8MJBQYYE.
 */
export const landingDemoPhotos = {
  hero: {
    src: "https://images.unsplash.com/photo-1486250944723-86bca2b15b06?w=1400&q=85&auto=format&fit=crop",
    alt: "Витрина с оправами в оптике",
  },
  /** По одному на карточку «Популярные оправы» (циклим, если карточек больше). */
  popular: [
    {
      src: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&q=85&auto=format&fit=crop",
      alt: "Солнцезащитные очки",
    },
    {
      src: "https://images.unsplash.com/photo-1556306510-31ca015374b0?w=600&q=85&auto=format&fit=crop",
      alt: "Очки в чёрной оправе",
    },
    {
      src: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=600&q=85&auto=format&fit=crop",
      alt: "Очки на рабочем столе",
    },
    {
      src: "https://images.unsplash.com/photo-1487081968683-2a6664e725ce?w=600&q=85&auto=format&fit=crop",
      alt: "Очки и книга",
    },
  ],
} as const;
