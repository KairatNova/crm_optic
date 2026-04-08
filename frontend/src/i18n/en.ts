export const en = {
  brand: "Optic Center",
  city: "Bishkek",
  nav: {
    about: "About",
    services: "Services",
    booking: "Book",
    crm: "Login",
  },
  phone: "+996 706 90 59 04",
  hero: {
    badge: "Optics at Asia Mall",
    title1: "Perfect vision.",
    title2: "Flawless style.",
    subtitle:
      "Professional eye exam, glasses selection, and care for your eyes. Book a visit online in just a couple of minutes.",
    ctaBooking: "Book now",
    ctaServices: "Services",
    pills: ["Quick check", "Frames fitting", "Contact lenses"],
    stats: [
      { k: "Time", v: "~15 min" },
      { k: "Warranty", v: "for frames" },
      { k: "Fit", v: "by face shape" },
    ],
  },
  highlights: {
    title: "Why clients choose us",
    items: [
      {
        title: "Experienced specialists",
        text: "We match frames and lenses based on prescription, style, and daily routine.",
      },
      {
        title: "On-site eye exam",
        text: "Diagnosis and consultation in one place, without extra visits and queues.",
      },
      {
        title: "Service & support",
        text: "Frame adjustment, minor repairs, and help after purchase.",
      },
    ],
  },
  services: {
    title: "Services",
    subtitle: "Pick a service — we'll tell what's included and help you book.",
    items: [
      {
        title: "Eye exam",
        text: "Visual acuity check, lens selection, recommendations. ~15–25 minutes.",
      },
      {
        title: "Frames & lenses fitting",
        text: "We'll match frames to your face and lenses to your prescription, lifestyle, and budget.",
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
    subtitle: "Leave a request — we'll call back to confirm the time.",
    badges: ["Phone confirmation", "Every day 10:00–22:00"],
    form: {
      name: "Name",
      phone: "Phone",
      service: "Service",
      date: "Date",
      time: "Time",
      comment: "Comment",
      submit: "Book now",
      consent: "By clicking «Book now», you consent to personal data processing.",
      serviceOptions: ["Eye exam", "Frames & lenses fitting", "Contact lenses", "Service & repair"],
      placeholders: {
        name: "Ivan",
        phone: "+996 ___ ___ ___",
        comment: "Example: need contact lenses fitting, have a prescription",
      },
    },
  },
  contact: {
    title: "Contacts and hours",
    address: "Asia Mall, -1 floor, Chyngyz Aitmatov Ave 3, Bishkek, 720044",
    hours: "Every day: 10:00–22:00",
    ctaPhone: "Call us",
    ctaRoute: "Get directions",
    ctaInstagram: "Instagram",
    ctaWhatsapp: "WhatsApp",
    instagramUrl: "https://www.instagram.com/center_optics.kg",
    whatsappUrl:
      "https://api.whatsapp.com/send/?phone=996706905904&text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5%21+%D0%9F%D0%B8%D1%88%D1%83+%D1%81+%D1%81%D0%B0%D0%B9%D1%82%D0%B0.&type=phone_number&app_absent=0",
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
