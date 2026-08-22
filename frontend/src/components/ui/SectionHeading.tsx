import React from "react";

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center" | "right";
  dark?: boolean;
  className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  eyebrow,
  title,
  subtitle,
  align = "left",
  dark = false,
  className = "",
}) => {
  const alignClasses = {
    left: "text-left items-start",
    center: "text-center items-center mx-auto max-w-2xl",
    right: "text-right items-end ml-auto max-w-2xl",
  }[align];

  return (
    <div className={`flex flex-col mb-10 ${alignClasses} ${className}`}>
      {eyebrow && (
        <span
          className={`font-sans text-xs tracking-widest uppercase font-semibold mb-2.5 ${
            dark ? "text-[#B7A58A]" : "text-[#5D5A55]"
          }`}
        >
          {eyebrow}
        </span>
      )}

      <h2
        className={`font-serif-civic text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight ${
          dark ? "text-[#FBFAF7]" : "text-[#161616]"
        }`}
      >
        {title}
      </h2>

      {subtitle && (
        <p
          className={`font-sans text-base sm:text-lg leading-relaxed mt-3.5 ${
            dark ? "text-[#D6CFC3]" : "text-[#5D5A55]"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};
