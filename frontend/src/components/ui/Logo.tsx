import React from "react";
import Link from "next/link";

interface LogoProps {
  variant?: "primary" | "compact" | "mark" | "darkFooter";
  size?: "sm" | "md" | "lg";
  className?: string;
  showTagline?: boolean;
}

/**
 * Minimal line-art civic symbol vector icon.
 * Features classical civic building columns, triangular pediment, dome arch,
 * and integrated subtle civic signal line.
 */
export const CivicIcon: React.FC<{ className?: string; color?: string }> = ({
  className = "w-7 h-7",
  color = "currentColor",
}) => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Base Pediment / Dome */}
    <path
      d="M20 5L34 14H6L20 5Z"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 14C14 10.6863 16.6863 8 20 8C23.3137 8 26 10.6863 26 14"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />

    {/* Entablature Line */}
    <line
      x1="8"
      y1="17"
      x2="32"
      y2="17"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />

    {/* Classical Columns */}
    <line
      x1="11"
      y1="17"
      x2="11"
      y2="28"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    <line
      x1="17"
      y1="17"
      x2="17"
      y2="28"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    <line
      x1="23"
      y1="17"
      x2="23"
      y2="28"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    <line
      x1="29"
      y1="17"
      x2="29"
      y2="28"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
    />

    {/* Base Plinth & Pulse Wave */}
    <path
      d="M5 28H14L16.5 25.5L19.5 32.5L22 28H35"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Logo: React.FC<LogoProps> = ({
  variant = "compact",
  size = "md",
  className = "",
  showTagline = false,
}) => {
  const isDark = variant === "darkFooter";

  const sizeClasses = {
    sm: { icon: "w-6 h-6", text: "text-lg", tagline: "text-[10px]" },
    md: { icon: "w-8 h-8", text: "text-2xl", tagline: "text-xs" },
    lg: { icon: "w-10 h-10", text: "text-3xl", tagline: "text-sm" },
  }[size];

  if (variant === "mark") {
    return (
      <Link href="/" className={`inline-flex items-center ${className}`}>
        <CivicIcon
          className={sizeClasses.icon}
          color={isDark ? "#B7A58A" : "#292724"}
        />
        <span className="sr-only">CivicPulse</span>
      </Link>
    );
  }

  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B7A58A] rounded-sm ${className}`}
    >
      <div
        className={`p-1.5 rounded transition-colors ${
          isDark
            ? "bg-[#292724] text-[#B7A58A] group-hover:text-[#F5F1E8]"
            : "bg-[#EAE4DA]/60 text-[#292724] group-hover:bg-[#EAE4DA]"
        }`}
      >
        <CivicIcon
          className={sizeClasses.icon}
          color={isDark ? "#B7A58A" : "#292724"}
        />
      </div>

      <div className="flex flex-col justify-center leading-none">
        <span
          className={`font-serif-civic font-bold tracking-tight ${
            sizeClasses.text
          } ${isDark ? "text-[#FBFAF7]" : "text-[#161616]"}`}
        >
          Civic<span className={isDark ? "text-[#B7A58A]" : "text-[#5D5A55]"}>Pulse</span>
        </span>

        {(showTagline || variant === "primary") && (
          <span
            className={`font-sans tracking-wide uppercase font-medium mt-0.5 ${
              sizeClasses.tagline
            } ${isDark ? "text-[#D6CFC3]" : "text-[#5D5A55]"}`}
          >
            Stronger Cities. Together.
          </span>
        )}
      </div>
    </Link>
  );
};
