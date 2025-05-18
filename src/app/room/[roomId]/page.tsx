"use client";
import Header from "@/components/common/header";
import RoomHeaderContent from "@/components/room/room-header-content";
import * as React from 'react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from "react";
import io from "socket.io-client";
import { v4 as uuidv4 } from 'uuid';

let socket: ReturnType<typeof io> | null = null;
type RoomHeaderProps = {
  roomId: string;
  isStarted?: boolean; // optional
};

function RoomHeader({roomId, isStarted} : RoomHeaderProps) {
  if (!isStarted) {
    return (
      <Header>
        <RoomHeaderContent
          isStarted={isStarted}
        >
        </RoomHeaderContent>
      </Header>
    )
  }
};

export default function Page() {
  const params = useParams<{ roomId: string }>();
  let roomId = params.roomId;
  const [userId, setUserId] = useState<string>("");
  const [hostId, setHostId] = useState<string>("");
  // const [username, setUsername] = useState<string>("");
  const [users, setUsers] = useState<any[]>([]);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    // Set userId from localStorage or generate new
    let storedId = localStorage.getItem("userId");
    if (!storedId || storedId == "") {
      storedId = uuidv4();
      localStorage.setItem("userId", storedId);
    }
    setUserId(storedId);

  }, []);

  useEffect(() => {
    if (!userId){
      console.log("No userId detected.");
      return;
    }
    console.log("User id:", userId);

    if (!socket) {
      socket = io();
    }

    socket.emit("join-room", { roomId, userId });

    socket.on("room-update", ({users, roomState, hostId}) => {
      setUsers(users);
      setHostId(hostId);
    });

    socket.on("room-started", () => {
      setStarted(true);
    });

    return () => {
      socket?.disconnect();
    };
  }, [roomId, userId]);

  return (
    <>
      <RoomHeader roomId={roomId} />
      <div className="flex">
        <div className="text-center grow">
          <h1>LeftPanel placeholder</h1>
        </div>
        <div className="text-center grow">
          <h1>RightPanel placeholder</h1>
          <p>Room ID: {roomId}</p>
          <p>Host ID: {hostId}</p>
          <h2>User List:</h2>
          <ul>
            {users.map((u) => (
              //eventually add username...
              <li key={u.userId}>{u.userId}</li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
};
