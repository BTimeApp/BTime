import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "scramble-display": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        className?: string;
        event?:
          | null
          | string;
        visualization?: null | "2D" | "3D";
        scramble?: string;
        visualization?: boolean;
      };
    }
  }
}
