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
    <Link href="/" className={`logo-component inline-flex items-center gap-2 ${className}`.trim()} aria-label="Recastr home">
      <svg width={dim} height={dim} viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect width="32" height="32" rx="8" fill="currentColor" className="text-white" />
        <text
          x="16"
          y="23"
          fill="#09090b"
          fontSize="20"
          fontWeight="bold"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          R
        </text>
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
      <rect width="32" height="32" rx="8" fill="#ffffff" />
      <text
        x="16"
        y="23"
        fill="#09090b"
        fontSize="20"
        fontWeight="bold"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        R
      </text>
    </svg>
  );
}
