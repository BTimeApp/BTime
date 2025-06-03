import Image from "next/image";
import CreateRoomHeader from "@/components/create/create-header-content";
import { SidebarTrigger } from "@/components/ui/sidebar";
import CreateRoomButton from "@/components/index/create-room-button";
import CreateRoomDropdown from "@/components/create/create-dropdowns";
import HomeHeaderContent from "@/components/index/home-header-content";
import Header from "@/components/common/header";
import CreateInput from "@/components/create/create-input";
//import {  Dropdown,  DropdownTrigger,  DropdownMenu,  DropdownSection,  DropdownItem} from "@heroui/dropdown";
// need to import some type of drop down component or make own

export default function Page() {
  // Ponetial Options
  const room_type_options = ['Race']  // add more
  const event_options = ['2x2','3x3', '4x4', '5x5', '6x6', '7x7', '3x3 OH', '3x3 BLD', 
                        'Clock', 'Megaminx', 'Pyramix', 'Skewb','Square-1'] 
  const privacy_options = ['Private', 'Public']
  const win_options = ['Bo3 Sets']    // add more 
  const set_options = ['Bo5 Solves']  // add more
  


  return (
    // not sure if it's worth making a whole componenet for this or putting it in or making another componet which will help take care of these 'sub-header'
    // meaning we can have a prop for each one of them and then just enter a string in 
    // need to fix the centering of the header
    <>
      <Header><CreateRoomHeader/></Header> 
      <div className="h-screen flex">
        <div className="w-1/3 h-full bg-primary-foreground)">
          <h1 className="section-title">INFO</h1>
          <h2 className="subsection-title">Name</h2>
          <CreateInput title="Name"></CreateInput>
          <h2 className="subsection-title">Room Type</h2>
          <CreateRoomDropdown options={room_type_options}></CreateRoomDropdown>
          <h2 className="subsection-title">Event</h2>
          <CreateRoomDropdown options={event_options}></CreateRoomDropdown>
          <h2 className="subsection-title">Privacy</h2>
          <CreateRoomDropdown options={privacy_options}></CreateRoomDropdown>
        </div>
        <div className="w-1/3 h-full bg-primary-foreground)">
          <h1 className="section-title">FORMAT</h1>
          <h2 className="subsection-title">Win Condition</h2>
          <CreateRoomDropdown options={win_options}></CreateRoomDropdown>
          <h2 className="subsection-title">Set Condition</h2>
          <CreateRoomDropdown options={set_options}></CreateRoomDropdown>
        </div>
        <div className="w-1/3 h-full bg-primary-foreground)">
          <h1 className="section-title">EXTRA</h1>
          <h2 className="subsection-title">Max Participants</h2>
          <CreateInput title="∞"></CreateInput>
          <h2 className="subsection-title">Allow Spectators</h2>
          <h2 className="subsection-title">Solve Timeout</h2>
          <CreateInput title="5 mins"></CreateInput>
          <div className="fixed bottom-4 right-4"><CreateRoomButton></CreateRoomButton></div>
        </div>
      </div>
    </>
  );
}
