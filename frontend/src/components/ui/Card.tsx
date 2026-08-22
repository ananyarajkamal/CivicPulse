import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "primary" | "secondary" | "outline" | "flat";
  padding?: "none" | "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = "primary",
  padding = "md",
  children,
  className = "",
  ...props
}) => {
  const variantStyles = {
    primary: "bg-[#FBFAF7] border border-[#D6CFC3] shadow-civic",
    secondary: "bg-[#EAE4DA]/50 border border-[#D6CFC3]",
    outline: "bg-transparent border border-[#D6CFC3]",
    flat: "bg-[#FBFAF7]",
  }[variant];

  const paddingStyles = {
    none: "p-0",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  }[padding];

  return (
    <div className={`rounded-sm transition-all ${variantStyles} ${paddingStyles} ${className}`} {...props}>
      {children}
    </div>
  );
};
