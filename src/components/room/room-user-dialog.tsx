import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DialogTrigger } from "@radix-ui/react-dialog";
import React, { useCallback, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IRoomUser } from "@/types/room-user";
import {
  BanUserButton,
  KickUserButton,
  UnbanUserButton,
} from "./user-action-buttons";

interface RoomUserDialogProps {
  user: IRoomUser;
  hostView: boolean;
  children: React.ReactNode;
}

/**
 * Dialog that displays info about a room user. Meant to be used only within room and (mainly) for viewing other users' info.
 */
export default function RoomUserDialog({
  user,
  hostView = false,
  children,
}: RoomUserDialogProps) {
  const [open, setOpen] = useState<boolean>(false);
  const closeDialogCallback = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogTitle>{user.user.userName}</DialogTitle>
        <div className="flex flex-row">
          <div className="flex-1">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user.user.avatarURL ?? "/images/C_logo.png"} />
              <AvatarFallback className="rounded-lg" />
            </Avatar>
          </div>
          <div className="flex-2 flex flex-col">
            {hostView && (
              <div className="flex flex-row justify-self-end justify-end gap-1">
                {user.banned ? (
                  <UnbanUserButton
                    userId={user.user.id}
                    onClick={closeDialogCallback}
                  />
                ) : (
                  <>
                    <KickUserButton
                      userId={user.user.id}
                      onClick={closeDialogCallback}
                    />
                    <BanUserButton
                      userId={user.user.id}
                      onClick={closeDialogCallback}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
