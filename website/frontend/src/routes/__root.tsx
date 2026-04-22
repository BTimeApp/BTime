import type { RouterContext } from "@/types/router-context";

import { AppSidebar } from "@/components/sidebar/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getSession } from "@/lib/get-session";
import { generateGuestUser } from "@/lib/guest";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  beforeLoad: async ({ context }: { context: RouterContext }) => {
    const auth = context.authStore.getState();

    if (!auth.hydrated) {
      const user = await getSession().catch(() => null); // simplify error handling

      if (user) {
        // Live OAuth session
        auth.setUser(user);
      } else if (auth.user?.userInfo.isGuest) {
        // Valid persisted guest. reuse & mark hydrated
        auth.setUser(auth.user);
      } else {
        // Cold start or stale OAuth in storage. Create new guest
        const guestUser = generateGuestUser();
        auth.setUser(guestUser);
      }
    }

    //connect socket
    if (!context.socket.connected) {
      context.socket.on("connection", () => {
        console.log("Socket connected!");
      });
      const user = context.authStore.getState().user;
      context.socket.auth = { user };
      context.socket.connect();
    }
  },
});

function RootComponent() {
  return (
    <>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset>
          <SidebarTrigger className="ml-1 mt-1 p-1 text-foreground fixed hover:bg-white/30 transition rounded-md" />
          <Outlet />
        </SidebarInset>
      </SidebarProvider>

      <TanStackRouterDevtools position="bottom-left" />
    </>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex-1 flex flex-col text-center justify-center font-bold text-2xl">
      <span className="flex-0">(404) Page Not Found</span>
    </div>
  );
}
