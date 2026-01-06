import { AppSidebar } from "@/components/sidebar/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { getSession } from "@btime/lib";
import type { RouterContext } from "@/types/router-context";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  beforeLoad: async ({ context }: { context: RouterContext }) => {
    const auth = context.authStore.getState();
    if (auth.hydrated) return;

    try {
      const user = await getSession();
      context.authStore.getState().setUser(user);
    } catch (err) {
      console.warn((err as Error).message);
      context.authStore.getState().setUser(null);
    }

    // connect socket only if logged in
    if (context.authStore.getState().user && !context.socket.connected) {
      // consider putting socket in a store
      context.socket.connect();
    }
  },
});

function RootComponent() {
  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SidebarTrigger className="ml-1 mt-1 p-1 text-foreground fixed hover:bg-white/30 transition rounded-md" />
          <Outlet />
        </SidebarInset>
      </SidebarProvider>

      <TanStackRouterDevtools position="bottom-right" />
    </>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex-1 flex flex-col text-center justify-center font-bold text-2xl">
      <span className="flex-0">Page Not Found</span>
    </div>
  );
}
