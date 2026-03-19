export const en = {
  brand: "Optic Center",
  city: "Yessentuki",
  nav: {
    about: "About",
    services: "Services",
    shop: "Store",
    booking: "Book",
    crm: "Login",
  },
  phone: "+996 000 123 456",
  hero: {
    title1: "Perfect vision.",
    title2: "Flawless style.",
    subtitle:
      "Professional eye exam, glasses selection, and care for your eyes. Book a visit online in just a couple of minutes.",
    ctaCatalog: "Browse frames",
    ctaBooking: "Book an eye exam",
    pills: ["Quick check", "Frames fitting", "Contact lenses"],
    stats: [
      { k: "Time", v: "~15 min" },
      { k: "Warranty", v: "for frames" },
      { k: "Fit", v: "by face shape" },
    ],
    note: "Placeholder image. Replace with a real photo of the shop/specialist.",
  },
  popular: {
    title: "Popular frames",
    subtitle: "Fit by face shape, style, and prescription. Prices/models are examples.",
    items: [
      { name: "Neon Optika", price: "3,790 ₽" },
      { name: "Bantachita", price: "3,790 ₽" },
      { name: "Gorten Frames", price: "3,780 ₽" },
      { name: "Katon", price: "2,280 ₽" },
    ],
  },
  services: {
    title: "Services",
    subtitle: "Pick a service — we’ll tell what’s included and help you book.",
    items: [
      {
        title: "Eye exam",
        text: "Visual acuity check, lens selection, recommendations. ~15–25 minutes.",
      },
      {
        title: "Frames & lenses fitting",
        text: "We’ll match frames to your face and lenses to your prescription, lifestyle, and budget.",
      },
      {
        title: "Contact lenses",
        text: "Soft lenses fitting, training, and care instructions.",
      },
      {
        title: "Service & repair",
        text: "Adjustment, nose pads replacement, minor repairs. Ask by phone.",
      },
    ],
  },
  booking: {
    title: "Online booking",
    subtitle: "Next step: connect this form to the booking API.",
    badges: ["Phone confirmation", "Status: new"],
    form: {
      name: "Name",
      phone: "Phone",
      service: "Service",
      date: "Date",
      time: "Time",
      comment: "Comment",
      submit: "Book now",
      consent: "By clicking “Book now”, you consent to personal data processing.",
      serviceOptions: ["Eye exam", "Frames & lenses fitting", "Contact lenses", "Service & repair"],
      placeholders: {
        name: "Ivan",
        phone: "+7 (___) ___‑__‑__",
        comment: "Example: need contact lenses fitting, have a prescription",
      },
    },
  },
  mobile: {
    stickyCta: "Book",
    menu: "Menu",
  },
  lang: {
    label: "Language",
    ru: "Русский",
    ky: "Кыргызча",
    en: "English",
  },
} as const;

