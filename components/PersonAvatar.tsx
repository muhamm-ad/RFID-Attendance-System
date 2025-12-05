// components/PersonAvatar.tsx
"use client";

import { User } from "lucide-react";

interface PersonAvatarProps {
  photoPath?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
};

export default function PersonAvatar({
  photoPath,
  name,
  size = "md",
  className = "",
}: PersonAvatarProps) {
  const hasPhoto = photoPath && photoPath.trim() !== "";

  return (
    <>
      {hasPhoto ? (
        <img
          src={photoPath}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover border-2 border-gray-200 ${className}`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            const iconContainer =
              target.parentElement?.querySelector(
                ".photo-icon-container"
              ) as HTMLElement;
            if (iconContainer) {
              iconContainer.style.display = "flex";
            }
          }}
        />
      ) : null}
      <div
        className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center photo-icon-container ${
          hasPhoto ? "hidden" : ""
        } ${className}`}
      >
        <User size={iconSizes[size]} className="text-gray-500" />
      </div>
    </>
  );
}

