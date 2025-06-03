'use client'

import React, { useState } from "react";

// add props including, lists (the options or single input) -> this should connect to other variables to help 

// this can be interface or type   
type CreateDropdownProps = {
    options: string[];
    // title: String;
    // showDropDown: boolean;
    
};

export default function CreateRoomDropdown({ options }: CreateDropdownProps) { 
    const [option, setOption] = useState(""); 
    
    const getOption = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setOption(event.target.value) 
        alert(event.target.value)
    };

    return (
        <>
            <select className="subsection-title font-normal" onChange={getOption}>
                {options.map((val) => (
                    <option>
                    {val}
                    </option>
                ))}
            </select>
        </>
    );
}