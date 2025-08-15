import { useState, useEffect } from "react";

// Enum representing Tailwind breakpoints in ascending order
export enum ScreenSize {
  XS = 0, // < 640px
  SM = 1, // ≥ 640px
  MD = 2, // ≥ 768px
  LG = 3, // ≥ 1024px
  XL = 4, // ≥ 1280px
  _2XL = 5 // ≥ 1536px
}

// Mapping breakpoints to min-width in px, matches Tailwind defaults
const breakpoints = [
  { size: ScreenSize._2XL, minWidth: 1536 },
  { size: ScreenSize.XL, minWidth: 1280 },
  { size: ScreenSize.LG, minWidth: 1024 },
  { size: ScreenSize.MD, minWidth: 768 },
  { size: ScreenSize.SM, minWidth: 640 }
  // XS is anything less than 640, so no minWidth needed
];

export function useScreenSize(): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize>(() => {
    if (typeof window === "undefined") return ScreenSize.XS;
    return getScreenSize(window.innerWidth);
  });

  useEffect(() => {
    function onResize() {
      setScreenSize(getScreenSize(window.innerWidth));
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return screenSize;
}

// Helper function to find ScreenSize from width
function getScreenSize(width: number): ScreenSize {
  for (const bp of breakpoints) {
    if (width >= bp.minWidth) {
      return bp.size;
    }
  }
  return ScreenSize.XS;
}
