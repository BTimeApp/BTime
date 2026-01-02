import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import React, { useCallback, useEffect, useState } from "react";
import RoomSettingsForm from "@/components/room/room-settings-form";
import { useRoomStore } from "@/context/room-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RoomActionsForm from "@/components/room/room-actions-form";
import { useSession } from "@/context/session-context";
import { useSocket } from "@/context/socket-context";
import { SOCKET_SERVER } from "@/types/socket_protocol";

type RoomSettingsDialogProps = {
  children: React.ReactNode;
};

export default function RoomSettingsDialog({
  children,
}: RoomSettingsDialogProps) {
  const roomName = useRoomStore((s) => s.roomName);
  const roomEvent = useRoomStore((s) => s.roomEvent);
  const access = useRoomStore((s) => s.access);
  const raceSettings = useRoomStore((s) => s.raceSettings);
  const teamSettings = useRoomStore((s) => s.teamSettings);
  const maxUsers = useRoomStore((s) => s.maxUsers);
  const isUserHost = useRoomStore((s) => s.isUserHost);

  const [open, setOpen] = useState<boolean>(false);
  const socket = useSocket();

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

  const user = useSession();

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
