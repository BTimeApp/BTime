"use client"
import CreateRoomHeader from "@/components/create/create-header-content";
import CreateRoomButton from "@/components/index/create-room-button";
import CreateRoomDropdown from "@/components/create/create-dropdowns";
import Header from "@/components/common/header";
import CreateInput from "@/components/create/create-input";
import CreateToggleButton from "@/components/create/create-toggle";
import { useEffect, useState } from "react";

export default function Page() {
  /* DropDown Options */
  const room_type_options = ['Race']  // add more
  const event_options = ['3x3', '2x2', '4x4', '5x5', '6x6', '7x7', '3x3 OH', '3x3 BLD', 
                        'Clock', 'Megaminx', 'Pyramix', 'Skewb','Square-1'] 
  const privacy_options = ['Private', 'Public']
  const win_options = ['Bo3 Sets']    // add more 
  const set_options = ['Bo5 Solves']  // add more

  /* User Input Values: Name, Max Participant, Solve Timeout */
  const [name, setName] = useState<string>("Room");
  var show = name != "Room";
  const [maxPar, setMaxPar] = useState<string>("10");
  const [timeLimit, setTimeLimit] = useState<string>("5"); // not sure what units we should use for this

  /* User Selected from DropDowns */
  const [roomType, setRoomType] = useState<string>("Race");
  const [event, setEvent] = useState<string>("3x3");
  const [winOp, setWinOp] = useState<string>("Bo3 Sets");
  const [setOp, setSetOp] = useState<string>("Bo5 Solves");

  /* User Toggle Options: Private? Allow Spectators? */
  const [publicRoom, setToPrivateRoom] = useState<boolean>(false); // default is public 
  const [noSpectators, setYesSpectators] = useState<boolean>(false); // if private room, allow spec, only if they have pw, else public room freely choose
  
  /* just for debugging */
  useEffect(() => {
    console.log(name);
  }, [name]);

   useEffect(() => {
    console.log(event);
  }, [event]);
  
  useEffect(() => {
    console.log(publicRoom);
  }, [publicRoom]);

 /* 
  TODOS:
  - maxPar and timeLimit might need to change the value 
    - figure out how to connect these values with making the room 
  - use Swtich
  */

  //write a function which grabs the value of the selected value from the dropdown; this can be use within all of the dropdowns, but we will need a usestate for all



  /* The actual components which make up the 'Create Room' page */
  return (
    <div>
      <Header><CreateRoomHeader/></Header>
      <div className="h-screen flex">
        <div className="w-1/3 h-full bg-primary-foreground) ">
          <h1 className="section-title">INFO</h1>
          <h2 className="subsection-title">Name</h2>
          <CreateInput placeholder="Name" onChange={setName}></CreateInput>
          <div className="mt-8 mb-8">
            <h2 className="subsection-title">Room Type</h2>
            <CreateRoomDropdown options={room_type_options} onChange={setRoomType}></CreateRoomDropdown>
          </div>
          <div className="mt-8 mb-8">
            <h2 className="subsection-title">Event</h2>
            <CreateRoomDropdown options={event_options} onChange={setEvent}></CreateRoomDropdown>
          </div>
          <h2 className="subsection-title">Private?</h2>
          <CreateToggleButton toggled={publicRoom} onChange={setToPrivateRoom} ></CreateToggleButton>
          <CreateInput placeholder="Password" onChange={setName} appear={publicRoom}></CreateInput> 
        </div>
        <div className="w-1/3 h-full bg-primary-foreground) border">
          <h1 className="section-title">FORMAT</h1>
          <h2 className="subsection-title">Win Condition</h2>
          <CreateRoomDropdown options={win_options} onChange={setWinOp}></CreateRoomDropdown>
          <div className="mt-8 mb-8">
            <h2 className="subsection-title">Set Condition</h2>
            <CreateRoomDropdown options={set_options} onChange={setSetOp}></CreateRoomDropdown>
          </div>
        </div>
        <div className="w-1/3 h-full bg-primary-foreground) border">
          <h1 className="section-title">EXTRA</h1>
          <h2 className="subsection-title">Max Participants</h2>
          <CreateInput placeholder="∞" onChange={setMaxPar}></CreateInput>
          <div className="mt-8 mb-8">
            <h2 className="subsection-title">Allow Spectators?</h2>
            <CreateToggleButton toggled={noSpectators} onChange={setYesSpectators}></CreateToggleButton> 
          </div>
          <h2 className="subsection-title">Solve Timeout</h2>
          <CreateInput placeholder="5 mins" onChange={setTimeLimit}></CreateInput>
          <div className="fixed bottom-8 right-8"><CreateRoomButton roomName={name} onHomePage={false}></CreateRoomButton></div>
        </div>
      </div>
    </div>
  );
}

