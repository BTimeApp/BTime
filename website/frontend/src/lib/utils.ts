import { clsx, type ClassValue } from "clsx";
import { toast } from "sonner";
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

// copied from @btime/types internal
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function literalKeys<T extends Record<string, any>>(obj: T) {
  return Object.keys(obj) as Array<keyof T & string>;
}

export async function copyTextToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied text to clipboard.");
  } catch (err) {
    toast.error(`Failed to copy text to clipboard: ${err}`);
  }
}

export function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();

  URL.revokeObjectURL(link.href);
}
