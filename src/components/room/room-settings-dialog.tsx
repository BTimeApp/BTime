import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import React, { useCallback, useState } from "react";
import RoomSettingsForm from "@/components/room/room-settings-form";
import { useRoomStore } from "@/context/room-context";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RoomActionsForm from "@/components/room/room-actions-form";
import { useSession } from "@/context/session-context";

type RoomSettingsDialogProps = {
  children: React.ReactNode;
};

export default function RoomSettingsDialog({
  children,
}: RoomSettingsDialogProps) {
  const [
    roomName,
    roomEvent,
    roomFormat,
    matchFormat,
    setFormat,
    isPrivate,
    nSets,
    nSolves,
    isUserHost
  ] = useRoomStore((s) => [
    s.roomName,
    s.roomEvent,
    s.roomFormat,
    s.matchFormat,
    s.setFormat,
    s.isPrivate,
    s.nSets,
    s.nSolves,
    s.isUserHost
  ]);

  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;

  const [open, setOpen] = useState<boolean>(false);
  const closeDialogCallback = useCallback(() => {
    setOpen(false);
  }, []);

  const {user} = useSession();

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
            <RoomActionsForm onSubmitCallback={closeDialogCallback}/>
          </TabsContent>
          <TabsContent value="settings">
            <RoomSettingsForm
              roomName={roomName}
              roomEvent={roomEvent}
              roomFormat={roomFormat}
              matchFormat={matchFormat}
              setFormat={setFormat}
              isPrivate={isPrivate}
              nSets={nSets}
              nSolves={nSolves}
              roomId={roomId}
              createNewRoom={false}
              onUpdateCallback={closeDialogCallback}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
