"use client";
import Header from "@/components/common/header";
import * as React from 'react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from "react";
import io from "socket.io-client";
import { v4 as uuidv4 } from 'uuid';
import { RoomState, IRoom, RoomEvent, RoomFormat, MatchFormat, SetFormat, MATCH_FORMAT_MAP, SET_FORMAT_MAP } from "@/types/room";
import { IRoomUser } from "@/types/roomUser";
import { ISolve } from "@/types/solve";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import RoomPanel from "@/components/room/room-panel";

let socket: ReturnType<typeof io> | null = null;



export default function Page() {
  const params = useParams<{ roomId: string }>();
  let roomId = params.roomId;
  const [roomName, setRoomName] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [hostId, setHostId] = useState<string>("");
  const [users, setUsers] = useState<IRoomUser[]>([]);
  const [solves, setSolves] = useState<ISolve[][]>([]);
  const [currentSet, setCurrentSet] = useState<number>(1);
  const [currentSolve, setCurrentSolve] = useState<number>(1);
  const [roomEvent, setRoomEvent] = useState<RoomEvent>("333");
  const [roomFormat, setRoomFormat] = useState<RoomFormat>("racing");
  const [matchFormat, setMatchFormat] = useState<MatchFormat>("best_of");
  const [setFormat, setSetFormat] = useState<SetFormat>("best_of");
  const [nSolves, setNSolves] = useState<number>(1);
  const [nSets, setNSets] = useState<number>(1);
  const [roomPrivate, setRoomPrivate] = useState<boolean>(false);
  const [localRoomState, setLocalRoomState] = useState<RoomState>("started");

  //run on mount
  useEffect(() => {
    // Set userId from localStorage or generate new
    let storedId = localStorage.getItem("userId");
    if (!storedId || storedId == "") {
      //any 12-byte sequence is a valid mongoDB id. TODO: replace this with an actual ID from mongoose
      storedId = uuidv4();
      localStorage.setItem("userId", storedId);
    }
    setUserId(storedId);
  }, []);

  //run when mount, run when roomId or userId change
  useEffect(() => {
    if (!userId){
      console.log("No userId detected.");

      //teardown
      return () => {
        socket?.disconnect();
      };
    }
    console.log("User id:", userId);

    if (!socket) {
      socket = io();
    }

    socket.emit("join_room", { roomId, userId });

    socket.on("room_update", (room: IRoom) => {
      setRoomName(room.roomName);
      setUsers(Object.values(room.users));
      setHostId(room.host.toString());
      setSolves(room.solves);
      setCurrentSet(room.currentSet);
      setCurrentSolve(room.currentSolve);
      setRoomEvent(room.roomEvent);
      setRoomFormat(room.roomFormat);
      setMatchFormat(room.matchFormat ? room.matchFormat : "best_of"); //TODO: find a better way 
      setMatchFormat(room.setFormat ? room.setFormat : "best_of"); //TODO: find a better way
      setNSolves(room.nSolves ? room.nSolves : 1);
      setNSets(room.nSets ? room.nSets : 1);
      setRoomPrivate(room.isPrivate);
      setLocalRoomState(room.state);
    });

    //teardown
    return () => {
      socket?.disconnect();
    };
  }, [roomId, userId]);

  //TODO: useEffect for when the currentSet increments...

  function getNextScramble() {
    console.log("get next scramble button clicked");
    return;
  }

  function resetRoom() {
    console.log("reset room button clicked");
    return;
  }

  function RoomHeader() {
    return <Header>
      <RoomHeaderContent roomState={localRoomState} isHost = {hostId == userId}/>
    </Header>
  }

  function RoomHeaderContent({roomState, isHost}: {roomState: RoomState, isHost: boolean}) {
    //TODO - replace with real scramble
    const exampleScramble = "Example Scramble";
    let raceFormatText = "";
    if (roomFormat == 'racing' && roomState == "started") {
      console.log("Racing room");
      raceFormatText = "Format: " + SET_FORMAT_MAP.get(setFormat) + " " + nSolves + " solve" + (nSolves > 1 ? "s" : "");

      if (nSets > 1) { 
        raceFormatText += ", " + MATCH_FORMAT_MAP.get(matchFormat) + " " + nSets + " set" + (nSets > 1 ? "s" : "");
      }
      
    } 

    return (
        <>
          <div className = {cn("grid grid-cols-8 text-center")}>
            <div className = {cn("col-span-1 grid grid-rows-3")}>
              {
                roomState == "started" ?
                <div className = {cn("row-span-1 text-lg")}>
                    Set {currentSet}
                </div>
                :
                <></>
              }
              {
                roomState == "started" && isHost ?
                <div className = {cn("row-span-1 row-start-3")}>
                    <Button
                        variant="outline"
                        size="lg"
                        className={cn("px-1")}
                        onClick={getNextScramble}
                    >
                      <h1 className={cn("font-bold text-center text-md")}>NEXT SCRAMBLE</h1>
                    </Button>
                </div>
                :
                <></>
              }   
              </div>

              <div className = {cn("col-span-6 content-center grid-row")}>
                <h2 className = {cn("text-2xl")}>{exampleScramble}</h2>
                <div className= {cn("text-md")}>{raceFormatText}</div>
              </div>

              <div className = {cn("col-span-1 grid grid-rows-3")}>
              {
                roomState == "started" ?
                <div className = {cn("row-span-1 text-lg")}>
                    Solve {currentSolve}
                </div>
                :
                <></>
              }
              {
                roomState == 'started' && isHost ?
                <div className = {cn("row-span-1 row-start-3")}>
                    <Button
                        variant="reset"
                        size="lg"
                        className={cn("px-1")}
                        onClick={resetRoom}
                    >
                      <h1 className={cn("font-bold text-center text-md")}>RESET ROOM</h1>
                    </Button>
                </div>
                :
                <></>
              }
              </div>
            </div>
        </>
      );
  }

  function RoomContent() {
    switch(localRoomState) {
      case "waiting":
        break;
      case "started":
        break;
      case "finished":
        break;
      default:
        return;
    }
  }

  return (
    <div className = "flex flex-col h-screen">
      <RoomHeader />
      <div className={cn("flex grow")}>
        <RoomPanel className="bg-container-5">
          <h1>LeftPanel placeholder</h1>
        </RoomPanel>
        <RoomPanel>
          <h1>RightPanel placeholder</h1>
        </RoomPanel>
        {/* <div className="text-center grow">
          <h1>RightPanel placeholder</h1>
          <p>Room ID: {roomId}</p>
          <p>Host ID: {hostId}</p>
          <h2>User List:</h2>
          <ul>
            {users.map((u) => (
              //eventually add username...
              <li key={u.user.toString()}>{u.user.toString()}</li>
            ))}
          </ul>
        </div> */}
      </div>
    </div>
  );
};
