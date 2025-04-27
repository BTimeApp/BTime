"use client";

import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import Link from 'next/link'

// TODO: use props to make this a general link button

export default function CreateRoomButton() {
    return (
            <Button
                variant="foreground"
                size="lg"
                className={cn("p-0")}
                onClick={(event) => {
                    return;
            }}>
                <Link href="/room/create" className="grow">
                    <h1 className="font-bold text-center text-2xl">Create Room</h1>
                </Link>
            </Button>
        
    )
}