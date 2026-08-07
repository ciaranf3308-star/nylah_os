export type EventKindId = "date"|"travel"|"sports"|"music"|"appointment"|"birthday"|"reminder"|"family"|"friends"|"home"|"other";

export type EventKindDef = {
  id: EventKindId;
  label: string;
  light: { bg: string; fg: string; chipBg?: string };
  dark: { bg: string; fg: string; chipBg?: string };
  // icon color alias = fg
};

export const EVENT_KINDS: Record<EventKindId, EventKindDef> = {
  date: {
    id: "date",
    label: "Date",
    light: { bg: "#FFE8E0", fg: "#B85C3E", chipBg: "#FFF1EC" },
    dark: { bg: "#3A2A22", fg: "#F0A88E", chipBg: "#3D2C23" },
  },
  travel: {
    id: "travel",
    label: "Travel",
    light: { bg: "#D9E8E1", fg: "#4E7367", chipBg: "#E6F0EC" },
    dark: { bg: "#253530", fg: "#9BBEB0", chipBg: "#2D3E38" },
  },
  sports: {
    id: "sports",
    label: "Sports",
    light: { bg: "#FBE0D0", fg: "#C06A32", chipBg: "#FFF0E6" },
    dark: { bg: "#4A2E22", fg: "#F0A87A", chipBg: "#4D3224" },
  },
  music: {
    id: "music",
    label: "Music",
    light: { bg: "#EDE6F5", fg: "#7869A8", chipBg: "#F3EFFE" },
    dark: { bg: "#342E46", fg: "#C9BFD9", chipBg: "#3A3450" },
  },
  appointment: {
    id: "appointment",
    label: "Appointment",
    light: { bg: "#DCE2E9", fg: "#5C6A80", chipBg: "#EAF0F6" },
    dark: { bg: "#2B333F", fg: "#A8B5C8", chipBg: "#323D4E" },
  },
  birthday: {
    id: "birthday",
    label: "Birthday",
    light: { bg: "#FCE8E2", fg: "#C87A6A", chipBg: "#FFF2EF" },
    dark: { bg: "#4A2E2A", fg: "#F2B8A8", chipBg: "#4E332E" },
  },
  reminder: {
    id: "reminder",
    label: "Reminder",
    light: { bg: "#FEF3C7", fg: "#9A7A2E", chipBg: "#FFF8E2" },
    dark: { bg: "#44381F", fg: "#FCD470", chipBg: "#4D3E22" },
  },
  family: {
    id: "family",
    label: "Family",
    light: { bg: "#F2E9DC", fg: "#8D7360", chipBg: "#FAF3EB" },
    dark: { bg: "#3F362E", fg: "#D8C4A8", chipBg: "#463E35" },
  },
  friends: {
    id: "friends",
    label: "Friends",
    light: { bg: "#D8E5DF", fg: "#5A7367", chipBg: "#E7F0EA" },
    dark: { bg: "#2F3E38", fg: "#AFC4B8", chipBg: "#34443D" },
  },
  home: {
    id: "home",
    label: "Home",
    light: { bg: "#F2F0EC", fg: "#8A7E72", chipBg: "#FAF8F6" },
    dark: { bg: "#2C2A28", fg: "#C4B8A8", chipBg: "#32302E" },
  },
  other: {
    id: "other",
    label: "Other",
    light: { bg: "#F0EEE9", fg: "#8A8074", chipBg: "#FAF9F6" },
    dark: { bg: "#2A2A2A", fg: "#B8B0A6", chipBg: "#303030" },
  },
};

export const EVENT_KIND_LIST: EventKindDef[] = [
  EVENT_KINDS.date,
  EVENT_KINDS.travel,
  EVENT_KINDS.sports,
  EVENT_KINDS.music,
  EVENT_KINDS.appointment,
  EVENT_KINDS.birthday,
  EVENT_KINDS.reminder,
  EVENT_KINDS.family,
  EVENT_KINDS.friends,
  EVENT_KINDS.home,
];

export function inferKindFromTitle(title?: string, fallback: EventKindId = "other"): EventKindId {
  if (!title) return fallback;
  const t = title.toLowerCase().trim();
  // explicit exact mapping first - solves galgorm/united/brunch colliding with travel/sports generic
  if (/galgorm/.test(t)) return "family";
  if (/brunch/.test(t)) return "friends";
  if (/united/.test(t)) return "sports";
  if (/golf|match|game|training|run|gym|hurl|cup|final|premiere|football|soccer|sport|gaa|hike|cycle/.test(t)) return "sports";
  if (/flight|travel|trip|holiday|airport|hotel|away|cyprus|weekend|cottage/.test(t)) return "travel";
  if (/concert|gig|album|music|playlist|spotify|song|band/.test(t)) return "music";
  if (/birthday|bday|cake/.test(t)) return "birthday";
  if (/doctor|dentist|appointment|meeting|call|interview/.test(t)) return "appointment";
  if (/reminder|remind|alarm|bill|due|pay/.test(t)) return "reminder";
  if (/family|mum|dad|parents|sister|brother|anniversary/.test(t)) return "family";
  if (/friends|milo|mia|drinks|pub|crew/.test(t)) return "friends";
  if (/home|house|repair|garden|bins|chore|paint/.test(t)) return "home";
  if (/love|date night|romantic/.test(t)) return "date";
  if (/(date|dinner|heart|love|with you)/.test(t) && !/(update|day)/.test(t)) {
    if (t.includes("date")) return "date";
  }
  return fallback;
}

export function getKindDef(kind?: string): EventKindDef {
  if (!kind) return EVENT_KINDS.other;
  const k = kind.toLowerCase() as EventKindId;
  return (EVENT_KINDS as any)[k] || EVENT_KINDS.other;
}

export function resolveTheme(darkMode: boolean, def: EventKindDef) {
  return darkMode ? def.dark : def.light;
}
