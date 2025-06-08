"use client";
import Header from "@/components/common/header";
import * as React from "react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ObjectId } from "bson";
import {
  RoomState,
  IRoom,
  RoomEvent,
  RoomFormat,
  MatchFormat,
  SetFormat,
  MATCH_FORMAT_MAP,
  SET_FORMAT_MAP,
  getVerboseFormatText,
} from "@/types/room";
import { IRoomUser } from "@/types/roomUser";
import { Penalty, Result } from "@/types/result";
import { IUser } from "@/types/user";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import RoomPanel from "@/components/room/room-panel";
import { useSocket } from "@/components/socket/socket";
import { CallbackInput } from "@/components/ui/input";
import { SolveStatus } from "@/types/status";
import { TimerType } from "@/types/timerType";
import { IRoomSolve } from "@/types/roomSolve";

export default function Page() {
  const params = useParams<{ roomId: string }>();
  let roomId = params.roomId;

  //room-related state
  const [roomName, setRoomName] = useState<string>("");
  const [hostId, setHostId] = useState<string>("");
  const [users, setUsers] = useState<Record<string, IRoomUser>>({});
  const [solves, setSolves] = useState<IRoomSolve[]>([]);
  const [currentSet, setCurrentSet] = useState<number>(1);
  const [currentSolve, setCurrentSolve] = useState<number>(0);
  const [roomEvent, setRoomEvent] = useState<RoomEvent>("333");
  const [roomFormat, setRoomFormat] = useState<RoomFormat>("racing");
  const [matchFormat, setMatchFormat] = useState<MatchFormat>("best_of");
  const [setFormat, setSetFormat] = useState<SetFormat>("best_of");
  const [nSolves, setNSolves] = useState<number>(1);
  const [nSets, setNSets] = useState<number>(1);
  const [roomPrivate, setRoomPrivate] = useState<boolean>(false);
  const [localRoomState, setLocalRoomState] = useState<RoomState>("WAITING");
  const [roomWinners, setRoomWinners] = useState<string[]>([]);

  //utility states
  const [formatTipText, setFormatTipText] = useState<string>("");
  const [verboseFormatTipText, setVerboseFormatTipText] = useState<string>("");
  const [localResult, setLocalResult] = useState<Result>(new Result("")); //consider using a reducer
  const [timerType, setTimerType] = useState<TimerType>("TYPING");

  //user-related state
  const [userId, setUserId] = useState<string>("");
  const [userIsHost, setUserIsHost] = useState<boolean>(false);
  const [userStatus, setUserStatus] = useState<SolveStatus>("IDLE");

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
      console.log("Updating room state with incoming room update message.");
      // console.log(room);
      setRoomName(room.roomName);
      setUsers(room.users);
      setHostId(room.host.id.toString());
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
      setRoomWinners(room.winners || []);
    });

    socket?.on("solve_finished", () => {
      handleSolveFinishedEvent();
    });

    return () => {
      // socketRef.current?.disconnect();
    };
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
        console.log("Socket connected. ");
      });
    }

    //TODO: move user login logic to its own authentication
    const user: IUser = {
      id: new ObjectId(userId).toString(),
      name: "TEST USER",
      email: "TEST_USER@gmail.com",
      userName: "TEST USER",
    };
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

  //update user is host whenever userId or hostId update
  useEffect(() => {
    setUserIsHost(userId == hostId);
  }, [userId, hostId]);

  //update format text based on format changes (there shouldn't be any, but just in case)
  useEffect(() => {
    let raceFormatText = "";
    if (roomFormat == "RACING") {
      raceFormatText =
        "Format: " +
        SET_FORMAT_MAP.get(setFormat) +
        " " +
        nSolves +
        " solve" +
        (nSolves > 1 ? "s" : "");

      if (nSets > 1) {
        raceFormatText +=
          ", " +
          MATCH_FORMAT_MAP.get(matchFormat) +
          " " +
          nSets +
          " set" +
          (nSets > 1 ? "s" : "");
      }
    }
    setFormatTipText(raceFormatText);

    setVerboseFormatTipText(
      getVerboseFormatText(roomFormat, matchFormat, setFormat, nSets, nSolves)
    );
  }, [roomFormat, matchFormat, setFormat, nSets, nSolves]);

  useEffect(() => {
    switch (localRoomState) {
      case "WAITING":
        setUserStatus("IDLE");
        break;
      case "STARTED":
        switch (timerType) {
          case "TYPING":
            setUserStatus("SOLVING");
          default:
            break;
        }
        break;
      case "FINISHED":
        setUserStatus("IDLE");
        break;
      default:
        break;
    }
  }, [localRoomState]);

  useEffect(() => {
    // console.log("new user status", userStatus);
    socket?.emit("user_update_status", userStatus);
  }, [userStatus]);

  function getNextScramble() {
    if (userIsHost) {
      console.log("get next scramble button clicked");
      socket?.emit("skip_scramble");
    }
  }

  function resetRoom() {
    if (userIsHost) {
      console.log("reset room button clicked");
      socket?.emit("reset_room");
    }
  }

  /**
   * Toggles user spectating/competing
   */
  function userToggleCompetingSpectating(competing: boolean) {
    console.log("user compete button clicked");
    socket?.emit("user_toggle_competing_spectating", competing);
    if (competing) {
      handleTimerStateTransition();
    } else {
      setUserStatus("SPECTATING");
    }
  }

  function startRoom() {
    if (userIsHost) {
      console.log("start room button clicked");
      socket?.emit("start_room");
    }
  }

  function rematchRoom() {
    if (userIsHost) {
      console.log("rematch room button clicked");
      socket?.emit("rematch_room");
    }
  }

  /**
   * Advances the state machine for the local timer
   */
  function handleTimerStateTransition() {
    if (localRoomState !== "STARTED") {
      console.log(
        "Timer State Transition called in the wrong room state. Ignoring call."
      );
    } else {
      switch (timerType) {
        case "TYPING":
          switch (userStatus) {
            case "SOLVING":
              setUserStatus("SUBMITTING");
              break;
            case "SUBMITTING":
              setUserStatus("FINISHED");
              break;
            case "FINISHED":
              setUserStatus("SOLVING");
              break;
            case "SPECTATING":
              setUserStatus("SOLVING");
              break;
            default:
              break;
          }
          break;
        default:
          break;
      }
    }
  }

  /**
   * Goes back one user status in the state transitions (if in the applicable state). This allows users to correct misscrambles, typos, etc.
   */
  function redoSolve() {
    if (localRoomState !== "STARTED") {
      console.log(
        "Timer redoSolve() called in the wrong room state. Ignoring call."
      );
    } else {
      if (users[userId].competing) {
        switch (timerType) {
          case "TYPING":
            setUserStatus("SOLVING");
            return;
          default:
            return;
        }
      }
      //otherwise, do nothing - user is spectating and status does not need to be updated
    }
  }

  /**
   * Update relevant local states if the server says that the solve is finished
   */
  function handleSolveFinishedEvent() {
    switch (timerType) {
      case "TYPING":
        setUserStatus("SOLVING");
        break;
      default:
        setUserStatus("IDLE");
        break;
    }
  }

  //handles submitting the local result to the server. DOES NOT HANDLE STATE TRANSITIONS.
  function submitLocalResult() {
    socket?.emit("user_submit_result", localResult.toIResult());
  }

  function RoomHeader() {
    return (
      <Header>
        <RoomHeaderContent roomState={localRoomState} isHost={userIsHost} />
      </Header>
    );
  }

  function RoomHeaderContent({
    roomState,
    isHost,
  }: {
    roomState: RoomState;
    isHost: boolean;
  }) {
    let mainContent = <></>;

    switch (roomState) {
      case "WAITING":
        mainContent = (
          <>
            <h2 className={cn("text-2xl")}>
              Scramble will display after starting
            </h2>
          </>
        );
        break;
      case "STARTED":
        const scramble =
          currentSolve > 0
            ? solves.at(-1)!.solve.scramble
            : "";
        mainContent = (
          <>
            <h2 className={cn("text-2xl")}>{scramble}</h2>
            <div className={cn("text-md")}>{formatTipText}</div>
          </>
        );
        break;
      case "FINISHED":
        mainContent = (
          <>
            <h2 className={cn("text-2xl")}>Room has finished!</h2>
          </>
        );
        break;
      default:
        break;
    }

    return (
      <>
        <div className={cn("grid grid-cols-8 text-center")}>
          <div className={cn("col-span-1 grid grid-rows-3")}>
            {roomState == "STARTED" ? (
              <div className={cn("row-span-1 text-lg")}>Set {currentSet}</div>
            ) : (
              <></>
            )}
            {roomState == "STARTED" && isHost ? (
              <div className={cn("row-span-1 row-start-3")}>
                <Button
                  variant="outline"
                  size="lg"
                  className={cn("px-1")}
                  onClick={getNextScramble}
                >
                  <h1 className={cn("font-bold text-center text-md")}>
                    NEXT SCRAMBLE
                  </h1>
                </Button>
              </div>
            ) : (
              <></>
            )}
          </div>

          <div className={cn("col-span-6 content-center grid-row")}>
            {mainContent}
          </div>

          <div className={cn("col-span-1 grid grid-rows-3")}>
            {roomState == "STARTED" ? (
              <div className={cn("row-span-1 text-lg")}>
                Solve {currentSolve}
              </div>
            ) : (
              <></>
            )}
            {roomState == "STARTED" && isHost ? (
              <div className={cn("row-span-1 row-start-3")}>
                <Button
                  variant="reset"
                  size="lg"
                  className={cn("px-1")}
                  onClick={resetRoom}
                >
                  <h1 className={cn("font-bold text-center text-md")}>
                    RESET ROOM
                  </h1>
                </Button>
              </div>
            ) : (
              <></>
            )}
          </div>
        </div>
      </>
    );
  }

  function RoomLeftPanel({
    roomState,
    isHost,
  }: {
    roomState: RoomState;
    isHost: boolean;
  }) {
    const userList = Object.values(users);
    const competingUsers = userList.filter((user) => user.competing);
    const spectatingUsers = userList.filter((user) => !user.competing);

    switch (roomState) {
      case "WAITING":
        return (
          <RoomPanel className="bg-container-3 py-3">
            <div>
              <h2 className="text-2xl">Racers ({competingUsers.length})</h2>
              <ul>
                {competingUsers.map((user, index) => (
                  <li key={index}>{user.user.userName}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl">
                Spectators ({spectatingUsers.length})
              </h2>
              <ul>
                {spectatingUsers.map((user, index) => (
                  <li key={index}>{user.user.userName}</li>
                ))}
              </ul>
            </div>
            <div
              className={cn("mt-auto flex flex-row justify-between px-3 py-1")}
            >
              <div>
                <Button
                  variant="primary"
                  size="default"
                  className={cn("px-1")}
                  onClick={() => {
                    userToggleCompetingSpectating(!users[userId]?.competing);
                  }}
                >
                  <h1 className={cn("font-bold text-center text-md")}>
                    {users[userId]?.competing ? "SPECTATE" : "COMPETE"}
                  </h1>
                </Button>
              </div>
              <div>
                {isHost ? (
                  <Button
                    variant="primary"
                    size="default"
                    className={cn("px-1")}
                    onClick={startRoom}
                  >
                    <h1 className={cn("font-bold text-center text-md")}>
                      START ROOM
                    </h1>
                  </Button>
                ) : (
                  <></>
                )}
              </div>
            </div>
          </RoomPanel>
        );
      case "STARTED":
        let centerSection;
        function handleInput(value: string): void {
          setLocalResult(new Result(value, "OK"));
          handleTimerStateTransition();
        }
        function getTimer() {
          switch (timerType) {
            case "TYPING":
              switch (userStatus) {
                case "SOLVING":
                  return (
                    <CallbackInput
                      type="text"
                      className="text-center"
                      onEnter={handleInput}
                    />
                  );
                case "SUBMITTING":
                  return (
                    <div className="text-xl">{localResult.toString()}</div>
                  );
                case "FINISHED":
                default:
                  return (
                    <>
                      <div>Waiting for others to finish</div>
                    </>
                  );
              }
          }
        }
        function handlePenalty(penalty: Penalty) {
          //just calling setPenalty will not trigger a re-render
          setLocalResult(new Result(localResult.getTime(), penalty));
        }
        function submitResult() {
          handleTimerStateTransition();
          submitLocalResult();
        }
        function getButtons() {
          switch (timerType) {
            case "TYPING":
              switch (userStatus) {
                case "SUBMITTING":
                  return (
                    <div className="mx-auto flex flex-row gap-2 px-2">
                      <Button
                        variant="destructive"
                        size="xs"
                        className={cn("")}
                        onClick={() => {
                          redoSolve();
                        }}
                      >
                        <h1 className={cn("font-bold text-center text-md")}>
                          REDO
                        </h1>
                      </Button>
                      <Button
                        variant="destructive"
                        size="xs"
                        className={cn("")}
                        onClick={() => {
                          handlePenalty("OK");
                        }}
                      >
                        <h1 className={cn("font-bold text-center text-md")}>
                          OK
                        </h1>
                      </Button>
                      <Button
                        variant="destructive"
                        size="xs"
                        className={cn("")}
                        onClick={() => {
                          handlePenalty("+2");
                        }}
                      >
                        <h1 className={cn("font-bold text-center text-md")}>
                          +2
                        </h1>
                      </Button>
                      <Button
                        variant="destructive"
                        size="xs"
                        className={cn("")}
                        onClick={() => {
                          handlePenalty("DNF");
                        }}
                      >
                        <h1 className={cn("font-bold text-center text-md")}>
                          DNF
                        </h1>
                      </Button>
                      <Button
                        variant="destructive"
                        size="xs"
                        className={cn("")}
                        onClick={() => {
                          submitResult();
                        }}
                      >
                        <h1 className={cn("font-bold text-center text-md")}>
                          SUBMIT
                        </h1>
                      </Button>
                    </div>
                  );
                default:
                  return <></>;
              }
          }
        }

        if (users[userId].competing) {
          centerSection = (
            <>
              {/* <div>
                TODO - write timer tooltip text
              </div> */}
              <div className="mx-auto">{getTimer()}</div>
              {getButtons()}
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
                <div>Sets</div>
                <div>{users[userId].setWins}</div>
              </div>
              <div className={cn("flex-col justify-center")}>
                {/* TODO - conditionally render this stuff based on set format */}
                <div>Solves</div>
                <div>{users[userId].points}</div>
              </div>
            </div>
            <div className={cn("grow flex flex-col justify-center")}>
              {centerSection}
            </div>
            <div className={cn("flex flex-row gap-2 px-2")}>
              <div>Inspection Toggle (TODO)</div>
              <div>Input Mode (TODO)</div>

              <div className={cn("ml-auto")}>
                <Button
                  variant="primary"
                  size="default"
                  className={cn("px-1")}
                  onClick={() => {
                    userToggleCompetingSpectating(!users[userId]?.competing);
                  }}
                >
                  <h1 className={cn("font-bold text-center text-md")}>
                    {users[userId]?.competing ? "SPECTATE" : "COMPETE"}
                  </h1>
                </Button>
              </div>
            </div>
          </RoomPanel>
        );
      case "FINISHED":
        const winningUserNames = roomWinners;
        return (
          <RoomPanel className="bg-container-3 py-3">
            <div>
              {winningUserNames.length > 1 ? (
                <>
                  <h2 className="text-2xl">
                    Winners ({winningUserNames.length})
                  </h2>
                  <ul>
                    {winningUserNames.map((username, index) => (
                      <li key={index}>{username}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <h2 className="text-2xl">Winner: {winningUserNames[0]}</h2>
                </>
              )}
            </div>
            <div>
              <h2 className="text-2xl">Racers ({competingUsers.length})</h2>
              <ul>
                {competingUsers.map((user, index) => (
                  <li key={index}>{user.user.userName}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl">
                Spectators ({spectatingUsers.length})
              </h2>
              <ul>
                {spectatingUsers.map((user, index) => (
                  <li key={index}>{user.user.userName}</li>
                ))}
              </ul>
            </div>
            <div
              className={cn("mt-auto flex flex-row justify-between px-3 py-1")}
            >
              <div>
                <Button
                  variant="primary"
                  size="default"
                  className={cn("px-1")}
                  onClick={() => {
                    userToggleCompetingSpectating(!users[userId]?.competing);
                  }}
                >
                  <h1 className={cn("font-bold text-center text-md")}>
                    {users[userId]?.competing ? "SPECTATE" : "COMPETE"}
                  </h1>
                </Button>
              </div>
              <div>
                {isHost ? (
                  <Button
                    variant="primary"
                    size="default"
                    className={cn("px-1")}
                    onClick={() => {
                      rematchRoom();
                    }}
                  >
                    <h1 className={cn("font-bold text-center text-md")}>
                      REMATCH
                    </h1>
                  </Button>
                ) : (
                  <></>
                )}
              </div>
            </div>
          </RoomPanel>
        );
      default:
        return <></>;
    }
  }

  function RoomRightPanel({
    roomState,
    isHost,
  }: {
    roomState: RoomState;
    isHost: boolean;
  }) {
    switch (roomState) {
      case "WAITING":
      //fallthrough logic
      case "FINISHED":
        return (
          <RoomPanel className="bg-container-1 px-2 py-3">
            <div>
              <h2 className={cn("text-2xl md-1")}>Room: {roomId}</h2>
            </div>
            <div className={cn("text-left")}>
              <h2 className="text-2xl">Event: {roomEvent}</h2>
            </div>
            <div className={cn("text-left")}>
              <h2 className="text-2xl">{formatTipText}</h2>
            </div>
            <div className={cn("text-left mx-2")}>{verboseFormatTipText}</div>
          </RoomPanel>
        );
      case "STARTED":
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
            <div className="grid grid-row text-center text-xl">
              <div className="grid grid-cols-12">
                <div className="col-span-5">Name</div>
                <div className="col-span-3">Time</div>
                <div className="col-span-2">Sets</div>
                <div className="col-span-2">Solves</div>
              </div>
              {sortedUsers.map((user, index) => (
                <div key={index} className="grid grid-cols-12">
                  <div className="col-span-5">{user.user.userName}</div>
                  <div className="col-span-3">
                    {user.userStatus == "FINISHED" && user.currentResult
                      ? Result.fromIResult(user.currentResult).toString()
                      : user.userStatus}
                  </div>
                  <div className="col-span-2">{user.setWins}</div>
                  <div className="col-span-2">{user.points}</div>
                </div>
              ))}
            </div>
          </RoomPanel>
        );
      default:
        return <></>;
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <RoomHeader />
      <div className={cn("grid grid-cols-2 grow")}>
        <RoomLeftPanel roomState={localRoomState} isHost={userIsHost} />
        <RoomRightPanel roomState={localRoomState} isHost={userIsHost} />
      </div>
    </div>
  );
}
