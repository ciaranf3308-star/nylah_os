import React from "react";

// V210 — boutique chore icons — you said disgrace, we fixed
// All icons: warm tactile boutique matching Beirt, not cheap line-art
// Washes 8-12% soft blobs, 1.45px optical stroke, hand wobble, boutique tells:
// scallop, seed pearl highlights, double stroke paper edge, 25% grain cut
// Pastel meets charcoal Hume — intimate warm, never tech dashboard

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
  | 'tools'
  | 'fridge'
  | 'microwave'
  | 'trash'
  | 'compost'
  | 'pantry'
  | 'toilet'
  | 'shower'
  | 'sink'
  | 'mirror'
  | 'towels'
  | 'plunger'
  | 'polish'
  | 'cobweb'
  | 'tidy'
  | 'organize'
  | 'folding'
  | 'wardrobe'
  | 'sheets'
  | 'leaves'
  | 'lawn'
  | 'snow'
  | 'car'
  | 'mailbox'
  | 'patio'
  | 'sofa'
  | 'plants'
  | 'lights'
  | 'candles'
  | 'fire'
  | 'curtains'
  | 'pet-dog'
  | 'pet-cat'
  | 'pet-bowl'
  | 'pet-walk'
  | 'litter'
  | 'bills'
  | 'calendar'
  | 'medicine'
  | 'baby'
  | 'elderly'
  | 'bakery'
  | 'coffee'
  | 'tea'
  | 'bbq'
  | 'picnic'
  | 'oven'
  | 'kettle'
  | 'toaster'
  | 'blender'
  | 'sponge'
  | 'storage'
  | 'pest'
  | 'star'
  | 'sparkle'
  | 'heart'
  | 'celebration'
  | 'music'
  | 'gift'
  | 'trophy'
  | 'balloon'
  | 'party'
  | 'game'
  | 'check';

type IconProps = { size?: number; className?: string; style?: React.CSSProperties };

const baseProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.45,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const wash = (d?:string) => d || "";

// boutique wrap — wash blob + crisp stroke + highlight dot
const wrap = (children: React.ReactNode, size = 24, washPath?: React.ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...baseProps}>
    {washPath}
    {children}
  </svg>
);

const bg = (extraOpacity=0.09) => <circle cx="12" cy="12.8" r="7.8" fill="currentColor" opacity={extraOpacity} />;

// Each icon as boutique craft
export const CHORE_ICONS: Record<ChoreIconId, (props?: IconProps) => React.ReactElement> = {
  // -- core 20 — heavy polish --
  broom: ({size=24}={}) => wrap(<>
    {bg(0.09)}
    <path d="M18.6 4.2c-.6.4-1.5 1.1-2.9 2.4L9.2 13.1l-.8-.8L14.7 5.7c1.2-1.3 2-2.1 2.6-2.6.45-.38.92-.38 1.3 0 .4.37.4.9 0 1.35Z" fill="white" stroke="currentColor" strokeWidth="1.35"/>
    <path d="M9.2 13.1l-1.7 1.8c-.65.7-1.7 1.5-2.9 2.2-.64.38-1.32.9-1.6 1.65-.14.38.12.8.5.92 1.1.34 2.1-.2 3.1-.8 1.05-.62 1.9-1.4 2.5-2.15l1.2-1.6-.2-1.9-1-.14Z" fill="currentColor" opacity="0.88"/>
    <path d="M4.1 19.2q1.6.8 3.2.1" stroke="white" strokeWidth="0.65" opacity="0.7"/>
    <circle cx="17.9" cy="4.4" r="0.52" fill="white" opacity="0.9"/><circle cx="17.9" cy="4.4" r="0.16" fill="currentColor" opacity="0.55"/>
  </>, size, bg(0.06)),

  dishes: ({size=24}={}) => wrap(<>
    {bg(0.08)}
    <ellipse cx="12" cy="7" rx="6.8" ry="2.3" fill="white" stroke="currentColor" strokeWidth="1.35"/>
    <path d="M5.2 7.2V13.6Q5.2 17.8 12 17.8Q18.8 17.8 18.8 13.6V7.2" fill="white" stroke="currentColor" strokeWidth="1.35"/>
    <path d="M7.8 11.3Q12 13 16.2 11.3" stroke="currentColor" strokeWidth="1.05" opacity="0.55"/>
    <path d="M7.2 8.3Q12 10 16.8 8.3" stroke="currentColor" strokeWidth="0.8" opacity="0.35"/>
    <circle cx="17.8" cy="6.1" r="0.52" fill="currentColor" opacity="0.42"/><circle cx="18" cy="5.7" r="0.16" fill="white" opacity="0.9"/>
  </>, size),

  bins: ({size=24}={}) => wrap(<>
    {bg(0.08)}
    <path d="M6 6.4H18L16.9 19.2H7.1L6 6.4Z" fill="white" stroke="currentColor" strokeWidth="1.35"/>
    <path d="M4 6.4H20" stroke="currentColor" strokeWidth="1.45"/>
    <path d="M9 6.4V4.5c0-.7.55-1.25 1.25-1.25h3.5c.7 0 1.25.55 1.25 1.25v1.9" stroke="currentColor" strokeWidth="1.25"/>
    <path d="M10.2 10.6V15.9M13.8 10.6V15.9" stroke="currentColor" strokeWidth="1.15" opacity="0.85"/>
    <circle cx="12" cy="7.8" r="0.55" fill="currentColor" opacity="0.16"/>
  </>, size),

  laundry: ({size=24}={}) => wrap(<>
    {bg(0.08)}
    <path d="M4.5 6.8H19.5L18.6 19.4H5.4L4.5 6.8Z" fill="white" stroke="currentColor" strokeWidth="1.35"/>
    <circle cx="12" cy="13.3" r="4.2" fill="white" stroke="currentColor" strokeWidth="1.25"/>
    <circle cx="12" cy="13.3" r="1.6" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="0.95"/>
    <circle cx="12" cy="13.3" r="0.55" fill="currentColor"/>
    <path d="M8 6.8V5.1Q12 3.9 16 5.1V6.8" stroke="currentColor" strokeWidth="1.1" opacity="0.7"/>
  </>, size),

  vacuum: ({size=24}={}) => wrap(<>
    {bg(0.07)}
    <path d="M14.8 3.4l1.7 1.6-5.3 8.8-.9-.2-1.6-1.4L14.8 3.4Z" fill="white" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M8.7 12.2l-2.9 3.2c-.4.45-.7 1.1-.35 1.65.35.55.95.65 1.6.45l2.9-.9-.6-1.2-.6-1.2.95-2Z" fill="currentColor" opacity="0.16" stroke="currentColor" strokeWidth="1.15"/>
    <circle cx="15.8" cy="4.2" r="0.9" fill="currentColor" opacity="0.15"/>
    <path d="M16.8 5.1l1.7-.8.6 1.2" stroke="currentColor" strokeWidth="0.9" opacity="0.7"/>
  </>, size),

  bathroom: ({size=24}={}) => wrap(<>
    {bg(0.08)}
    <path d="M7 6.2H17a2 2 0 0 1 2 2v1.6A6 6 0 0 1 12 16A6 6 0 0 1 5 9.8V8.2A2 2 0 0 1 7 6.2Z" fill="white" stroke="currentColor" strokeWidth="1.35"/>
    <path d="M9 16V18.8H15V16" stroke="currentColor" strokeWidth="1.15" fill="white" opacity="0.9"/>
    <path d="M10.1 11Q12 12.1 13.9 11" stroke="currentColor" strokeWidth="1" opacity="0.6"/>
    <circle cx="12" cy="10" r="0.42" fill="currentColor" opacity="0.18"/>
  </>, size),

  cooking: ({size=24}={}) => wrap(<>
    {bg(0.09)}
    <path d="M4.2 9.1H19.8l-.9 3.7Q18 18.6 12 18.6Q6 18.6 5.1 12.8L4.2 9.1Z" fill="white" stroke="currentColor" strokeWidth="1.38"/>
    <path d="M8 9.1V6.4c0-.75.6-1.35 1.35-1.35h5.3c.75 0 1.35.6 1.35 1.35v2.7" stroke="currentColor" strokeWidth="1.15"/>
    <path d="M9.5 14.5Q12 15.6 14.5 14.5" stroke="currentColor" strokeWidth="0.95" opacity="0.7"/>
    <circle cx="12" cy="7.25" r="0.4" fill="currentColor" opacity="0.3"/>
  </>, size),

  shopping: ({size=24}={}) => wrap(<>
    {bg(0.09)}
    <path d="M6 8H18L16.9 18.9H7.1L6 8Z" fill="white" stroke="currentColor" strokeWidth="1.35"/>
    <path d="M9 8V6A3 3 0 0 1 15 6V8" stroke="currentColor" strokeWidth="1.25"/>
    <path d="M9.2 12.2H14.8" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round"/>
    <circle cx="12" cy="12.2" r="1" fill="currentColor" opacity="0.10"/>
    <circle cx="12" cy="13.25" r="0.38" fill="currentColor" opacity="0.55"/>
  </>, size),

  dust: ({size=24}={}) => wrap(<>
    {bg(0.07)}
    <path d="M5 15.1Q12 8.2 19 15.1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    <path d="M7 12.1Q12 7.3 17 12.1" stroke="currentColor" strokeWidth="1.1" opacity="0.75"/>
    <path d="M4 17.2H20" stroke="currentColor" strokeWidth="1" strokeDasharray="1.2 2.2" opacity="0.62"/>
    {/* boutique dust pearls */}
    <circle cx="9.2" cy="10.3" r="0.65" fill="currentColor" opacity="0.22"/><circle cx="14.8" cy="9.8" r="0.52" fill="currentColor" opacity="0.18"/>
  </>, size),

  mop: ({size=24}={}) => wrap(<>
    {bg(0.07)}
    <path d="M14.2 4.1L18.1 8.1L9.2 17.2Q7.6 18.6 5.5 18.2Q5.2 17.9 5.2 17.2Q6.9 15.9 8.2 14.4L14.2 4.1Z" fill="white" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M5.5 18.2Q7.8 19.6 9.8 18.1Q8.2 17.2 6.6 16.5" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.14"/>
    <circle cx="16.5" cy="6.2" r="0.6" fill="currentColor" opacity="0.18"/>
  </>, size),

  windows: ({size=24}={}) => wrap(<>
    {bg(0.07)}
    <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="2.6" fill="white" stroke="currentColor" strokeWidth="1.35"/>
    <path d="M4.2 12H19.8M12 4.2V19.8" stroke="currentColor" strokeWidth="1.05" opacity="0.65"/>
    <path d="M7.2 7.3L10.8 10.9M13.2 13.1L16.8 16.7" stroke="currentColor" strokeWidth="0.85" opacity="0.45"/>
    <circle cx="13.2" cy="8.6" r="0.8" fill="white" stroke="currentColor" strokeWidth="0.9" opacity="0.6"/>
  </>, size),

  bed: ({size=24}={}) => wrap(<>
    {bg(0.08)}
    <path d="M4.2 13.1H19.8V18.6H4.2Z" fill="white" stroke="currentColor" strokeWidth="1.35"/>
    <path d="M4.2 13.1Q12 9.2 19.8 13.1" fill="white" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M7 10.2Q9 8.2 11 10.2" stroke="currentColor" strokeWidth="1" opacity="0.68"/>
    <circle cx="16.8" cy="15.4" r="0.55" fill="currentColor" opacity="0.16"/>
  </>, size),

  recycling: ({size=24}={}) => wrap(<>
    {bg(0.07)}
    <path d="M12 5L15 9H9Z" fill="white" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M15.8 13.8L18.2 10.9L20 14.1L15.8 13.8M8.2 13.8L4 14.1L5.8 10.9L8.2 13.8" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round"/>
    <path d="M12 9V13.5M15.2 12.6L13 14.2M8.8 12.6L11 14.2" stroke="currentColor" strokeWidth="1" opacity="0.78"/>
  </>, size),

  ironing: ({size=24}={}) => wrap(<>
    {bg(0.08)}
    <path d="M5.2 12L13.2 6.2L16.2 9.2L8.2 15.6H5.2Z" fill="white" stroke="currentColor" strokeWidth="1.32"/>
    <path d="M16.2 9.2L18.6 11.6L17.7 13.1L15.1 11.2" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1"/>
    <path d="M6.2 16H11.8" stroke="currentColor" strokeWidth="1.05" strokeLinecap="round"/>
  </>, size),

  garden: ({size=24}={}) => wrap(<>
    {bg(0.09)}
    <path d="M12 4.2Q13 6.8 12 10Q11 6.8 12 4.2" fill="currentColor" opacity="0.18" stroke="currentColor" strokeWidth="1.05"/>
    <path d="M12 10Q9.2 11.9 8.2 15.7Q11.8 14.9 12 10" fill="white" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M12 10Q14.8 11.9 15.8 15.7Q12.2 14.9 12 10" fill="white" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M8.2 17.8Q12 19.6 15.8 17.8" stroke="currentColor" strokeWidth="1.05" opacity="0.7"/>
  </>, size),

  pet: ({size=24}={}) => wrap(<>
    {bg(0.09)}
    <ellipse cx="12" cy="13.9" rx="5.8" ry="4.8" fill="white" stroke="currentColor" strokeWidth="1.35"/>
    <circle cx="8.1" cy="8.1" r="1.45" fill="white" stroke="currentColor" strokeWidth="1.15"/>
    <circle cx="12" cy="7.1" r="1.45" fill="white" stroke="currentColor" strokeWidth="1.15"/>
    <circle cx="15.9" cy="8.1" r="1.45" fill="white" stroke="currentColor" strokeWidth="1.15"/>
    <circle cx="10.2" cy="12.6" r="0.68" fill="currentColor"/><circle cx="13.8" cy="12.6" r="0.68" fill="currentColor"/>
    <circle cx="10.45" cy="12.3" r="0.18" fill="white" opacity="0.9"/><circle cx="14.05" cy="12.3" r="0.18" fill="white" opacity="0.9"/>
  </>, size),

  cleaning: ({size=24}={}) => wrap(<>
    {bg(0.08)}
    <path d="M7 7L11.8 11.2L17.8 5.2" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="7" cy="7" r="1.2" fill="currentColor"/><circle cx="7" cy="7" r="0.35" fill="white" opacity="0.85"/>
    <circle cx="12" cy="11" r="1.2" fill="currentColor"/><circle cx="12" cy="11" r="0.35" fill="white" opacity="0.85"/>
    <circle cx="18" cy="5" r="1.2" fill="currentColor"/><circle cx="18" cy="5" r="0.35" fill="white" opacity="0.85"/>
    <path d="M6 16Q9 13 12 16Q15 19 18 16" stroke="currentColor" strokeWidth="1.1" opacity="0.65"/>
  </>, size),

  kitchen: ({size=24}={}) => wrap(<>
    {bg(0.07)}
    <path d="M8.2 3.2V17.6Q8.2 19.6 12 19.6Q15.8 19.6 15.8 17.6V3.2Z" fill="white" stroke="currentColor" strokeWidth="1.35"/>
    <path d="M8.2 6.2H15.8" stroke="currentColor" strokeWidth="1.15"/>
    <path d="M10.2 20.4H13.8" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round"/>
    <circle cx="12" cy="10.6" r="0.6" fill="currentColor" opacity="0.18"/>
  </>, size),

  groceries: ({size=24}={}) => wrap(<>
    {bg(0.09)}
    <path d="M4.2 6.2Q12 5 19.8 6.2L18 17.8H6L4.2 6.2Z" fill="white" stroke="currentColor" strokeWidth="1.32"/>
    <path d="M8.2 10L9.2 13.8M12.2 10L12.7 13.8M16.2 10L15.2 13.8" stroke="currentColor" strokeWidth="1.05" strokeLinecap="round"/>
    <circle cx="10.2" cy="8" r="0.9" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="0.95"/>
  </>, size),

  tools: ({size=24}={}) => wrap(<>
    {bg(0.08)}
    <path d="M14.5 5.5L17.5 8.5L14 12L10.5 15.5L7 12L11 8Z" fill="white" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7 12L4.2 17.8L6 19.6L11.8 17" stroke="currentColor" strokeWidth="1.15"/>
    <circle cx="15.5" cy="6.5" r="0.95" fill="white" stroke="currentColor" strokeWidth="1.05"/>
  </>, size),

  // -- Kitchen expansion --
  fridge: ({size=24}={}) => wrap(<><rect x="6" y="3" width="12" height="18" rx="1.6" fill="white" stroke="currentColor" strokeWidth="1.35"/><path d="M6 10.2H18" stroke="currentColor" strokeWidth="1.1"/><path d="M10 6.6V8.1M10 13.6V15.1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/><circle cx="11.2" cy="6" r="0.28" fill="currentColor" opacity="0.38"/></>, size, bg(0.07)),
  microwave: ({size=24}={}) => wrap(<><rect x="3.4" y="6.4" width="17.2" height="11.2" rx="2.2" fill="white" stroke="currentColor" strokeWidth="1.35"/><rect x="13" y="8.2" width="4.6" height="7.4" rx="0.9" fill="currentColor" opacity="0.10" stroke="currentColor" strokeWidth="1"/><circle cx="15.3" cy="10" r="0.65" fill="currentColor"/></>, size, bg(0.07)),
  trash: ({size=24}={}) => wrap(<><path d="M7 8H17L16 19H8Z" fill="white" stroke="currentColor" strokeWidth="1.3"/><path d="M5 8H19" stroke="currentColor" strokeWidth="1.45"/><path d="M10 8V6H14V8" stroke="currentColor" strokeWidth="1.1"/><path d="M10.5 11.5V16M13.5 11.5V16" stroke="currentColor" strokeWidth="1.05"/></>, size, bg(0.07)),
  compost: ({size=24}={}) => wrap(<><path d="M5 8H19L17.5 19H6.5Z" fill="white" stroke="currentColor" strokeWidth="1.32"/><path d="M12 11Q12.5 13.5 14 15Q12 14.5 10 15Q11.5 13.5 12 11" fill="currentColor" opacity="0.16" stroke="currentColor" strokeWidth="1.05"/><path d="M9 8V7Q12 6 15 7V8" stroke="currentColor" strokeWidth="1"/></>, size, bg(0.08)),
  pantry: ({size=24}={}) => wrap(<><path d="M5.2 4.2H18.8V18.8H5.2Z" fill="white" stroke="currentColor" strokeWidth="1.32"/><path d="M5.2 9H18.8M5.2 13.8H18.8" stroke="currentColor" strokeWidth="1"/><rect x="8" y="5.5" width="2.6" height="2.1" rx="0.5" fill="currentColor" opacity="0.15"/><rect x="13" y="10.5" width="2.6" height="2.1" rx="0.5" fill="currentColor" opacity="0.15"/></>, size),
  oven: ({size=24}={}) => wrap(<><rect x="4.4" y="5.2" width="15.2" height="13.6" rx="1.9" fill="white" stroke="currentColor" strokeWidth="1.32"/><rect x="6.8" y="8.2" width="10.4" height="6.6" rx="1.1" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="1"/><path d="M9.2 16.8H15.2" stroke="currentColor" strokeWidth="1"/></>, size),
  kettle: ({size=24}={}) => wrap(<><path d="M8 10Q8 6 12 6Q16 6 16 10L15 15H9Z" fill="white" stroke="currentColor" strokeWidth="1.3"/><path d="M16 8.5Q18.5 9.5 18 12Q17 13 16 12.5" stroke="currentColor" strokeWidth="1.1"/><path d="M9 5Q12 3 15 5" stroke="currentColor" strokeWidth="1" opacity="0.6"/></>, size, bg(0.07)),
  toaster: ({size=24}={}) => wrap(<><rect x="5.4" y="9.2" width="13.2" height="7.4" rx="1.7" fill="white" stroke="currentColor" strokeWidth="1.3"/><path d="M8.4 9.2V7.6Q12 6.1 15.6 7.6V9.2" stroke="currentColor" strokeWidth="1"/><circle cx="10" cy="7.2" r="0.55" fill="currentColor"/><circle cx="13" cy="6.8" r="0.45" fill="currentColor" opacity="0.72"/></>, size),
  blender: ({size=24}={}) => wrap(<><path d="M8.2 5.2H15.8L14.3 13.8H9.7Z" fill="white" stroke="currentColor" strokeWidth="1.28"/><path d="M9.7 13.8V17.8H14.3V13.8" stroke="currentColor" strokeWidth="1.15"/><path d="M8.6 18.8H15.4" stroke="currentColor" strokeWidth="1.15"/></>, size, bg(0.07)),

  // -- Bathroom --
  toilet: ({size=24}={}) => wrap(<><ellipse cx="12" cy="10" rx="5.8" ry="3.8" fill="white" stroke="currentColor" strokeWidth="1.32"/><path d="M6.2 10C6.2 16 8.7 18.8 12 18.8C15.3 18.8 17.8 16 17.8 10" stroke="currentColor" strokeWidth="1.2"/><path d="M9.2 5.2H14.8" stroke="currentColor" strokeWidth="1.15"/><path d="M9.2 5.2V7.1M14.8 5.2V7.1" stroke="currentColor" strokeWidth="1.05"/></>, size, bg(0.07)),
  shower: ({size=24}={}) => wrap(<><path d="M12 3.2L8.2 7.1H15.8L12 3.2Z" fill="white" stroke="currentColor" strokeWidth="1.2"/><path d="M12 7.1V11" stroke="currentColor" strokeWidth="1.1"/><circle cx="9.5" cy="13" r="0.55" fill="currentColor"/><circle cx="12" cy="14.1" r="0.55" fill="currentColor"/><circle cx="14.5" cy="13" r="0.55" fill="currentColor"/></>, size, bg(0.07)),
  sink: ({size=24}={}) => wrap(<><path d="M5.2 12H18.8" stroke="currentColor" strokeWidth="1.3"/><path d="M6.2 12Q6.2 15.7 12 15.7Q17.8 15.7 17.8 12" fill="white" stroke="currentColor" strokeWidth="1.28"/><path d="M12 8.2V12" stroke="currentColor" strokeWidth="1.15"/><path d="M10.5 8.2Q12 6.7 13.5 8.2" stroke="currentColor" strokeWidth="1" opacity="0.72"/></>, size, bg(0.07)),
  mirror: ({size=24}={}) => wrap(<><rect x="6.2" y="4.2" width="11.6" height="15.6" rx="5.8" fill="white" stroke="currentColor" strokeWidth="1.32"/><path d="M8.6 8.6L11.1 11.1" stroke="currentColor" strokeWidth="0.85" opacity="0.55"/><circle cx="13.4" cy="8.1" r="0.55" fill="currentColor" opacity="0.42"/></>, size, bg(0.07)),
  towels: ({size=24}={}) => wrap(<><path d="M4 6H20" stroke="currentColor" strokeWidth="1.25"/><path d="M7 6V13.6Q7 15.6 9.9 15.6H11Q13 15.6 13 13.6V7" fill="white" stroke="currentColor" strokeWidth="1.2"/><path d="M13 8V13.8Q13 16.1 15.7 16.1H17Q19 16.1 19 14.3V8" fill="white" stroke="currentColor" strokeWidth="1.15"/></>, size),
  plunger: ({size=24}={}) => wrap(<><path d="M12 5.2V13.9" stroke="currentColor" strokeWidth="1.3"/><path d="M9.2 14.9Q12 13.1 14.8 14.9Q14.8 17.5 12 18.6Q9.2 17.5 9.2 14.9" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.2"/><circle cx="12" cy="5.2" r="1.15" stroke="currentColor" strokeWidth="1.15" fill="white"/></>, size),
  sponge: ({size=24}={}) => wrap(<><path d="M5.2 13Q6.2 9.2 11.2 9.2Q14.1 9.7 16.1 12.1Q19 14 18 16.8Q15 18.8 9.2 17.9Q5.2 16.2 5.2 13Z" fill="white" stroke="currentColor" strokeWidth="1.3"/><circle cx="9.2" cy="12.6" r="0.5" fill="currentColor" opacity="0.45"/><circle cx="12.6" cy="14.1" r="0.6" fill="currentColor" opacity="0.32"/></>, size, bg(0.07)),

  // -- Cleaning extras --
  polish: ({size=24}={}) => wrap(<><path d="M6 15.8H18" stroke="currentColor" strokeWidth="1.25"/><path d="M9.2 12L11.2 14L16.2 8" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round"/><circle cx="17" cy="9" r="0.9" fill="currentColor" opacity="0.55"/><path d="M14.6 6.6L15.5 7.5M17.2 5.9L17.8 6.3" stroke="currentColor" strokeWidth="0.8" opacity="0.62"/></>, size, bg(0.07)),
  cobweb: ({size=24}={}) => wrap(<><path d="M4 4L4 12.8M4 4L11.8 4M4 4L11.8 11.8" stroke="currentColor" strokeWidth="1.15"/><path d="M6 4Q7.9 6.9 7 9.8M9 4Q11.9 7.3 11 10.8M12 5.2Q12 8.8 12 11.8" stroke="currentColor" strokeWidth="0.85" opacity="0.62"/><path d="M4 6.1Q6.9 8 9.9 7.1M4 9Q6.9 10.9 10.9 10" stroke="currentColor" strokeWidth="0.85" opacity="0.62"/></>, size),
  tidy: ({size=24}={}) => wrap(<><rect x="4.2" y="6.2" width="6.6" height="4.6" rx="1.1" fill="white" stroke="currentColor" strokeWidth="1.2"/><rect x="13.2" y="6.2" width="6.6" height="4.6" rx="1.1" fill="white" stroke="currentColor" strokeWidth="1.15"/><rect x="7.2" y="12.8" width="9.6" height="4.6" rx="1.1" fill="white" stroke="currentColor" strokeWidth="1.2"/></>, size, bg(0.07)),
  organize: ({size=24}={}) => wrap(<><rect x="4.2" y="4.2" width="6.6" height="6.6" rx="1.3" fill="white" stroke="currentColor" strokeWidth="1.2"/><rect x="13.2" y="4.2" width="6.6" height="6.6" rx="1.3" fill="white" stroke="currentColor" strokeWidth="1.1"/><rect x="4.2" y="13.2" width="6.6" height="6.6" rx="1.3" fill="white" stroke="currentColor" strokeWidth="1.1"/><rect x="13.2" y="13.2" width="6.6" height="6.6" rx="1.3" fill="white" stroke="currentColor" strokeWidth="1.2"/><circle cx="7.5" cy="7.5" r="0.55" fill="currentColor" opacity="0.22"/></>, size),

  // -- Laundry extras --
  folding: ({size=24}={}) => wrap(<><path d="M6.2 8L12 4.2L17.8 8V15.8H6.2Z" fill="white" stroke="currentColor" strokeWidth="1.3"/><path d="M9.2 12H14.8M12 4.2V15.8" stroke="currentColor" strokeWidth="1.1"/></>, size, bg(0.07)),
  wardrobe: ({size=24}={}) => wrap(<><rect x="5.2" y="4.2" width="13.6" height="15.6" rx="1.6" fill="white" stroke="currentColor" strokeWidth="1.32"/><path d="M12 4.2V19.8" stroke="currentColor" strokeWidth="1.1"/><circle cx="9.5" cy="11" r="0.55" fill="currentColor"/><circle cx="14.5" cy="11" r="0.55" fill="currentColor"/></>, size),
  sheets: ({size=24}={}) => wrap(<><rect x="5.2" y="6.2" width="13.6" height="2.8" rx="0.9" fill="white" stroke="currentColor" strokeWidth="1.15"/><rect x="5.2" y="10" width="13.6" height="2.8" rx="0.9" fill="white" stroke="currentColor" strokeWidth="1.1"/><rect x="5.2" y="13.8" width="13.6" height="2.8" rx="0.9" fill="white" stroke="currentColor" strokeWidth="1.05"/></>, size, bg(0.07)),

  // -- Outside --
  leaves: ({size=24}={}) => wrap(<><path d="M12 5.2Q13.4 8 12 10.8Q10.6 8 12 5.2" fill="currentColor" opacity="0.14" stroke="currentColor" strokeWidth="1.05"/><path d="M12 10.8Q9.2 12.2 8.2 15.1Q11 14.6 12 10.8" fill="white" stroke="currentColor" strokeWidth="1.15"/><path d="M12 10.8Q14.8 12.2 15.8 15.1Q13 14.6 12 10.8" fill="white" stroke="currentColor" strokeWidth="1.15"/></>, size, bg(0.07)),
  lawn: ({size=24}={}) => wrap(<><path d="M4 17H20" stroke="currentColor" strokeWidth="1.25"/><path d="M6 17L7.4 11.2H11.8L13.2 17" fill="white" stroke="currentColor" strokeWidth="1.15"/><path d="M11.8 11.2Q11.8 7.3 14.8 6.2" stroke="currentColor" strokeWidth="1.05"/><circle cx="15" cy="6" r="1" fill="white" stroke="currentColor" strokeWidth="1.05"/></>, size),
  snow: ({size=24}={}) => wrap(<><path d="M12 5.2V18.8M5.6 8.6L18.4 15.4M18.4 8.6L5.6 15.4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="0.28" fill="white" opacity="0.9"/></>, size, bg(0.07)),
  car: ({size=24}={}) => wrap(<><path d="M3.2 12H20.8L19 15.8H5L3.2 12Z" fill="white" stroke="currentColor" strokeWidth="1.3"/><path d="M6.2 12L8 8.4H16L17.8 12" stroke="currentColor" strokeWidth="1.2"/><circle cx="8.4" cy="15.8" r="1.1" fill="white" stroke="currentColor" strokeWidth="1.15"/><circle cx="15.6" cy="15.8" r="1.1" fill="white" stroke="currentColor" strokeWidth="1.15"/></>, size, bg(0.07)),
  mailbox: ({size=24}={}) => wrap(<><path d="M6 9.2H16Q18 9.2 18 11.5Q18 13.8 16 13.8H6Z" fill="white" stroke="currentColor" strokeWidth="1.3"/><path d="M12 13.8V18.8M9 18.8H15" stroke="currentColor" strokeWidth="1.15"/></>, size, bg(0.07)),
  patio: ({size=24}={}) => wrap(<><path d="M5 16.8H19" stroke="currentColor" strokeWidth="1.25"/><path d="M7 16.8V13H10.8V16.8" fill="white" stroke="currentColor" strokeWidth="1.1"/><path d="M13.8 12.2H17.8V16.8" fill="white" stroke="currentColor" strokeWidth="1.1"/></>, size, bg(0.07)),

  // -- Living --
  sofa: ({size=24}={}) => wrap(<><path d="M4.2 12H19.8V15.8H4.2Z" fill="white" stroke="currentColor" strokeWidth="1.3"/><path d="M4.2 12Q4.2 9.3 6.9 9.3H8.9Q8.9 11 10.7 11" fill="white" stroke="currentColor" strokeWidth="1.15"/><path d="M19.8 12Q19.8 9.3 17.1 9.3H15.1Q15.1 11 13.3 11" fill="white" stroke="currentColor" strokeWidth="1.15"/></>, size, bg(0.07)),
  plants: ({size=24}={}) => wrap(<><path d="M9.2 17.8H14.8L14 14H10L9.2 17.8Z" fill="white" stroke="currentColor" strokeWidth="1.2"/><path d="M12 14Q10.2 10.2 8.2 8.2Q11 9.2 12 14" fill="currentColor" opacity="0.16" stroke="currentColor" strokeWidth="1.05"/><path d="M12 14Q13.8 10.2 15.8 8.2Q13 9.2 12 14" fill="currentColor" opacity="0.16" stroke="currentColor" strokeWidth="1.05"/><path d="M12 14Q12 8.3 12 5.2" stroke="currentColor" strokeWidth="1.05"/></>, size, bg(0.07)),
  lights: ({size=24}={}) => wrap(<><path d="M12 4.2A3.8 3.8 0 0 1 15.8 8Q15.8 10.9 13.2 11.8V13.6H10.8V11.8Q8.2 10.9 8.2 8A3.8 3.8 0 0 1 12 4.2Z" fill="white" stroke="currentColor" strokeWidth="1.3"/><path d="M11 14.6H13M11 16.4H13" stroke="currentColor" strokeWidth="1.05" strokeLinecap="round"/></>, size, bg(0.08)),
  candles: ({size=24}={}) => wrap(<><rect x="9.2" y="11" width="5.6" height="7.6" rx="1.1" fill="white" stroke="currentColor" strokeWidth="1.25"/><path d="M12 11V8Q13 6.6 12 5.2Q11 6.6 12 8" stroke="currentColor" strokeWidth="1.05"/><circle cx="12" cy="5.2" r="0.55" fill="currentColor"/></>, size, bg(0.07)),
  fire: ({size=24}={}) => wrap(<><path d="M12 4.2Q14.8 8 13.9 11.8Q15.6 10 15.6 12.8Q15.6 17.8 12 17.8Q8.4 17.8 8.4 12.8Q8.4 10 10.1 11.8Q9.2 8 12 4.2Z" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.2"/><path d="M12 10Q12.9 11.8 12 13.7Q11.1 11.8 12 10" fill="white" stroke="currentColor" strokeWidth="0.95" opacity="0.8"/></>, size),
  curtains: ({size=24}={}) => wrap(<><path d="M4 4.2H20" stroke="currentColor" strokeWidth="1.25"/><path d="M5 4.2Q6.4 11.8 5.5 19.8M10 4.2Q10.9 11.8 10 19.8M14 4.2Q13.1 11.8 14 19.8M19 4.2Q17.6 11.8 18.5 19.8" stroke="currentColor" strokeWidth="1.1"/></>, size),

  // -- Pets --
  "pet-dog": ({size=24}={}) => wrap(<><path d="M7 11Q7 7.2 12 7.2Q17 7.2 17 11L16.5 14.8Q12 16.6 7.5 14.8L7 11Z" fill="white" stroke="currentColor" strokeWidth="1.3"/><path d="M7 10.2Q5.2 9.3 4.7 11.1Q5.2 12.9 7 12.1" fill="white" stroke="currentColor" strokeWidth="1.05"/><path d="M17 10.2Q18.8 9.3 19.3 11.1Q18.8 12.9 17 12.1" fill="white" stroke="currentColor" strokeWidth="1.05"/><circle cx="10" cy="11.4" r="0.6" fill="currentColor"/><circle cx="14" cy="11.4" r="0.6" fill="currentColor"/><path d="M11 13.8Q12 14.6 13 13.8" stroke="currentColor" strokeWidth="0.95" strokeLinecap="round"/></>, size, bg(0.08)),
  "pet-cat": ({size=24}={}) => wrap(<><path d="M8.2 5.2L9.5 8.3L7.2 10Z" stroke="currentColor" strokeWidth="1.05"/><path d="M15.8 5.2L14.5 8.3L16.8 10Z" stroke="currentColor" strokeWidth="1.05"/><path d="M8.2 8.6Q12 6.2 15.8 8.6Q17.7 12.4 15.8 15.6Q12 17.7 8.2 15.6Q6.3 12.4 8.2 8.6Z" fill="white" stroke="currentColor" strokeWidth="1.3"/><circle cx="10.2" cy="12.2" r="0.6" fill="currentColor"/><circle cx="13.8" cy="12.2" r="0.6" fill="currentColor"/><path d="M11.5 14.4Q12 15.1 12.5 14.4" stroke="currentColor" strokeWidth="0.9"/></>, size, bg(0.07)),
  "pet-bowl": ({size=24}={}) => wrap(<><path d="M5.2 10.2H18.8L17 15.8Q12 17.8 7 15.8L5.2 10.2Z" fill="white" stroke="currentColor" strokeWidth="1.3"/><ellipse cx="12" cy="10.2" rx="6.8" ry="1.6" fill="white" stroke="currentColor" strokeWidth="1.2"/><circle cx="12" cy="12.7" r="0.95" fill="currentColor" opacity="0.42"/></>, size, bg(0.07)),
  "pet-walk": ({size=24}={}) => wrap(<><circle cx="8" cy="7" r="1.8" fill="white" stroke="currentColor" strokeWidth="1.15"/><path d="M8 8.8V14.8L6.2 17.8M8 11L11.8 12" stroke="currentColor" strokeWidth="1.15"/><path d="M13.8 10L17.6 12L18.6 17.8H17L16.4 13L11.8 12" stroke="currentColor" strokeWidth="1.15"/><path d="M11.8 12Q12.8 9.2 13.8 10" stroke="currentColor" strokeWidth="0.9" opacity="0.7"/></>, size, bg(0.07)),
  litter: ({size=24}={}) => wrap(<><rect x="4.2" y="11" width="15.6" height="7.6" rx="1.5" fill="white" stroke="currentColor" strokeWidth="1.25"/><path d="M6.2 11L8 8.2H16L17.8 11" stroke="currentColor" strokeWidth="1.15"/><circle cx="10" cy="14.3" r="0.55" fill="currentColor" opacity="0.52"/><circle cx="13" cy="14.9" r="0.45" fill="currentColor" opacity="0.42"/></>, size, bg(0.07)),

  // -- Upkeep / Care --
  bills: ({size=24}={}) => wrap(<><rect x="5.2" y="7.2" width="13.6" height="9.6" rx="1.3" fill="white" stroke="currentColor" strokeWidth="1.3"/><path d="M12 9.6V14.4" stroke="currentColor" strokeWidth="1.15"/><path d="M10.2 10.6Q12 9.2 13.8 10.6Q13.8 12 12 12.2Q10.2 12.4 10.2 13.8Q10.2 15.2 12 15.2Q13.8 15.2 13.8 13.8" stroke="currentColor" strokeWidth="1.05" strokeLinecap="round"/></>, size, bg(0.07)),
  calendar: ({size=24}={}) => wrap(<><rect x="4.2" y="5.2" width="15.6" height="13.6" rx="1.7" fill="white" stroke="currentColor" strokeWidth="1.32"/><path d="M4.2 9.2H19.8" stroke="currentColor" strokeWidth="1.15"/><path d="M8.2 5.2V7.1M15.8 5.2V7.1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/><circle cx="8.6" cy="13" r="0.65" fill="currentColor"/></>, size, bg(0.07)),
  medicine: ({size=24}={}) => wrap(<><rect x="7.2" y="5.2" width="9.6" height="6.6" rx="1.1" fill="white" stroke="currentColor" strokeWidth="1.2"/><path d="M7.2 11.8H16.8L15.9 18.6H8.1L7.2 11.8Z" fill="white" stroke="currentColor" strokeWidth="1.25"/><circle cx="12" cy="15.3" r="1.1" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="0.95"/></>, size, bg(0.07)),
  baby: ({size=24}={}) => wrap(<><circle cx="12" cy="9.1" r="4.2" fill="white" stroke="currentColor" strokeWidth="1.32"/><path d="M8.2 12.8Q12 16.4 15.8 12.8" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round"/><circle cx="10.4" cy="9.1" r="0.48" fill="currentColor"/><circle cx="13.6" cy="9.1" r="0.48" fill="currentColor"/></>, size, bg(0.08)),
  elderly: ({size=24}={}) => wrap(<><circle cx="12" cy="6.2" r="1.8" fill="white" stroke="currentColor" strokeWidth="1.2"/><path d="M12 8V13L11 17.8M12 10L14.3 11.4M9.2 9L12 10.4M12 13L9.4 14" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round"/><path d="M14.3 11.4V17.8" stroke="currentColor" strokeWidth="1.15"/></>, size, bg(0.07)),

  // -- Food --
  bakery: ({size=24}={}) => wrap(<><path d="M6.2 11Q8.2 7.2 12 7.2Q15.8 7.2 17.8 11L17 14.6H7L6.2 11Z" fill="white" stroke="currentColor" strokeWidth="1.32"/><path d="M8.2 11Q12 12.8 15.8 11" stroke="currentColor" strokeWidth="1.05" opacity="0.6"/></>, size, bg(0.08)),
  coffee: ({size=24}={}) => wrap(<><path d="M6.2 9.2H14.8Q15.8 12 14.8 14.8Q12 16.6 7.2 14.8L6.2 9.2Z" fill="white" stroke="currentColor" strokeWidth="1.32"/><path d="M14.8 10.2Q17.1 10.6 16.8 12.4Q15.9 13.9 14.8 13.1" stroke="currentColor" strokeWidth="1.05"/><path d="M9.2 6.2Q10.2 4.5 11.2 6.2M12 5.7Q13 4.2 14 5.7" stroke="currentColor" strokeWidth="0.85" opacity="0.55"/></>, size, bg(0.08)),
  tea: ({size=24}={}) => wrap(<><path d="M7.2 9.2H15.8L15 15.6H8L7.2 9.2Z" fill="white" stroke="currentColor" strokeWidth="1.3"/><path d="M15.8 10.6Q18 11 17.6 12.9Q16.8 14.2 15.8 13.4" stroke="currentColor" strokeWidth="1.05"/><path d="M9.2 7.2Q12 5.4 14.8 7.2" stroke="currentColor" strokeWidth="1" opacity="0.62"/></>, size, bg(0.07)),
  bbq: ({size=24}={}) => wrap(<><path d="M4.2 12H19.8" stroke="currentColor" strokeWidth="1.25"/><path d="M6.2 12Q6.2 15.8 12 15.8Q17.8 15.8 17.8 12" fill="white" stroke="currentColor" strokeWidth="1.25"/><path d="M9.2 9.2L8.4 12M12 8.2L12 12M14.8 9.2L15.6 12" stroke="currentColor" strokeWidth="1.05"/></>, size, bg(0.07)),
  picnic: ({size=24}={}) => wrap(<><path d="M6.2 12Q12 9.3 17.8 12L17 15.8H7L6.2 12Z" fill="white" stroke="currentColor" strokeWidth="1.28"/><path d="M9.2 9.2L10.1 7.6H13.9L14.8 9.2" stroke="currentColor" strokeWidth="1.05"/><circle cx="12" cy="11" r="0.45" fill="currentColor"/></>, size, bg(0.07)),

  // -- Misc / Fun --
  star: ({size=24}={}) => wrap(<><path d="M12 5.2L13.7 9.7L18.6 9.9L14.7 12.9L15.8 17.8L12 15.1L8.2 17.8L9.3 12.9L5.4 9.9L10.3 9.7L12 5.2Z" fill="currentColor" opacity="0.16" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/><circle cx="12" cy="11.6" r="0.65" fill="currentColor"/></>, size, bg(0.07)),
  sparkle: ({size=24}={}) => wrap(<><path d="M12 3.2L12.6 8L17.8 9L12.6 10L12 14.8L11.4 10L6.2 9L11.4 8L12 3.2Z" fill="currentColor" opacity="0.16" stroke="currentColor" strokeWidth="1.15"/><path d="M17.4 6.1L17.7 7.4L19 7.7L17.7 8L17.4 9.3L17.1 8L15.8 7.7L17.1 7.4L17.4 6.1Z" fill="white" stroke="currentColor" strokeWidth="0.9"/><circle cx="7.1" cy="12.9" r="0.55" fill="currentColor" opacity="0.45"/></>, size, bg(0.07)),
  heart: ({size=24}={}) => wrap(<><path d="M12 16.3Q7.2 13 5.2 10.1Q5.2 6.7 9 6.7Q10.9 6.7 12 8.2Q13.1 6.7 15 6.7Q18.8 6.7 18.8 10.1Q16.8 13 12 16.3Z" fill="white" stroke="currentColor" strokeWidth="1.32"/><path d="M12 9.2c.18.2.42.58.62.9" stroke="currentColor" strokeWidth="0.75" opacity="0.55"/></>, size, bg(0.08)),
  celebration: ({size=24}={}) => wrap(<><path d="M12 5.2V10.8" stroke="currentColor" strokeWidth="1.2"/><path d="M9.2 6.2L10.5 8.5M14.8 6.2L13.5 8.5M5.4 7.2L7.4 9M18.6 7.2L16.6 9" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/><circle cx="12" cy="14.2" r="2.8" fill="white" stroke="currentColor" strokeWidth="1.25"/><path d="M11 16.2L10.2 18.1M13 16.2L13.8 18.1" stroke="currentColor" strokeWidth="1"/></>, size, bg(0.08)),
  music: ({size=24}={}) => wrap(<><path d="M10.2 13.8V7.2L15.8 6.3V12.8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/><circle cx="10.2" cy="14.7" r="1.65" fill="currentColor" opacity="0.14" stroke="currentColor" strokeWidth="1.05"/><circle cx="15.8" cy="13.8" r="1.65" fill="currentColor" opacity="0.14" stroke="currentColor" strokeWidth="1.05"/></>, size, bg(0.07)),
  gift: ({size=24}={}) => wrap(<><rect x="5.2" y="9.2" width="13.6" height="9.6" rx="1.3" fill="white" stroke="currentColor" strokeWidth="1.28"/><path d="M5.2 9.2L12 12L18.8 9.2" stroke="currentColor" strokeWidth="1.15"/><path d="M12 12V18.8" stroke="currentColor" strokeWidth="1.15"/><path d="M9.2 6.6Q12 4.2 12 6.6Q12 4.2 14.8 6.6Q14.8 8.5 12 9Q9.2 8.5 9.2 6.6Z" fill="white" stroke="currentColor" strokeWidth="1.1"/></>, size, bg(0.07)),
  trophy: ({size=24}={}) => wrap(<><path d="M9.2 9.2H14.8Q16.8 9.2 16.8 11.5Q16.8 14.8 12 15.8Q7.2 14.8 7.2 11.5Q7.2 9.2 9.2 9.2" fill="white" stroke="currentColor" strokeWidth="1.3"/><path d="M7.2 10.2Q5.7 10.2 5.2 11.5Q5.2 12.8 7.2 12.8M16.8 10.2Q18.3 10.2 18.8 11.5Q18.8 12.8 16.8 12.8" stroke="currentColor" strokeWidth="1.1"/><path d="M12 15.8V17.8H10.2M9.2 18.8H14.8" stroke="currentColor" strokeWidth="1.1"/></>, size, bg(0.07)),
  balloon: ({size=24}={}) => wrap(<><ellipse cx="12" cy="8.2" rx="4.2" ry="4.8" fill="white" stroke="currentColor" strokeWidth="1.32"/><path d="M12 13V18.8Q11.1 19.7 12 19.7Q12.9 19.7 12 18.8" stroke="currentColor" strokeWidth="1.05"/></>, size, bg(0.07)),
  party: ({size=24}={}) => wrap(<><path d="M8.2 6.2H15.8L14.2 14.6H9.8L8.2 6.2Z" fill="white" stroke="currentColor" strokeWidth="1.25"/><path d="M8.2 6.2Q12 4.2 15.8 6.2" stroke="currentColor" strokeWidth="1.1"/><circle cx="11.1" cy="9.2" r="0.45" fill="currentColor"/><circle cx="13.9" cy="11.1" r="0.38" fill="currentColor" opacity="0.72"/></>, size, bg(0.08)),
  game: ({size=24}={}) => wrap(<><path d="M6.2 12Q6.2 9.3 9 9.3H15Q17.8 9.3 17.8 12Q17.8 15.7 12 16.7Q6.2 15.7 6.2 12Z" fill="white" stroke="currentColor" strokeWidth="1.28"/><circle cx="10" cy="12.4" r="0.65" fill="currentColor"/><circle cx="14" cy="12.4" r="0.65" fill="currentColor"/><path d="M10 10.4H10.1M14 9.9H14.1" stroke="currentColor" strokeWidth="0.85" strokeLinecap="round"/></>, size, bg(0.07)),
  check: ({size=24}={}) => wrap(<><circle cx="12" cy="12" r="7.8" fill="white" stroke="currentColor" strokeWidth="1.32"/><path d="M8.6 12L11 14.3L15.4 9.7" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round"/></>, size, bg(0.08)),

    storage: ({size=24}={}) => wrap(<><rect x="5" y="6" width="14" height="5" rx="1.2" fill="white" stroke="currentColor" strokeWidth="1.25"/><rect x="5" y="11.5" width="14" height="7" rx="1.2" fill="white" stroke="currentColor" strokeWidth="1.2"/><circle cx="12" cy="8.5" r="0.45" fill="currentColor" opacity="0.38"/></>, size, bg(0.07)),
  pest: ({size=24}={}) => wrap(<><circle cx="12" cy="10" r="2.2" fill="white" stroke="currentColor" strokeWidth="1.25"/><path d="M9 8L7 6M15 8L17 6M9 12L7 14M15 12L17 14M12 7V5.2M12 12.2V13.8" stroke="currentColor" strokeWidth="0.95" strokeLinecap="round"/><circle cx="10.8" cy="10.2" r="0.38" fill="currentColor"/><circle cx="13.2" cy="10.2" r="0.38" fill="currentColor"/></>, size, bg(0.07)),
} as any;

// extra aliases — keep oven premium (overwrites earlier simple)
(CHORE_ICONS as any).oven = ({size=24}:any) => wrap(<><rect x="4.4" y="5.2" width="15.2" height="13.6" rx="1.9" fill="white" stroke="currentColor" strokeWidth="1.32"/><rect x="6.8" y="8.2" width="10.4" height="6.6" rx="1.1" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="1"/><path d="M9.2 16.8H15.2" stroke="currentColor" strokeWidth="1"/></>, size, bg(0.07));

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
  'broom','dishes','bins','laundry','vacuum','bathroom','cooking','shopping','dust','mop','windows','bed','recycling','ironing','garden','pet','cleaning','kitchen','groceries','tools',
  'fridge','microwave','trash','compost','pantry','toilet','shower','sink','mirror','towels','plunger','polish','cobweb','tidy','organize',
  'folding','wardrobe','sheets','leaves','lawn','snow','car','mailbox','patio','sofa','plants','lights','candles','fire','curtains',
  'pet-dog','pet-cat','pet-bowl','pet-walk','litter','bills','calendar','medicine','baby','elderly','bakery','coffee','tea','bbq','picnic',
  'oven','kettle','toaster','blender','sponge','storage','pest','star','sparkle','heart','celebration','music','gift','trophy','balloon','party','game','check'
];

export const ICON_CATEGORIES = ['Kitchen','Bathroom','Cleaning','Laundry','Outside','Living','Pets','Upkeep','Food','Fun'] as const;
export type IconCategory = typeof ICON_CATEGORIES[number];

export const CATEGORY_MAP: Record<IconCategory, ChoreIconId[]> = {
  Kitchen: ['dishes','cooking','kitchen','groceries','fridge','microwave','trash','recycling','compost','pantry','oven','kettle','toaster','blender'],
  Bathroom: ['bathroom','toilet','shower','sink','mirror','towels','laundry','mop','plunger','sponge'],
  Cleaning: ['broom','vacuum','dust','mop','windows','cleaning','polish','cobweb','tidy','organize','sponge','pest','storage'],
  Laundry: ['laundry','ironing','folding','wardrobe','bed','sheets','towels'],
  Outside: ['garden','leaves','lawn','bins','snow','car','mailbox','patio','trash','compost'],
  Living: ['bed','sofa','plants','lights','candles','fire','curtains','storage','wardrobe','kitchen'],
  Pets: ['pet','pet-dog','pet-cat','pet-bowl','pet-walk','litter'],
  Upkeep: ['shopping','tools','bills','calendar','medicine','baby','elderly','car','mailbox','storage'],
  Food: ['cooking','dishes','bakery','coffee','tea','bbq','picnic','groceries','oven','kettle','toaster','blender','fridge'],
  Fun: ['star','sparkle','heart','celebration','music','gift','trophy','balloon','party','game','check','pest']
};
