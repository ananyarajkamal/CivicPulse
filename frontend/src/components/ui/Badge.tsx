import React from "react";

export interface BadgeProps {
  variant?:
    | "reported"
    | "assigned"
    | "in_progress"
    | "resolved"
    | "critical"
    | "high"
    | "medium"
    | "low"
    | "neutral";
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  children,
  className = "",
}) => {
  const variantStyles = {
    reported: "bg-[#EAE4DA] text-[#5D5A55] border-[#D6CFC3]",
    assigned: "bg-[#D6CFC3]/50 text-[#292724] border-[#B7A58A]",
    in_progress: "bg-[#D7CABA] text-[#292724] border-[#B7A58A]",
    resolved: "bg-[#EAE4DA] text-[#292724] border-[#B7A58A]",
    critical: "bg-[#EAE4DA] text-[#292724] font-semibold border-[#292724]",
    high: "bg-[#EAE4DA] text-[#292724] border-[#D6CFC3]",
    medium: "bg-[#FBFAF7] text-[#5D5A55] border-[#D6CFC3]",
    low: "bg-[#FBFAF7] text-[#5D5A55] border-[#D6CFC3]",
    neutral: "bg-[#FBFAF7] text-[#5D5A55] border-[#D6CFC3]",
  }[variant];

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap shrink-0 px-2.5 py-0.5 text-xs font-sans font-medium tracking-wide uppercase border rounded-xs ${variantStyles} ${className}`}
    >
      {children}
    </span>
  );
};
