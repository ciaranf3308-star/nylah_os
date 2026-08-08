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
    light: { bg: "#FFE6DC", fg: "#C35A3A", chipBg: "#FFF1EB" },
    dark: { bg: "#3A2620", fg: "#F2A896", chipBg: "#412D26" },
  },
  travel: {
    id: "travel",
    label: "Travel",
    light: { bg: "#DCEEE3", fg: "#4A7262", chipBg: "#EBF5EE" },
    dark: { bg: "#25382F", fg: "#A7CBBB", chipBg: "#2E443A" },
  },
  sports: {
    id: "sports",
    label: "Sports",
    light: { bg: "#FFE2C8", fg: "#B86528", chipBg: "#FFF2E6" },
    dark: { bg: "#4A2F20", fg: "#F2B07E", chipBg: "#523622" },
  },
  music: {
    id: "music",
    label: "Music",
    light: { bg: "#EBE4F4", fg: "#7B6AA3", chipBg: "#F4F0FE" },
    dark: { bg: "#352E46", fg: "#CFC3E6", chipBg: "#3E3653" },
  },
  appointment: {
    id: "appointment",
    label: "Appointment",
    light: { bg: "#E2E9F0", fg: "#5B6E86", chipBg: "#EEF3F9" },
    dark: { bg: "#2A3340", fg: "#A9BED5", chipBg: "#324055" },
  },
  birthday: {
    id: "birthday",
    label: "Birthday",
    light: { bg: "#FFEAE4", fg: "#BA6C58", chipBg: "#FFF4F0" },
    dark: { bg: "#4B2F2A", fg: "#F5B9A7", chipBg: "#54362F" },
  },
  reminder: {
    id: "reminder",
    label: "Reminder",
    light: { bg: "#FFF0B8", fg: "#8C6A00", chipBg: "#FFF8D9" },
    dark: { bg: "#443A18", fg: "#F9DE6E", chipBg: "#52451F" },
  },
  family: {
    id: "family",
    label: "Family",
    light: { bg: "#F3E7D9", fg: "#7E6650", chipBg: "#FAF2E8" },
    dark: { bg: "#3D352E", fg: "#D9C5A9", chipBg: "#463E35" },
  },
  friends: {
    id: "friends",
    label: "Friends",
    light: { bg: "#DDEBE0", fg: "#5B7668", chipBg: "#ECF5ED" },
    dark: { bg: "#304039", fg: "#B1CCBB", chipBg: "#394A42" },
  },
  home: {
    id: "home",
    label: "Home",
    light: { bg: "#F4F1EC", fg: "#8C8075", chipBg: "#FBF9F6" },
    dark: { bg: "#302C29", fg: "#CFC4B5", chipBg: "#38342F" },
  },
  other: {
    id: "other",
    label: "Other",
    light: { bg: "#F2F0EB", fg: "#8D8479", chipBg: "#FAF8F3" },
    dark: { bg: "#2E2E2A", fg: "#BCB5AB", chipBg: "#363630" },
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
