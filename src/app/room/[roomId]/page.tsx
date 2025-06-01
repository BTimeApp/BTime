"use client";
import Header from "@/components/common/header";
import * as React from 'react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from "react";
import { ObjectId } from "bson";
import { RoomState, IRoom, RoomEvent, RoomFormat, MatchFormat, SetFormat, MATCH_FORMAT_MAP, SET_FORMAT_MAP, getVerboseFormatText } from "@/types/room";
import { IRoomUser } from "@/types/roomUser";
import { ISolve } from "@/types/solve";
import { IUser } from "@/types/user";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import RoomPanel from "@/components/room/room-panel";
import { useSocket } from "@/components/socket/socket";



export default function Page() {
  const params = useParams<{ roomId: string }>();
  let roomId = params.roomId;

  //room-related state
  const [roomName, setRoomName] = useState<string>("");
  const [hostId, setHostId] = useState<string>("");
  const [users, setUsers] = useState<Record<string,IRoomUser>>({});
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
  const [localRoomState, setLocalRoomState] = useState<RoomState>('WAITING');

  //utility states
  const [formatTipText, setFormatTipText] = useState<string>("");
  const [verboseFormatTipText, setVerboseFormatTipText] = useState<string>("");

  //user-related state
  const [userId, setUserId] = useState<string>("");

  //socket state
  const socket = useSocket();

  //retrieve local user ID
  useEffect(() => {
    // Set userId from localStorage or generate new
    let storedId = localStorage.getItem("userId");
    if (!storedId) {
      //any 12-byte sequence is a valid mongoDB id. TODO: replace this with the actual ID fetched from DB
      storedId = new ObjectId().toString();
      localStorage.setItem("userId", storedId);
    }
    setUserId(storedId);
  }, []);

  //set up socket connection, set up socket incoming events
  useEffect(() => {
    socket?.on("room_update", (room: IRoom) => {
      console.log("Updating room state with incoming room update message.")
      setRoomName(room.roomName);
      setUsers(room.users);
      setHostId(room.host._id.toString());
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

    return () => {
      // socketRef.current?.disconnect();
    }
  }, []);

  //join room upon load/change of user/room
  useEffect(() => {
    if (!userId) {
      console.log("Waiting for userId...");
      return;
    }

    // Connect socket to room
    if (socket?.connected) {
      console.log("Socket already connected — emitting join_room");
    } else {
      console.log("Waiting for socket to connect before emitting join_room");
      socket?.on("connect", () => {
        console.log("Socket connected. ")
      });
    }

    //TODO: move user login logic to its own authentication
    const user: IUser = {
      _id: new ObjectId(userId),
      name: "TEST USER",
      email: "TEST_USER@gmail.com",
      userName: userId.toString().slice(-10)
    }
    console.log(user);
    socket?.emit("user_login", { userId, user });

    //only join room upon login
    socket?.on("user_logged_in", () => {
      socket?.emit("join_room", { userId, roomId });
    });

    return () => {
      // Clean up 
      socket?.emit("user_logout", { userId });

      // socketRef.current?.disconnect();
      // socketRef.current = null;
    };
  }, [userId]);

  //update format text based on format changes (there shouldn't be any, but just in case)
  useEffect(() => {
    let raceFormatText = "";
    if (roomFormat == 'racing') {
      raceFormatText = "Format: " + SET_FORMAT_MAP.get(setFormat) + " " + nSolves + " solve" + (nSolves > 1 ? "s" : "");

      if (nSets > 1) { 
        raceFormatText += ", " + MATCH_FORMAT_MAP.get(matchFormat) + " " + nSets + " set" + (nSets > 1 ? "s" : "");
      }
    } 
    setFormatTipText(raceFormatText);

    setVerboseFormatTipText(getVerboseFormatText(roomFormat, matchFormat, setFormat, nSets, nSolves));
  }, [roomFormat, matchFormat, setFormat, nSets, nSolves]);

  //TODO: useEffect for when the currentSet increments...
  //TODO: useEffect for detecting set and match victory

  function getNextScramble() {
    console.log("get next scramble button clicked");
    return;
  }

  function resetRoom() {
    console.log("reset room button clicked");
    socket?.emit("reset_room");
  }

  function userToggleCompeting() {
    console.log("user compete/spectate button clicked");
    socket?.emit("user_toggle_competing");
  }

  function startRoom() {
    //TODO: make sure the user is actually the host
    console.log("start room button clicked");
    socket?.emit("start_room");
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
      case 'WAITING':
        mainContent =  (
          <>
            <h2 className = {cn("text-2xl")}>
              Scramble will display after starting
            </h2>
          </>
        );
        break;
      case 'STARTED':
        mainContent =  (
          <>
            <h2 className = {cn("text-2xl")}>
              {exampleScramble}
            </h2>
            <div className= {cn("text-md")}>{formatTipText}</div>
          </>
        );
      case 'FINISHED':
        break;
      default:
        break;
    }
    
    

    return (
        <>
          <div className = {cn("grid grid-cols-8 text-center")}>
            <div className = {cn("col-span-1 grid grid-rows-3")}>
              {
                roomState == 'STARTED' ?
                <div className = {cn("row-span-1 text-lg")}>
                    Set {currentSet}
                </div>
                :
                <></>
              }
              {
                roomState == 'STARTED' && isHost ?
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
                roomState == 'STARTED' ?
                <div className = {cn("row-span-1 text-lg")}>
                    Solve {currentSolve}
                </div>
                :
                <></>
              }
              {
                roomState == 'STARTED' && isHost ?
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
    const userList = Object.values(users);
    const competingUsers = userList.filter(user => user.competing);
    const spectatingUsers = userList.filter(user => !user.competing);

    switch(roomState) {
      case 'WAITING':
        return (
          <RoomPanel className="bg-container-3 py-3">
            <div>
              <h2 className = "text-2xl">Racers ({competingUsers.length})</h2>
              <ul>
                {competingUsers
                  .map((user, index) => (
                    <li key={index}>{user.user.userName}</li>
                  ))
                }
              </ul>
            </div>
            <div>
              <h2 className = "text-2xl">Spectators ({spectatingUsers.length})</h2>
              <ul>
              {spectatingUsers
                  .map((user, index) => (
                    <li key={index}>{user.user.userName}</li>
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
                  <h1 className={cn("font-bold text-center text-md")}>{users[userId]?.competing ? "SPECTATE" : "COMPETE"}</h1>
                </Button>
              </div>
              <div>
                {isHost ?
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
      case 'STARTED':
        let centerSection;
        if (users[userId].competing) {
          centerSection = (
            <>
              <div>
                Status Tooltip (TODO)
              </div>
              <div>
                Timer (TODO)
              </div>
              <div>
                Penalty buttons (TODO)
              </div>
            </>
          );
        } else {
          centerSection = (
            <>
              <div className={cn("text-xl")}>
                You are spectating. Join to use timer.
              </div>
            </>
          );
        }
        return (
          <RoomPanel className={cn("bg-secondary py-1 gap-2")}>
            <div className={cn("flex flex-row items-center px-3 gap-3")}>
              <div className={cn("text-2xl grow")}>{userId}</div>
              <div className={cn("flex-col justify-center")}>
                <div>
                  Sets
                </div>
                <div>
                  0 
                  {/* TODO: replace with user sets won */}
                </div>
              </div>
              <div className={cn("flex-col justify-center")}>
                <div>
                  Solves
                </div>
                <div>
                  0 
                  {/* TODO: replace with user solves won */}
                </div>
              </div>
            </div>
            <div className={cn("grow flex flex-col justify-center")}>
              {centerSection}
            </div>
            <div className={cn("flex flex-row gap-2 px-2")}>
              <div>
                Inspection Toggle (TODO)
              </div>
              <div>
                Input Mode (TODO)
              </div>

              <div className={cn("ml-auto")}>
                <Button
                    variant="primary"
                    size="default"
                    className={cn("px-1")}
                    onClick={userToggleCompeting}
                >
                  <h1 className={cn("font-bold text-center text-md")}>{users[userId]?.competing ? "SPECTATE" : "COMPETE"}</h1>
                </Button>
              </div>
            </div>
          </RoomPanel>
        );
      case 'FINISHED':
        break;
      default:
        return <></>;
    }
  }

  function RoomRightPanel({roomState, isHost}: {roomState: RoomState, isHost: boolean}) {
    switch (roomState) {
      case 'WAITING':
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
      case 'STARTED':
        //sort by set wins first, then points
        const sortedUsers = Object.values(users).sort((u1, u2) => {
          if (u2.setWins !== u1.setWins) {
            return u2.setWins - u1.setWins;
          } else {
            return u2.points - u1.points;
          }
        });


        return (
          <RoomPanel className="bg-container-2 px-1 py-3">
            <div className = "grid grid-row text-center text-xl">
              <div className = "grid grid-cols-12">
                <div className="col-span-5">Name</div>
                <div className="col-span-3">Time</div>
                <div className="col-span-2">Sets</div>
                <div className="col-span-2">Solves</div>
              </div>
              {sortedUsers.map((user, index) => (
                <div key={index} className="grid grid-cols-12">
                  <div className="col-span-5">{user.user.userName}</div>
                  <div className="col-span-3">{user.userStatus}</div>
                  <div className="col-span-2">{user.setWins}</div>
                  <div className="col-span-2">{user.points}</div>
                </div>
              ))}
            </div>
          </RoomPanel>
        );
      case 'FINISHED':
        break;
      default:
        return <></>
    }
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
