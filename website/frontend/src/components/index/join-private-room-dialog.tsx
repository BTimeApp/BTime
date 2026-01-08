"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogHeader,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "@tanstack/react-router";

type JoinPrivateRoomDialogProps = {
  roomId: string;
  roomName: string;
};

/** This is meant to be used for joining private rooms. Not in use currently b/c private room pages ask to validate anyways. Should update later.
 *
 * @param param0
 * @returns
 */
export default function JoinPrivateRoomDialog({
  roomId,
  roomName,
}: JoinPrivateRoomDialogProps) {
  const navigate = useNavigate();
  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            Join
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Private Room</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">{roomName}</div>
            <div className="grid gap-3">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" placeholder="password" />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="submit"
              onClick={() => {
                navigate({
                  to: "/room/$roomId",
                  params: { roomId },
                });
              }}
            >
              Join Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
