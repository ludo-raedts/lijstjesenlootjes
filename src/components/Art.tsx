/**
 * Own illustrated icons (DESIGN.md §8.2). All are purely decorative:
 * the surrounding HTML carries the meaning, so each one is aria-hidden.
 */
import type { SVGProps } from "react";

const INK = "#1D2A22";
const FOREST = "#174A36";
const BRICK = "#A53A2E";
const BRICK_DARK = "#7C2B24";
const COBALT = "#1C4CB4";
const PAPER_WHITE = "#FFFDF8";
const PEACH = "#F2C8B7";
const WOOD = "#B07A4A";

type IconProps = Omit<SVGProps<SVGSVGElement>, "viewBox" | "children">;

function Svg({ viewBox, children, ...rest }: IconProps & { viewBox: string; children: React.ReactNode }) {
  return (
    <svg viewBox={viewBox} fill="none" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  );
}

/** Logo gift: brick box, paper-white ribbon, hand-made accent stroke is added in CSS. */
export function GiftMark(props: IconProps) {
  return (
    <Svg viewBox="0 0 48 48" {...props}>
      <path d="M17 14C11 12 10 5 15 4C20 3 23 9 24 14C25 9 28 3 33 4C38 5 37 12 31 14" stroke={BRICK_DARK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="6" y="14" width="36" height="9" rx="2" fill={BRICK} />
      <rect x="9" y="23" width="30" height="21" rx="2" fill={BRICK} />
      <rect x="21" y="14" width="6" height="30" fill={PAPER_WHITE} />
      <path d="M9 23H39" stroke={BRICK_DARK} strokeWidth="1.6" />
    </Svg>
  );
}

/** Wish list on a clipboard, with brick check marks and a heart. */
export function ClipboardArt(props: IconProps) {
  return (
    <Svg viewBox="0 0 140 160" {...props}>
      <g stroke={BRICK} strokeWidth="3" strokeLinecap="round">
        <path d="M20 22L10 14M30 14L26 3M14 36L3 34" />
      </g>
      <rect x="26" y="20" width="92" height="132" rx="8" fill={WOOD} stroke={INK} strokeWidth="2.5" transform="rotate(-5 72 86)" />
      <g transform="rotate(-5 72 86)">
        <rect x="36" y="34" width="72" height="108" rx="3" fill={PAPER_WHITE} stroke={INK} strokeWidth="1.5" />
        <rect x="55" y="12" width="34" height="18" rx="6" fill="#8A5A30" stroke={INK} strokeWidth="2.5" />
        <circle cx="72" cy="21" r="3" fill={PAPER_WHITE} />
        <g stroke={INK} strokeWidth="2" strokeLinecap="round">
          <path d="M60 56H98M60 78H92M60 100H98" />
        </g>
        <g stroke={INK} strokeWidth="1.8"><rect x="43" y="49" width="10" height="10" rx="1.5" /><rect x="43" y="71" width="10" height="10" rx="1.5" /><rect x="43" y="93" width="10" height="10" rx="1.5" /></g>
        <g stroke={BRICK} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M44.5 54L48 58L56 46M44.5 76L48 80L56 68" /></g>
        <path d="M86 128C78 122 76 114 82 111C85 110 87 112 88 114C89 112 92 110 95 111C101 114 98 122 90 128Z" fill={BRICK} transform="translate(-6 0)" />
      </g>
    </Svg>
  );
}

/** Bowl with folded lootjes resting inside, and a folk-art flower on the front. */
export function BowlArt(props: IconProps) {
  return (
    <Svg viewBox="0 0 160 140" {...props}>
      <g stroke={BRICK} strokeWidth="3" strokeLinecap="round">
        <path d="M80 18V4M58 24L48 11M102 24L112 11M40 38L27 30M120 38L133 30" />
      </g>
      <path d="M12 66C12 100 40 126 80 126C120 126 148 100 148 66Z" fill={PAPER_WHITE} stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
      <ellipse cx="80" cy="66" rx="68" ry="12" fill="#EADFCB" stroke={INK} strokeWidth="2.8" />
      <g stroke={INK} strokeWidth="1.8" strokeLinejoin="round">
        <path d="M40 66L58 38L80 50L68 74Z" fill={PAPER_WHITE} />
        <path d="M66 72L88 30L112 50L100 76Z" fill="#FFF6E8" />
        <path d="M98 74L112 46L134 60L120 72Z" fill={PAPER_WHITE} />
        <path d="M88 30L90 56M58 38L62 60" strokeWidth="1" opacity=".5" />
      </g>
      <path d="M12 66C14 80 44 80 80 80C116 80 146 80 148 66" stroke={INK} strokeWidth="2.8" strokeLinecap="round" fill="none" opacity="0" />
      <path d="M12 66C16 82 46 90 80 90C114 90 144 82 148 66C146 74 116 78 80 78C44 78 14 74 12 66Z" fill={PAPER_WHITE} />
      <path d="M12 66C16 82 46 90 80 90C114 90 144 82 148 66" stroke={INK} strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <g>
        <path d="M80 118C62 118 50 108 46 96C62 98 74 106 80 118Z" fill={FOREST} />
        <path d="M80 118C98 118 110 108 114 96C98 98 86 106 80 118Z" fill="#2B6A50" />
        <circle cx="80" cy="100" r="8" fill={BRICK} />
        <circle cx="69" cy="105" r="6" fill={BRICK_DARK} />
        <circle cx="91" cy="105" r="6" fill={BRICK_DARK} />
        <circle cx="80" cy="100" r="3" fill={PEACH} />
      </g>
    </Svg>
  );
}

/** Pencil — used as a drawing accent and on the wishlist route. */
export function PencilIcon(props: IconProps) {
  return (
    <Svg viewBox="0 0 120 24" {...props}>
      <path d="M4 12L20 4H100V20H20Z" fill="#E7B84F" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 12L20 4V20Z" fill={PEACH} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 12L9.5 9.2V14.8Z" fill={INK} />
      <path d="M100 4H112C116 4 118 8 118 12C118 16 116 20 112 20H100Z" fill={FOREST} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M30 8H98M30 16H98" stroke={INK} strokeWidth="1" opacity=".35" />
    </Svg>
  );
}

/** Personal link: two linked paper loops. */
export function LinkIcon(props: IconProps) {
  return (
    <Svg viewBox="0 0 48 48" {...props}>
      <rect x="4" y="16" width="26" height="16" rx="8" stroke={FOREST} strokeWidth="3.5" transform="rotate(-30 17 24)" />
      <rect x="18" y="16" width="26" height="16" rx="8" stroke={BRICK} strokeWidth="3.5" transform="rotate(-30 31 24)" />
    </Svg>
  );
}

/** A group of three people, deliberately different silhouettes. */
export function GroupIcon(props: IconProps) {
  return (
    <Svg viewBox="0 0 64 40" {...props}>
      <circle cx="32" cy="10" r="7" fill={FOREST} />
      <path d="M18 38C18 26 24 20 32 20C40 20 46 26 46 38Z" fill={FOREST} />
      <circle cx="12" cy="16" r="5.5" fill={BRICK} />
      <path d="M2 38C2 28 6 23 12 23C16 23 19 25 20 28C17 31 16 34 16 38Z" fill={BRICK} />
      <circle cx="52" cy="16" r="5.5" fill={COBALT} />
      <path d="M62 38C62 28 58 23 52 23C48 23 45 25 44 28C47 31 48 34 48 38Z" fill={COBALT} />
    </Svg>
  );
}

/** Folded lootje. */
export function LootjeIcon(props: IconProps) {
  return (
    <Svg viewBox="0 0 48 48" {...props}>
      <path d="M6 20L24 6L42 20L34 42H14Z" fill={PAPER_WHITE} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M6 20L24 28L42 20M24 28V42" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M24 6L24 28" stroke={BRICK} strokeWidth="2" strokeLinecap="round" strokeDasharray="1 4" />
    </Svg>
  );
}

/** Small cobalt strokes — the "Knip & Vier" energy accent. */
export function CobaltDashes(props: IconProps) {
  return (
    <Svg viewBox="0 0 60 30" {...props}>
      <g stroke={COBALT} strokeWidth="4" strokeLinecap="round">
        <path d="M6 24L14 6M24 26L30 4M42 24L52 8" />
      </g>
    </Svg>
  );
}
