"use client"
import React, { useState, useEffect } from "react";
import JoinPrivateRoom from "@/components/index/join-private-room";
import CreateInput from "@/components/create/create-input";
import Header from "@/components/common/header";


export default function Page() {
    const [nameOfRoom, getName] = useState<string>("Room");
    const [passwordOfRoom, getPassword] = useState<string>("");

    /* just for debugging */
    useEffect(() => {
    console.log(nameOfRoom);
    }, [nameOfRoom]);

    // add logic to the joinprivateroom button since you can only join if the name and password match with that is in the DB

    return(
        <div className="h-screen flex flex-col">
            <Header> <h1 className="grow font-bold text-center text-2xl">Join Private Room</h1> </Header>
            <div className="flex-1 grid place-items-center">
                <div className="flex flex-col gap-4">
                    <CreateInput placeholder="Name" onChange={getName} />
                    <CreateInput placeholder="Password" onChange={getPassword} />
                </div>

                {/* <CreateInput placeholder="Name" onChange={getName}></CreateInput>
                <CreateInput placeholder="Password" onChange={getPassword}></CreateInput> */}
            </div>
            <div className="fixed bottom-8 right-8 w-70">
                <JoinPrivateRoom onHomePage={false} roomName={nameOfRoom} password={passwordOfRoom}></JoinPrivateRoom>
                
            </div>
            
       </div>
       

    )
    
}