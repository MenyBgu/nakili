type NakiliLogoProps = {
  size?: number;
  title?: string;
};

export function NakiliLogo({ size = 46, title = "נקי-לי" }: NakiliLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id="nakiliLogoGradient" x1="8" y1="5" x2="41" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3F9678" />
          <stop offset="1" stopColor="#205846" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="16" fill="url(#nakiliLogoGradient)" />
      <path
        d="M13 34V14l22 20V14"
        fill="none"
        stroke="#F8FCF6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4.2"
      />
      <path
        d="M34 9.5v5M31.5 12h5"
        fill="none"
        stroke="#F1B95B"
        strokeLinecap="round"
        strokeWidth="2.3"
      />
      <circle cx="13" cy="34" r="2.4" fill="#F1B95B" />
    </svg>
  );
}
