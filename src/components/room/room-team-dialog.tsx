import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DialogTrigger } from "@radix-ui/react-dialog";
import React, { useCallback, useMemo, useState } from "react";
import { IRoomTeam } from "@/types/room-participant";
import {
  DeleteTeamButton,
  JoinTeamButton,
  LeaveTeamButton,
} from "./team-action-buttons";
import { useSession } from "@/context/session-context";
import { useRoomStore } from "@/context/room-context";

interface RoomTeamDialogProps {
  team: IRoomTeam;
  children: React.ReactNode;
}

/**
 * Dialog that displays info about a room user. Meant to be used only within room and (mainly) for viewing other users' info.
 */
export default function RoomTeamDialog({
  team,
  children,
}: RoomTeamDialogProps) {
  const { user: localUser } = useSession();
  const [users, isUserHost] = useRoomStore((s) => [s.users, s.isUserHost]);

  const isHost = useMemo(() => {
    return isUserHost(localUser?.userInfo.id);
  }, [localUser]);
  const [open, setOpen] = useState<boolean>(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogTitle>Team {team.team.name}</DialogTitle>
        <div className="max-h-[60vh] overflow-y-auto flex flex-row">
          <div className="flex-2 flex flex-col gap-4">
            <div>
              <div className="font-bold">Members:</div>
              {Object.values(team.team.members).map((member) => (
                <div>{users[member]?.user.userName ?? ""}</div>
              ))}
            </div>

            <div className="flex flex-row">
              {/* Regardless of whether user is in a team, ALWAYS show the join button, except if we're on the team. */}
              {localUser ? (
                users[localUser.userInfo.id].currentTeam === team.team.id ? (
                  <LeaveTeamButton className="h-8" teamId={team.team.id} />
                ) : (
                  <JoinTeamButton className="h-8" teamId={team.team.id} />
                )
              ) : (
                <></>
              )}
              {isHost && (
                <DeleteTeamButton className="ml-auto h-8" teamId={team.team.id} />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
