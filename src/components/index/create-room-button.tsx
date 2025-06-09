"use client";

import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import Link from 'next/link'

// TODO: use props to make this a general link button
type CreateRoomButtonProps = {
    onHomePage: boolean
    roomName?: string;
};


export default function CreateRoomButton({roomName, onHomePage}: CreateRoomButtonProps) {
    const whereToGo = onHomePage? "/create" : `/room/${roomName}`;

    return (
            <Button
                variant="primary"
                size="lg"
                className={cn("p-0 w-42")}
            >
                <Link href={whereToGo} className="grow"> 
                    <h1 className="font-bold text-center text-2xl">Create Room</h1>
                </Link>
            </Button>
        
    )
}