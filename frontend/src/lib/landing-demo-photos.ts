/**
 * Локальные фото лендинга (лежат в `frontend/public/landing/`).
 * Hero: обработанный кадр витрины с оправами (~4:3, 1400px по ширине).
 */
export const landingDemoPhotos = {
  hero: {
    src: "/landing/hero-optic-display.png",
    alt: "Витрина с оправами в салоне оптики",
  },
  /** Фасад «Центр оптики» в блоке онлайн-записи */
  bookingStorefront: {
    src: "/landing/booking-storefront.png",
    alt: "Салон «Центр оптики» — вход и витрина",
  },
} as const;
