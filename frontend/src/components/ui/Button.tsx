import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "text" | "dark";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  children,
  icon,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-sans font-medium tracking-normal transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B7A58A] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

  const sizeStyles = {
    sm: "px-3.5 py-1.5 text-xs rounded-sm gap-1.5",
    md: "px-5 py-2.5 text-sm rounded-sm gap-2",
    lg: "px-7 py-3 text-base rounded-sm gap-2.5",
  }[size];

  const variantStyles = {
    primary:
      "bg-[#B7A58A] text-[#161616] hover:bg-[#A89477] active:bg-[#978468] shadow-sm border border-[#A89477]/30",
    secondary:
      "bg-[#EAE4DA] text-[#161616] hover:bg-[#D7CABA] active:bg-[#C9B9A7] border border-[#D6CFC3]",
    outline:
      "bg-transparent text-[#161616] border border-[#D6CFC3] hover:border-[#292724] hover:bg-[#FBFAF7]/60",
    text:
      "bg-transparent text-[#161616] hover:text-[#5D5A55] hover:bg-[#EAE4DA]/40 px-2 py-1",
    dark:
      "bg-[#292724] text-[#FBFAF7] hover:bg-[#161616] active:bg-[#000000] border border-[#292724] shadow-sm",
  }[variant];

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
