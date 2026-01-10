import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      //   "scramble-display": React.DetailedHTMLProps<
      //     React.HTMLAttributes<HTMLElement>,
      //     HTMLElement
      //   > & {
      //     className?: string;
      //     event?:
      //       | null
      //       | string;
      //     visualization?: null | "2D" | "3D";
      //     scramble?: string;
      //     visualization?: boolean;
      //   };
      "twisty-player": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        alg?: string;
        "experimental-setup-alg"?: string;
        "experimental-setup-anchor"?: null | "start" | "end";
        puzzle: null | string;
        visualization?:
          | "3D"
          | "2D"
          | "experimental-2D-LL"
          | "experimental-2D-LL-face"
          | "PG3D";
        "hint-facelets"?: "floating" | "none";
        "experimental-stickering"?:
          | "full"
          | "OLL"
          | "PLL"
          | "LL"
          | "EOLL"
          | "COLL"
          | "OCLL"
          | "CPLL"
          | "CLL"
          | "EPLL"
          | "ELL"
          | "ZBLL"
          | "LS"
          | "LSOLL"
          | "LSOCLL"
          | "ELS"
          | "CLS"
          | "ZBLS"
          | "VLS"
          | "WVLS"
          | "F2L"
          | "Daisy"
          | "Cross"
          | "EO"
          | "EOline"
          | "EOcross"
          | "FirstBlock"
          | "SecondBlock"
          | "CMLL"
          | "LSE"
          | "L10P"
          | "L6E"
          | "L6EO"
          | "2x2x2"
          | "2x2x3"
          | "EODF"
          | "G1"
          | "L2C"
          | "OBL"
          | "PBL"
          | "Void Cube"
          | "Invisible"
          | "picture"
          | "centers-only"
          | "opposite-centers"
          | "experimental-centers-U"
          | "experimental-centers-U-D"
          | "experimental-centers-U-L-D"
          | "experimental-centers-U-L-B-D"
          | "experimental-centers"
          | "experimental-fto-fc"
          | "experimental-fto-f2t"
          | "experimental-fto-fc"
          | "experimental-fto-sc"
          | "experimental-fto-l2c"
          | "experimental-fto-lbt"
          | "experimental-fto-l3t";
        background?: "checkered" | "checkered-transparent" | "none";
        "control-panel"?: "bottom-row" | "none";
        "back-view"?: "none" | "side-by-side" | "top-right";
        "experimental-drag-input"?: "auto" | "none";
        "viewer-link"?: "twizzle" | "experimental-twizzle-explorer" | "none";
        "camera-latitude"?: number;
        "camera-longitude"?: number;
        "camera-latitude-limit"?: number;
      };
    }
  }
}
