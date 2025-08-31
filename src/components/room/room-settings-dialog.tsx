import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import React, { useCallback, useState } from "react";
import RoomSettingsForm from "@/components/room/room-settings-form";
import { useRoomStore } from "@/context/room-context";
import { useParams } from "next/navigation";

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
  ] = useRoomStore((s) => [
    s.roomName,
    s.roomEvent,
    s.roomFormat,
    s.matchFormat,
    s.setFormat,
    s.isPrivate,
    s.nSets,
    s.nSolves,
  ]);

  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;

  const [open, setOpen] = useState<boolean>(false);
  const handleSubmit = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogTitle>Edit Room Settings</DialogTitle>
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
          onUpdateCallback={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
