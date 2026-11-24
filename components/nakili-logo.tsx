import { useId } from "react";

type NakiliLogoProps = {
  size?: number;
  title?: string;
};

const shapes = {
  regular: {
    house: "M120 250 256 136l136 114v118a40 40 0 0 1-40 40H160a40 40 0 0 1-40-40Z",
    houseStroke: 30,
    check: "m192 300 44 44 88-92",
    checkStroke: 34,
    sparkle: "M396 74c7 30 17 40 47 47-30 7-40 17-47 47-7-30-17-40-47-47 30-7 40-17 47-47Z",
  },
  bold: {
    house: "M104 252 256 126l152 126v124a40 40 0 0 1-40 40H144a40 40 0 0 1-40-40Z",
    houseStroke: 44,
    check: "m180 302 50 50 104-108",
    checkStroke: 50,
    sparkle: "M410 52c8 36 20 48 56 56-36 8-48 20-56 56-8-36-20-48-56-56 36-8 48-20 56-56Z",
  },
};

export function NakiliLogo({ size = 46, title = "נקי-לי" }: NakiliLogoProps) {
  const id = useId().replace(/:/g, "");
  const shape = size >= 64 ? shapes.regular : shapes.bold;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="60" y1="20" x2="452" y2="492" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4DB38D" />
          <stop offset=".52" stopColor="#2C7A62" />
          <stop offset="1" stopColor="#174536" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="190" y1="250" x2="330" y2="370" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE3A3" />
          <stop offset="1" stopColor="#F2AE45" />
        </linearGradient>
        <radialGradient
          id={`${id}-glow`}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(150 96) rotate(50) scale(330)"
        >
          <stop stopColor="#fff" stopOpacity=".22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="512" height="512" rx="118" fill={`url(#${id}-bg)`} />
      <rect width="512" height="512" rx="118" fill={`url(#${id}-glow)`} />
      <path d={shape.house} fill="#fff" fillOpacity=".12" />
      <path d={shape.house} fill="none" stroke="#F7FCF8" strokeWidth={shape.houseStroke} strokeLinejoin="round" />
      <path
        d={shape.check}
        fill="none"
        stroke={`url(#${id}-gold)`}
        strokeWidth={shape.checkStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d={shape.sparkle} fill="#FFE3A3" />
      {shape === shapes.regular && <circle cx="440" cy="190" r="11" fill="#FFE3A3" fillOpacity=".75" />}
    </svg>
  );
}
