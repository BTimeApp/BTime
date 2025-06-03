'use client'

import React from "react";
import { useState } from "react";

type CreateInputProps = {
    title: string;

};

export default function CreateInput({title}: CreateInputProps) { 
    const [name, setName] = useState(""); 

    const getNewName = (event : React.ChangeEvent<HTMLInputElement>) => {
        setName(event.target.value) // need a way to figure out which input this is meaning if it's info, max part., solve timeout
    };

    return (
        <>
            <input className="subsection-title" placeholder={title} onChange={getNewName}/>
        </>
    );
}