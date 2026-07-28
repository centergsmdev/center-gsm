type LogoProps = { className?: string };

export function InstagramLogo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="instagram-gradient"
          x1="0"
          y1="24"
          x2="24"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFD600" />
          <stop offset=".45" stopColor="#FF0169" />
          <stop offset="1" stopColor="#D300C5" />
        </linearGradient>
      </defs>
      <rect
        x="2.25"
        y="2.25"
        width="19.5"
        height="19.5"
        rx="5.5"
        fill="url(#instagram-gradient)"
      />
      <circle
        cx="12"
        cy="12"
        r="4.2"
        fill="none"
        stroke="white"
        strokeWidth="1.8"
      />
      <circle cx="17.6" cy="6.5" r="1.15" fill="white" />
    </svg>
  );
}

export function FacebookLogo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill="#1877F2" />
      <path
        fill="white"
        d="M13.45 19v-6h2.04l.3-2.35h-2.34v-1.5c0-.68.2-1.14 1.18-1.14h1.25V5.92a17 17 0 0 0-1.82-.1c-1.8 0-3.03 1.1-3.03 3.12v1.72H9v2.35h2.03v6h2.42Z"
      />
    </svg>
  );
}

export function YoutubeLogo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-hidden="true"
    >
      <rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill="#FF0000" />
      <path fill="white" d="m10 8.6 6 3.4-6 3.4V8.6Z" />
    </svg>
  );
}
