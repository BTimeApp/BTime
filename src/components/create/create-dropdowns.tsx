'use client'

import React, { useState } from "react";

// add props including, lists (the options or single input) -> this should connect to other variables to help 

// this can be interface or type   
type CreateDropdownProps = {
    options: string[];
    onChange: (value:string) => void;
    
};

export default function CreateRoomDropdown({ options, onChange}: CreateDropdownProps) { 
    // const [option, setOption] = useState(""); 
    
    // const getOption = (event: { target: { value: React.SetStateAction<string>; }; }) => {
    //     setOption(event.target.value) 
    //     alert(event.target.value)
    // };

    return (
        <div className="">
            <select className="subsection-title font-normal border-3" onChange={(e) => onChange(e.target.value)}>
                {options.map((val) => (
                    <option key={val}>
                    {val}
                    </option>
                ))}
            </select>
        </div>
    );
}