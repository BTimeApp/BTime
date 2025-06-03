import React from "react";

// might not need some of these things like the isStarted (but works right now so we will continue for now, clean up later?)
// maybe make the header have the parameter, so we don't need a content header with something inside in another component, so we could have one instead of two
export default function CreateRoomHeader({isStarted}: {isStarted?: boolean}) { 
    return (
        <h1 className="grow font-bold text-center text-2xl"> Create Room </h1>
    );
}