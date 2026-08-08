import React from "react";

// V210 — boutique 20 — upgraded from disgrace doodle to curated warm
// Matches beirt boutique, not tech dashboard — washes 8-10%, 1.45px stroke

export type ChoreIconId =
  | 'broom'
  | 'dishes'
  | 'bins'
  | 'laundry'
  | 'vacuum'
  | 'bathroom'
  | 'cooking'
  | 'shopping'
  | 'dust'
  | 'mop'
  | 'windows'
  | 'bed'
  | 'recycling'
  | 'ironing'
  | 'garden'
  | 'pet'
  | 'cleaning'
  | 'kitchen'
  | 'groceries'
  | 'tools';

type IconProps = { size?: number; className?: string; style?: React.CSSProperties };

const baseProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.45,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const wrap = (children: React.ReactNode, size = 24, wash?: React.ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...baseProps}>{wash}{children}</svg>
);

const bg = (o=0.08) => <circle cx="12" cy="12.8" r="7.8" fill="currentColor" opacity={o}/>;

export const CHORE_ICONS: Record<ChoreIconId, (props?: IconProps) => React.ReactElement> = {
  broom: ({size=24}={}) => wrap(<>
    <path d="M18.6 4.2c-.6.4-1.5 1.1-2.9 2.4L9.2 13.1l-.8-.8L14.7 5.7c1.2-1.3 2-2.1 2.6-2.6.45-.38.92-.38 1.3 0 .4.37.4.9 0 1.35Z" fill="white" stroke="currentColor" strokeWidth="1.35"/>
    <path d="M9.2 13.1l-1.7 1.8c-.65.7-1.7 1.5-2.9 2.2-.64.38-1.32.9-1.6 1.65-.14.38.12.8.5.92 1.1.34 2.1-.2 3.1-.8 1.05-.62 1.9-1.4 2.5-2.15l1.2-1.6-.2-1.9-1-.14Z" fill="currentColor" opacity="0.88"/>
  </>, size, bg(0.06)),
  dishes: ({size=24}={}) => wrap(<><ellipse cx="12" cy="7" rx="6.8" ry="2.3" fill="white" stroke="currentColor" strokeWidth="1.35"/><path d="M5.2 7.2V13.6Q5.2 17.8 12 17.8Q18.8 17.8 18.8 13.6V7.2" fill="white" stroke="currentColor" strokeWidth="1.35"/><path d="M7.8 11.3Q12 13 16.2 11.3" stroke="currentColor" strokeWidth="1" opacity="0.55"/></>, size, bg()),
  bins: ({size=24}={}) => wrap(<><path d="M6 6.4H18L16.9 19.2H7.1L6 6.4Z" fill="white" stroke="currentColor" strokeWidth="1.35"/><path d="M4 6.4H20M9 6.4V4.5c0-.7.55-1.25 1.25-1.25h3.5c.7 0 1.25.55 1.25 1.25v1.9" stroke="currentColor" strokeWidth="1.25"/><path d="M10.2 10.6V15.9M13.8 10.6V15.9" stroke="currentColor" strokeWidth="1.1" opacity="0.85"/></>, size, bg()),
  laundry: ({size=24}={}) => wrap(<><path d="M4.5 6.8H19.5L18.6 19.4H5.4L4.5 6.8Z" fill="white" stroke="currentColor" strokeWidth="1.35"/><circle cx="12" cy="13.3" r="4.2" fill="white" stroke="currentColor" strokeWidth="1.25"/><circle cx="12" cy="13.3" r="1.6" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="0.95"/><circle cx="12" cy="13.3" r="0.55" fill="currentColor"/></>, size, bg()),
  vacuum: ({size=24}={}) => wrap(<><path d="M14.8 3.4l1.7 1.6-5.3 8.8-.9-.2-1.6-1.4L14.8 3.4Z" fill="white" stroke="currentColor" strokeWidth="1.3"/><path d="M8.7 12.2l-2.9 3.2c-.4.45-.7 1.1-.35 1.65.35.55.95.65 1.6.45l2.9-.9-.6-1.2-.6-1.2.95-2Z" fill="currentColor" opacity="0.16" stroke="currentColor" strokeWidth="1.15"/></>, size, bg(0.06)),
  bathroom: ({size=24}={}) => wrap(<><path d="M7 6.2H17a2 2 0 0 1 2 2v1.6A6 6 0 0 1 12 16A6 6 0 0 1 5 9.8V8.2A2 2 0 0 1 7 6.2Z" fill="white" stroke="currentColor" strokeWidth="1.35"/><path d="M9 16V18.8H15V16" stroke="currentColor" strokeWidth="1.15"/></>, size, bg()),
  cooking: ({size=24}={}) => wrap(<><path d="M4.2 9.1H19.8l-.9 3.7Q18 18.6 12 18.6Q6 18.6 5.1 12.8L4.2 9.1Z" fill="white" stroke="currentColor" strokeWidth="1.38"/><path d="M8 9.1V6.4c0-.75.6-1.35 1.35-1.35h5.3c.75 0 1.35.6 1.35 1.35v2.7" stroke="currentColor" strokeWidth="1.15"/></>, size, bg(0.09)),
  shopping: ({size=24}={}) => wrap(<><path d="M6 8H18L16.9 18.9H7.1L6 8Z" fill="white" stroke="currentColor" strokeWidth="1.35"/><path d="M9 8V6A3 3 0 0 1 15 6V8" stroke="currentColor" strokeWidth="1.25"/><path d="M9.2 12.2H14.8" stroke="currentColor" strokeWidth="1.15"/></>, size, bg(0.09)),
  dust: ({size=24}={}) => wrap(<><path d="M5 15.1Q12 8.2 19 15.1" stroke="currentColor" strokeWidth="1.25"/><path d="M7 12.1Q12 7.3 17 12.1" stroke="currentColor" strokeWidth="1.1" opacity="0.75"/><path d="M4 17.2H20" stroke="currentColor" strokeWidth="1" strokeDasharray="1.2 2.2" opacity="0.62"/></>, size, bg(0.06)),
  mop: ({size=24}={}) => wrap(<><path d="M14.2 4.1L18.1 8.1L9.2 17.2Q7.6 18.6 5.5 18.2Q5.2 17.9 5.2 17.2Q6.9 15.9 8.2 14.4L14.2 4.1Z" fill="white" stroke="currentColor" strokeWidth="1.3"/><path d="M5.5 18.2Q7.8 19.6 9.8 18.1" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.14"/></>, size, bg(0.06)),
  windows: ({size=24}={}) => wrap(<><rect x="4.2" y="4.2" width="15.6" height="15.6" rx="2.6" fill="white" stroke="currentColor" strokeWidth="1.35"/><path d="M4.2 12H19.8M12 4.2V19.8" stroke="currentColor" strokeWidth="1.05" opacity="0.65"/></>, size, bg(0.06)),
  bed: ({size=24}={}) => wrap(<><path d="M4.2 13.1H19.8V18.6H4.2Z" fill="white" stroke="currentColor" strokeWidth="1.35"/><path d="M4.2 13.1Q12 9.2 19.8 13.1" fill="white" stroke="currentColor" strokeWidth="1.2"/><path d="M7 10.2Q9 8.2 11 10.2" stroke="currentColor" strokeWidth="1" opacity="0.68"/></>, size, bg()),
  recycling: ({size=24}={}) => wrap(<><path d="M12 5L15 9H9Z" fill="white" stroke="currentColor" strokeWidth="1.2"/><path d="M15.8 13.8L18.2 10.9L20 14.1L15.8 13.8M8.2 13.8L4 14.1L5.8 10.9L8.2 13.8" stroke="currentColor" strokeWidth="1.15"/><path d="M12 9V13.5M15.2 12.6L13 14.2M8.8 12.6L11 14.2" stroke="currentColor" strokeWidth="1" opacity="0.78"/></>, size, bg(0.06)),
  ironing: ({size=24}={}) => wrap(<><path d="M5.2 12L13.2 6.2L16.2 9.2L8.2 15.6H5.2Z" fill="white" stroke="currentColor" strokeWidth="1.32"/><path d="M16.2 9.2L18.6 11.6L17.7 13.1L15.1 11.2" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1"/><path d="M6.2 16H11.8" stroke="currentColor" strokeWidth="1.05"/></>, size, bg()),
  garden: ({size=24}={}) => wrap(<><path d="M12 10Q9.2 11.9 8.2 15.7Q11.8 14.9 12 10" fill="white" stroke="currentColor" strokeWidth="1.2"/><path d="M12 10Q14.8 11.9 15.8 15.7Q12.2 14.9 12 10" fill="white" stroke="currentColor" strokeWidth="1.2"/><path d="M8.2 17.8Q12 19.6 15.8 17.8" stroke="currentColor" strokeWidth="1.05"/></>, size, bg(0.09)),
  pet: ({size=24}={}) => wrap(<><ellipse cx="12" cy="13.9" rx="5.8" ry="4.8" fill="white" stroke="currentColor" strokeWidth="1.35"/><circle cx="8.1" cy="8.1" r="1.45" fill="white" stroke="currentColor" strokeWidth="1.15"/><circle cx="12" cy="7.1" r="1.45" fill="white" stroke="currentColor" strokeWidth="1.15"/><circle cx="15.9" cy="8.1" r="1.45" fill="white" stroke="currentColor" strokeWidth="1.15"/><circle cx="10.2" cy="12.6" r="0.68" fill="currentColor"/><circle cx="13.8" cy="12.6" r="0.68" fill="currentColor"/></>, size, bg(0.09)),
  cleaning: ({size=24}={}) => wrap(<><path d="M7 7L11.8 11.2L17.8 5.2" stroke="currentColor" strokeWidth="1.45"/><circle cx="7" cy="7" r="1.2" fill="currentColor"/><circle cx="12" cy="11" r="1.2" fill="currentColor"/><circle cx="18" cy="5" r="1.2" fill="currentColor"/><path d="M6 16Q9 13 12 16Q15 19 18 16" stroke="currentColor" strokeWidth="1.1" opacity="0.65"/></>, size, bg()),
  kitchen: ({size=24}={}) => wrap(<><path d="M8.2 3.2V17.6Q8.2 19.6 12 19.6Q15.8 19.6 15.8 17.6V3.2Z" fill="white" stroke="currentColor" strokeWidth="1.35"/><path d="M8.2 6.2H15.8" stroke="currentColor" strokeWidth="1.15"/><path d="M10.2 20.4H13.8" stroke="currentColor" strokeWidth="1.15"/></>, size, bg(0.06)),
  groceries: ({size=24}={}) => wrap(<><path d="M4.2 6.2Q12 5 19.8 6.2L18 17.8H6L4.2 6.2Z" fill="white" stroke="currentColor" strokeWidth="1.32"/><path d="M8.2 10L9.2 13.8M12.2 10L12.7 13.8M16.2 10L15.2 13.8" stroke="currentColor" strokeWidth="1.05"/></>, size, bg(0.09)),
  tools: ({size=24}={}) => wrap(<><path d="M14.5 5.5L17.5 8.5L14 12L10.5 15.5L7 12L11 8Z" fill="white" stroke="currentColor" strokeWidth="1.3"/><path d="M7 12L4.2 17.8L6 19.6L11.8 17" stroke="currentColor" strokeWidth="1.15"/><circle cx="15.5" cy="6.5" r="0.95" fill="white" stroke="currentColor" strokeWidth="1.05"/></>, size, bg()),
};

export function ChoreIcon({ id, size = 28, className, style }: { id: ChoreIconId | string; size?: number; className?: string; style?: React.CSSProperties }) {
  const key = (typeof id === 'string' ? id : 'broom') as ChoreIconId;
  const fn = (CHORE_ICONS as any)[key] || CHORE_ICONS.broom;
  const el = fn({ size, className, style });
  if (!className && !style) return el;
  return (
    <span className={className} style={style as any} aria-hidden="true">
      {el}
    </span>
  );
}

export const CHORE_ICON_BY_TEMPLATE: Record<string, ChoreIconId> = {
  Bins: 'bins',
  Dishes: 'dishes',
  Laundry: 'laundry',
  Vacuum: 'vacuum',
  Bathroom: 'bathroom',
  Shop: 'shopping',
};

export const ALL_CHORE_ICON_IDS: ChoreIconId[] = [
  'broom','dishes','bins','laundry','vacuum','bathroom','cooking','shopping','dust','mop','windows','bed','recycling','ironing','garden','pet','cleaning','kitchen','groceries','tools'
];
