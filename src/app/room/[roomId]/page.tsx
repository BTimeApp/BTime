"use client";
import Header from "@/components/common/header";
import * as React from 'react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from "react";
import io from "socket.io-client";
import { Types } from "mongoose";
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

  //room-related state
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
  const [localRoomState, setLocalRoomState] = useState<RoomState>("waiting");

  //utility states
  const [formatTipText, setFormatTipText] = useState<string>("");
  const [verboseFormatTipText, setVerboseFormatTipText] = useState<string>("");

  //user-related state
  const [userCompeting, setUserCompeting] = useState<boolean>(false);

  //run on mount
  useEffect(() => {
    // Set userId from localStorage or generate new
    let storedId = localStorage.getItem("userId");
    if (!storedId || storedId == "") {
      //any 12-byte sequence is a valid mongoDB id. TODO: replace this with the actual ID fetched from DB
      storedId = new Types.ObjectId().toString();
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
      setSetFormat(room.setFormat ? room.setFormat : "best_of"); //TODO: find a better way
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

  useEffect(() => {
    let raceFormatText = "";
    if (roomFormat == 'racing') {
      raceFormatText = "Format: " + SET_FORMAT_MAP.get(setFormat) + " " + nSolves + " solve" + (nSolves > 1 ? "s" : "");

      if (nSets > 1) { 
        raceFormatText += ", " + MATCH_FORMAT_MAP.get(matchFormat) + " " + nSets + " set" + (nSets > 1 ? "s" : "");
      }
    } 
    setFormatTipText(raceFormatText);

    let verboseRaceFormatText = "";
    if (roomFormat == 'racing') {
      //TODO - make this depend on the format and move logic to types/room.ts
      verboseRaceFormatText = "Win by winning [x] sets.\n";
      verboseRaceFormatText += "Win a set by winning [y] solves.";
    } 
    setVerboseFormatTipText(verboseRaceFormatText);
  }, [roomFormat, matchFormat, setFormat]);

  //TODO: useEffect for when the currentSet increments...
  //TODO: useEffect for detecting set and match victory

  function getNextScramble() {
    console.log("get next scramble button clicked");
    return;
  }

  function resetRoom() {
    console.log("reset room button clicked");
    return;
  }

  function userToggleCompeting() {
    console.log("user compete/spectate button clicked");
    setUserCompeting(!userCompeting);
    //TODO - make this actually change user competing state globally
  }

  function startRoom() {
    //TODO: make sure the user is actually the host
    console.log("start room button clicked");
    setLocalRoomState("started");
  }

  function RoomHeader() {
    return (
      <Header>
        <RoomHeaderContent roomState={localRoomState} isHost = {hostId == userId}/>
      </Header>
    );
  }

  function RoomHeaderContent({roomState, isHost}: {roomState: RoomState, isHost: boolean}) {
    //TODO - replace with real scramble

    let mainContent = <></>;

    const exampleScramble = "Example Scramble";
    
    switch(roomState) {
      case "waiting":
        mainContent =  (
          <>
            <h2 className = {cn("text-2xl")}>
              Scramble will display after starting
            </h2>
          </>
        );
        break;
      case "started":
        mainContent =  (
          <>
            <h2 className = {cn("text-2xl")}>
              {exampleScramble}
            </h2>
            <div className= {cn("text-md")}>{formatTipText}</div>
          </>
        );
      case "finished":
        break;
      default:
        break;
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
                {mainContent}
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

  function RoomLeftPanel({roomState, isHost}: {roomState: RoomState, isHost: boolean}) {
    const competingUsers = users.filter(user => user.competing);
    const spectatingUsers = users.filter(user => !user.competing);

    return (
      <RoomPanel className="bg-container-3 py-3">
        <div>
          <h2 className = "text-2xl">Racers ({competingUsers.length})</h2>
          <ul>
            {competingUsers
              .map((user, index) => (
                <li key={index}>{user.user.toString()}</li>
              ))
            }
          </ul>
        </div>
        <div>
          <h2 className = "text-2xl">Spectators ({spectatingUsers.length})</h2>
          <ul>
          {spectatingUsers
              .map((user, index) => (
                <li key={index}>{user.user.toString()}</li>
              ))
            }
          </ul>
        </div>
        <div className = {cn("mt-auto flex flex-row justify-between px-3 py-1")}>
          <div>
            <Button
                variant="primary"
                size="default"
                className={cn("px-1")}
                onClick={userToggleCompeting}
            >
              <h1 className={cn("font-bold text-center text-md")}>{userCompeting ? "SPECTATE" : "COMPETE"}</h1>
            </Button>
          </div>
          <div>
            {isHost && roomState == "waiting" ?
              <Button
                variant="primary"
                size="default"
                className={cn("px-1")}
                onClick={startRoom}
              >
                <h1 className={cn("font-bold text-center text-md")}>START ROOM</h1>
              </Button> : 
              <></>
            }
          </div>
        </div>
        
      </RoomPanel>
    );
  }

  function RoomRightPanel({roomState, isHost}: {roomState: RoomState, isHost: boolean}) {
    return (
      <RoomPanel className="bg-container-1 px-2 py-3">
        <div>
          <h2 className = {cn("text-2xl md-1")}>Room: {roomId}</h2>
        </div>
        <div className = {cn("text-left")}>
          <h2 className = "text-2xl">Event: {roomEvent}</h2>
        </div>
        <div className = {cn("text-left")}>
          <h2 className = "text-2xl">{formatTipText}</h2>
        </div>
        <div className = {cn("text-left mx-2")}>
            {verboseFormatTipText}
        </div>
      </RoomPanel>
    );
  }

  return (
    <div className = "flex flex-col h-screen">
      <RoomHeader />
      <div className={cn("grid grid-cols-2 grow")}>
        <RoomLeftPanel roomState={localRoomState} isHost={hostId==userId}/>
        <RoomRightPanel roomState={localRoomState} isHost={hostId==userId}/>
      </div>
    </div>
  );
};
