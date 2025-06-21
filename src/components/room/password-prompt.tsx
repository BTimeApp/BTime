import { Socket } from "socket.io-client";
import { CallbackInput } from "@/components/ui/input";
import { Button } from "../ui/button";
import { useCallback, useState } from "react";
import { IRoom } from "@/types/room";
type PasswordPromptProps = {
  socket: Socket;
  roomId: string;
  userId: string; //require authenticated user
  passwordValidationCallback: (passwordValid: boolean, roomValid: boolean, room?: IRoom) => void;
};

function PasswordPrompt({ socket, roomId, userId, passwordValidationCallback }: PasswordPromptProps) {
  const [password, setPassword] = useState(""); //local state tracked in input

  const checkPassword = useCallback(() => {
    if (!socket) return;
    //emit a socket event with roomId, userId, password, and onPasswordValid callback.
    socket.emit("join_room", {roomId: roomId, userId: userId, password: password}, passwordValidationCallback);

  }, [socket, password, roomId, userId, passwordValidationCallback]);

  if (!socket.connected) {
    return (
        <div>Socket not connected yet.</div>
    )
  }
  return (
    <div className="flex flex-col">
      <div>This room is password-protected. Please enter password to join:</div>
      <div className="flex flex-row gap-2">
        <CallbackInput
          type="text"
          className="text-center"
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          onEnter={checkPassword}
        />
        <Button
          variant="primary"
          size="sm"
          className="font-bold"
          onClick={checkPassword}
        >
          <div>Submit</div>
        </Button>
      </div>
    </div>
  );
}

export default PasswordPrompt;
