import type { ReactNode } from "react";

import { ThemeProvider } from "@/context/theme-context";
import { getSocket } from "@/lib/socket";
import { routeTree } from "@/routeTree.gen";
import { AuthStore } from "@/stores/auth-store";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import { Toaster } from "sonner";

const socket = getSocket();

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
  context: {
    socket,
    authStore: AuthStore,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
    // context: RouterContext;
  }
}

const rootElement = document.getElementById("app")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <ConditionalStrictMode>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
      <Toaster position="top-center" richColors closeButton />
    </ConditionalStrictMode>
  );
}

export function ConditionalStrictMode({ children }: { children: ReactNode }) {
  if (import.meta.env.DEV) {
    return <StrictMode>{children}</StrictMode>;
  }
  return <>{children}</>;
}
