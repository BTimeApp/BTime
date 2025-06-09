'use client'

import React from "react";
import { useState } from "react";

type CreateInputProps = {
    value?: string; //might delete i don't think it's needed
    placeholder: string;
    appear?: boolean;
    onChange: (value:string) => void;
};

const CreateInput: React.FC<CreateInputProps> = ({ appear=true, placeholder, onChange }) => { 
    // const getNewName = (event : React.ChangeEvent<HTMLInputElement>) => {
    //     setName(event.target.value) // need a way to figure out which input this is meaning if it's info, max part., solve timeout
    // };

    if (appear) {
        return (
        <>
            <input className="subsection-title border-3 rounded-sm flex" placeholder={placeholder} onChange={(e) => onChange(e.target.value)}/>
        </>
        );
    }    
}

export default CreateInput;