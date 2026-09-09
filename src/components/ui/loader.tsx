import React from "react";

interface LoaderProps {
  text?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const Loader: React.FC<LoaderProps> = ({
  text,
  className = "",
  size = "md",
}) => {
  const scaleClass =
    size === "sm"
      ? "scale-50 origin-center -my-6"
      : size === "lg"
      ? "scale-110 origin-center"
      : "";

  return (
    <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
      <div className={`loading-wave ${scaleClass}`}>
        <div className="loading-bar" />
        <div className="loading-bar" />
        <div className="loading-bar" />
        <div className="loading-bar" />
      </div>
      {text && (
        <p className="text-xs text-slate-500 font-medium tracking-wide mt-3 animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};

export default Loader;
