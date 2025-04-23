import React from "react";

// Kidney shaped icon for the Nephra app
export function KidneyIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 5a7 7 0 0 0-5.5 8 7 7 0 0 0 5.5 8M15 5a7 7 0 0 1 5.5 8 7 7 0 0 1-5.5 8" />
      <path d="M12 5v16" />
      <path d="M5 13h14" />
    </svg>
  );
}