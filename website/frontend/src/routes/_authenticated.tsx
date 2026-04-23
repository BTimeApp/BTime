import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, preload }) => {
    const user = context.authStore.getState().user;
    if (!user || user.userInfo.isGuest) {
      if (!preload) {
        toast.error("Must be logged in to view this resource.");
      }
      throw redirect({ to: "/" });
    }
  },
  component: () => <Outlet />,
});
