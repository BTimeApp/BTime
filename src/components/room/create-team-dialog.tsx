import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import React, { useCallback, useMemo, useState } from "react";
import { CreateTeamForm } from "@/components/room/create-team-form";
import { useRoomStore } from "@/context/room-context";

type RoomSettingsDialogProps = {
  children: React.ReactNode;
};

export default function CreateTeamDialog({
  children,
}: RoomSettingsDialogProps) {
  const [teams, teamSettings] = useRoomStore((s) => [s.teams, s.teamSettings]);
  
  const currTeamsLength = useMemo(() => {
    return Object.values(teams).length;
  }, [teams]);

  const [open, setOpen] = useState<boolean>(false);
  const closeDialogCallback = useCallback(() => {
    setOpen(false);
  }, []);

  if (!teamSettings.teamsEnabled) {
    return <></>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex flex-col">
        <DialogTitle>
          Create Team(s){" "}
          {teamSettings.teamsEnabled && teamSettings.maxNumTeams
            ? `(${currTeamsLength} / ${teamSettings.maxNumTeams})`
            : ""}{" "}
        </DialogTitle>
        {teamSettings.teamsEnabled &&
        teamSettings.maxNumTeams &&
        currTeamsLength >= teamSettings.maxNumTeams ? (
          <div className="text-lg">
            Already at max teams length.
          </div>
        ) : (
          <CreateTeamForm onSubmit={closeDialogCallback} />
        )}

        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}
