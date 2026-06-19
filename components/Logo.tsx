import Link from "next/link";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const dims = { sm: 24, md: 28, lg: 36 };
const textSize = { sm: "14px", md: "16px", lg: "20px" };

export function Logo({ size = "md", className = "" }: LogoProps) {
  const dim = dims[size];

  return (
    <Link href="/" className={`logo-component ${className}`.trim()} aria-label="Recastr home">
      <svg width={dim} height={dim} viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect width="32" height="32" rx="8" fill="currentColor" className="text-white" />
        <circle cx="16" cy="20" r="2.5" fill="#09090b" />
        <path
          d="M11 15a7 7 0 0110 0"
          stroke="#09090b"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M8 11a12 12 0 0116 0"
          stroke="#09090b"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />
      </svg>
      <span className="logo-text font-semibold tracking-tight" style={{ fontSize: textSize[size] }}>
        Recastr
      </span>
    </Link>
  );
}

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <circle cx="16" cy="20" r="2.5" fill="#09090b" />
      <path
        d="M11 15a7 7 0 0110 0"
        stroke="#09090b"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M8 11a12 12 0 0116 0"
        stroke="#09090b"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}
