import RoomSettingsForm from "./room-settings-form";
import RoomActionsForm from "@/components/room/room-actions-form";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRoomStore } from "@/context/room-context";
import { SOCKET_SERVER } from "@btime/types";
import { useRouter } from "@tanstack/react-router";
import React, { useCallback, useEffect, useState } from "react";

type RoomSettingsDialogProps = {
  children: React.ReactNode;
};

export default function RoomSettingsDialog({
  children,
}: RoomSettingsDialogProps) {
  const router = useRouter();
  const { socket, authStore } = router.options.context;
  const user = authStore((s) => s.user);

  const roomName = useRoomStore((s) => s.roomName);
  const roomEvent = useRoomStore((s) => s.roomEvent);
  const access = useRoomStore((s) => s.access);
  const raceSettings = useRoomStore((s) => s.raceSettings);
  const teamSettings = useRoomStore((s) => s.teamSettings);
  const maxUsers = useRoomStore((s) => s.maxUsers);
  const isUserHost = useRoomStore((s) => s.isUserHost);

  const [open, setOpen] = useState<boolean>(false);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const closeDialogCallback = useCallback(() => {
    setOpen(false);
  }, []);

  /**
   * Closes the dialog when we recieve success event.
   * Since setting the dialog as open or closed happens here, we have to put the listener here.
   * Cannot use a callback b/c room event.
   */
  useEffect(() => {
    if (!socket) return;
    socket.on(SOCKET_SERVER.UPDATE_ROOM_USER_SUCCESS, closeDialogCallback);

    return () => {
      socket.off(SOCKET_SERVER.UPDATE_ROOM_USER_SUCCESS, closeDialogCallback);
    };
  }, [socket, closeDialogCallback]);

  // this component is only meant to be accessible to the host. Do a sanity check here so we avoid rendering a dangerous form for non-host users
  if (!isUserHost(user?.userInfo.id)) {
    return <></>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogTitle>Room Settings</DialogTitle>

        <Tabs defaultValue="actions">
          <TabsList>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="settings">Edit Room</TabsTrigger>
          </TabsList>
          <TabsContent value="actions">
            <RoomActionsForm onSubmitCallback={closeDialogCallback} />
          </TabsContent>
          <TabsContent value="settings">
            <RoomSettingsForm
              roomName={roomName}
              roomEvent={roomEvent}
              access={access}
              raceSettings={raceSettings}
              teamSettings={teamSettings}
              maxUsers={maxUsers}
              createNewRoom={false}
              className="max-h-[60vh] overflow-y-auto"
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
