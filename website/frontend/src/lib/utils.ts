import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Transforms constant names into abbreviations
 *
 * ex. MY_CONSTANT -> mc
 *
 */
export function abbreviate(name: string) {
  return name
    .split("_")
    .map((_) => _[0])
    .join("")
    .toLowerCase();
}

/**
 * Transforms constant names into display text names
 *
 * ex. MY_CONSTANT -> My constant
 *
 */
export function displayText(name?: string) {
  if (!name) return "";
  const result = name.split("_").map((_) => _.toLowerCase());
  if (result.length > 0)
    result[0] = result[0].charAt(0)?.toUpperCase() + result[0].slice(1);
  return result.join(" ");
}
