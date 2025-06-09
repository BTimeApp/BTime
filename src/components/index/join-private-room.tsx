"use client";

import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import Link from 'next/link'

type JoinPrivateRoomProps = {
    onHomePage: boolean;
    roomName?: string;
    password?: string;
};

/*  TODO:
    - how do we grab the 'real' password from the DB
        - once we get that, use that to check between the input password and real password
    - what should the 'default' be?     Empty String??
    - Refreshing this screen should clear the inputs (might need to use 'useState', or use some library)
    - might want to list the names of the privae rooms within this page also (similar to the letscube)
        - or the name input can be like a 'search' (so it doesn't really show the private rooms, only on the first input of letters it will 'autofill')
          this allows a bit more privacy
    - need a popup or something when you input the password wrong 
        - this is why this logic is sort of just a placeholder right now b/c not totally sure how to do this rn...
    - need to add 'join room' button to the sidebar
 */


export default function JoinPrivateRoom({roomName, onHomePage, password}: JoinPrivateRoomProps) {
    /* Might need some big changes... */
    let whereToGo = "Room"; //change

    if (onHomePage) {
        whereToGo = "/join";
    } else { 
        if (password == "123") { //change this to the 'acutal password' from DB; this will join person into the room
            whereToGo = `/room/${roomName}`;
        } else { 
             /* 
             - logic for incorrect password 
             - refresh page or something
             */

            //location.reload(); might help?
        }
    }

    return (
            <Button
                variant="primary"
                size="lg"
                // className={cn("p-0 w-42")}
            >
                <Link href={whereToGo} className="grow"> 
                    <h1 className="font-bold text-center text-2xl ">Join Private Room</h1>
                </Link>
            </Button>
        
    )
}