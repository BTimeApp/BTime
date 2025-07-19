"use client";
import CreateRoomHeader from "@/components/create/create-header-content";
import CreateRoomButton from "@/components/create/create-room-button";
import CreateRoomDropdown from "@/components/create/create-dropdowns";
import CreateSubtitle from "@/components/create/create-subtitle";
import Header from "@/components/common/header";
import CreateInput from "@/components/create/create-input";
import CreateToggleButton from "@/components/create/create-toggle";
import { useState, useEffect, useMemo } from "react";
import { useSession } from "@/context/sessionContext";
import { useSocket } from "@/context/socketContext";
import {
  IRoomSettings,
  MatchFormat,
  RoomEvent,
  RoomFormat,
  SetFormat,
} from "@/types/room";

const ROOM_FORMAT_OPTIONS = ["Racing", "Casual"]; // add more
const ROOM_FORMAT_DISPLAY_TO_VALUE = new Map<string, RoomFormat>([
  ["Casual", "CASUAL"],
  ["Racing", "RACING"],
]);
const EVENT_OPTIONS = [
  "3x3",
  "2x2",
  "4x4",
  "5x5",
  "6x6",
  "7x7",
  "Megaminx",
  "Pyraminx",
  "Skewb",
  "Clock",
  "Square-1",
  "3x3 OH",
  "3x3 BLD",
  "4x4 BLD",
  "5x5 BLD",
];

const EVENT_DISPLAY_TO_VALUE = new Map<string, RoomEvent>([
  ["3x3", "333"],
  ["2x2", "222"],
  ["4x4", "444"],
  ["5x5", "555"],
  ["6x6", "666"],
  ["7x7", "777"],
  ["Megaminx", "megaminx"],
  ["Pyraminx", "pyraminx"],
  ["Skewb", "skewb"],
  ["Clock", "clock"],
  ["Square-1", "sq1"],
  ["3x3 OH", "3oh"],
  ["3x3 BLD", "3bld"],
  ["4x4 BLD", "4bld"],
  ["5x5 BLD", "5bld"],
]);

const MATCH_FORMAT_OPTIONS = ["Best Of", "First To"]; // add more
const MATCH_FORMAT_DISPLAY_TO_VALUE = new Map<string, MatchFormat>([
  ["Best Of", "BEST_OF"],
  ["First To", "FIRST_TO"],
]);
const SET_FORMAT_OPTIONS = ["Best Of", "First To", "Average Of", "Mean Of"]; // add more
const SET_FORMAT_DISPLAY_TO_VALUE = new Map<string, SetFormat>([
  ["Best Of", "BEST_OF"],
  ["First To", "FIRST_TO"],
  ["Average Of", "AVERAGE_OF"],
  ["Mean Of", "MEAN_OF"],
]);

export default function Page() {
  /* DropDown Options */

  /* User Input Values: Name, Max Participant, Solve Timeout */
  const [name, setName] = useState<string>("");
  // TODO - make these do something
  // const [maxParticipants, setMaxParticipants] = useState<string>("10");
  // const [timeLimit, setTimeLimit] = useState<string>("5"); // not sure what units we should use for this

  /* User Selected from DropDowns */
  const [roomFormat, setRoomFormat] = useState<string>("Racing");
  const [event, setEvent] = useState<string>("3x3");
  const [matchFormat, setMatchFormat] = useState<string>("Best Of");
  const [numSets, setNumSets] = useState<number>(1);
  const [setFormat, setSetFormat] = useState<string>("Best Of");
  const [numSolves, setNumSolves] = useState<number>(1);

  /* Toggle + related Options */
  const [roomIsPrivate, setRoomIsPrivate] = useState<boolean>(false); // default is public
  const [password, setPassword] = useState<string>("");
  // TODO - make this do something
  // const [allowSpectators, setAllowSpectators] = useState<boolean>(true); // if private room, allow spec, only if they have pw, else public room freely choose

  //generate socket, fetch local user from session
  const { socket, socketConnected } = useSocket();
  const { user: localUser } = useSession();

  //join room upon load/change of user/room
  useEffect(() => {
    if (!localUser) {
      return;
    }

    // Connect socket to room
    if (socket.connected) {
    } else {
      console.log("Waiting for socket to connect...");
      socket.connect();
      socket.on("connect", () => {
        console.log("Socket connected. ");
      });
    }

    return () => {};
  }, [socket, localUser, socketConnected]);

  const roomSettings: IRoomSettings = useMemo(
    () => ({
      roomName: name,
      host: localUser,
      roomEvent: EVENT_DISPLAY_TO_VALUE.get(event)!,
      roomFormat: ROOM_FORMAT_DISPLAY_TO_VALUE.get(roomFormat)!,
      matchFormat:
        roomFormat === "CASUAL"
          ? undefined
          : MATCH_FORMAT_DISPLAY_TO_VALUE.get(matchFormat)!,
      setFormat:
        roomFormat === "CASUAL"
          ? undefined
          : SET_FORMAT_DISPLAY_TO_VALUE.get(setFormat)!,
      isPrivate: roomIsPrivate,
      password: roomIsPrivate ? password : undefined,
      nSets: roomFormat === "CASUAL" ? undefined : numSets,
      nSolves: roomFormat === "CASUAL" ? undefined : numSolves,
    }),
    [
      name,
      localUser,
      event,
      roomFormat,
      matchFormat,
      setFormat,
      roomIsPrivate,
      password,
      numSets,
      numSolves,
    ]
  );

  //write a function which grabs the value of the selected value from the dropdown; this can be use within all of the dropdowns, but we will need a usestate for all

  /* The actual components which make up the 'Create Room' page */
  return (
    <div>
      <Header>
        <CreateRoomHeader />
      </Header>
      <div className="h-screen flex">
        <div className="w-1/3 h-full bg-primary-foreground) ">
          <h1 className="section-title">INFO</h1>
          <CreateSubtitle subtitle="Name*" />
          <CreateInput placeholder="Name" onChange={setName}></CreateInput>
          <div className="mt-8 mb-8">
            <CreateSubtitle subtitle="Room Type" />
            <CreateRoomDropdown
              options={ROOM_FORMAT_OPTIONS}
              onChange={setRoomFormat}
            ></CreateRoomDropdown>
          </div>
          <div className="mt-8 mb-8">
            <CreateSubtitle subtitle="Event" />
            <CreateRoomDropdown
              options={EVENT_OPTIONS}
              onChange={setEvent}
            ></CreateRoomDropdown>
          </div>
          <CreateSubtitle subtitle="Private" />
          <CreateToggleButton
            toggled={roomIsPrivate}
            onChange={setRoomIsPrivate}
          ></CreateToggleButton>
          <CreateInput
            placeholder="Password"
            onChange={setPassword}
            appear={roomIsPrivate}
          ></CreateInput>
        </div>
        <div className="w-1/3 h-full bg-primary-foreground) border">
          <h1 className="section-title">FORMAT</h1>
          <CreateSubtitle
            subtitle="Match Format"
            appear={roomFormat !== "Casual"}
          />
          <CreateRoomDropdown
            options={MATCH_FORMAT_OPTIONS}
            onChange={setMatchFormat}
            appear={roomFormat !== "Casual"}
          ></CreateRoomDropdown>
          <CreateSubtitle subtitle="# Sets" appear={roomFormat !== "Casual"} />
          <CreateInput
            placeholder="1"
            onChange={(val: string) => {
              const numParsed: number = parseInt(val);
              if (!isNaN(numParsed)) {
                setNumSets(numParsed);
              } 
            }}
            appear={roomFormat !== "Casual"}
          />

          <div className="mt-8 mb-8">
            <CreateSubtitle
              subtitle="Set Format"
              appear={roomFormat !== "Casual"}
            />
            <CreateRoomDropdown
              options={SET_FORMAT_OPTIONS}
              onChange={setSetFormat}
              appear={roomFormat !== "Casual"}
            ></CreateRoomDropdown>

            <CreateSubtitle subtitle="# Solves" appear={roomFormat !== "Casual"} />
            <CreateInput
              placeholder="1"
              onChange={(val: string) => {
                const numParsed: number = parseInt(val);
                if (!isNaN(numParsed)) {
                  setNumSolves(numParsed);
                } 
              }}
              appear={roomFormat !== "Casual"}
            />
          </div>
        </div>
        <div className="w-1/3 h-full bg-primary-foreground) border">
          <h1 className="section-title">EXTRA</h1>
          {/* <h2 className="subsection-title">Max Participants</h2>
          <CreateInput placeholder="∞" onChange={setMaxParticipants}></CreateInput>
          <div className="mt-8 mb-8">
            <h2 className="subsection-title">Allow Spectators?</h2>
            <CreateToggleButton
              toggled={allowSpectators}
              onChange={setAllowSpectators}
            ></CreateToggleButton>
          </div>
          <h2 className="subsection-title">Solve Timeout</h2>
          <CreateInput
            placeholder="5 mins"
            onChange={setTimeLimit}
          ></CreateInput> */}
          <div className="fixed bottom-8 right-8">
            <CreateRoomButton
              roomSettings={roomSettings}
              socket={socket}
              user={localUser}
            ></CreateRoomButton>
          </div>
        </div>
      </div>
    </div>
  );
}
