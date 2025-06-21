"use client";
import { useEffect, useState } from "react";

export default function RoomListing() {
    const [rooms, setRooms] = useState([]);

    // run once on mount
    // TODO: maybe have a reload button on the page to refresh
    useEffect(() => {
        const fetchRooms = async () => {
            const response = await fetch('/api/getrooms');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const json = await response.json();
            setRooms(json);
        }
        fetchRooms();
    }, []);
    
    return (
        <div className="px-3">
            <h2 className="font-bold text-center text-xl">Room List</h2>
            <div className="flex py-3 bg-orange-500">
                <div className="bg-green-500 text-center flex-1">Room Name</div>
                <div className="bg-red-500 text-center w-12">Users</div>
                <div className="bg-blue-500 text-center w-12">Event</div>
                <div className="bg-red-500 text-center w-12">Format.1</div>
                <div className="bg-blue-500 text-center w-12">Format.2</div>
            </div>
            {/* flex or grid or table? */}
            {/* scroll here, not on btimeguide? */}
            {/* FETCH rooms and list out here */}
            <ul>
                <li>idk test</li>
                <li>JSON : {JSON.stringify(rooms, null, 2)}</li><br></br><br></br>
            </ul>
            <ul>
                {
                rooms.length != 0 ?
                rooms.map(({ key, value }) => (
                    <li key={key}>
                        Room Name: {key}     <br></br>
                        Users: {Object.keys(value.users).length}     <br></br>
                        Event: {value.roomEvent}        <br></br>
                        Format: {value.matchFormat}{value.nSets} {value.setFormat}{value.nSolves}
                    </li>
                ))
                : "empty"
                } 
            </ul>
        </div>
    )
} 