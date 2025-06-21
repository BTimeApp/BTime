'use client'

import React from "react";

type CreateInputProps = {
    value?: string; //might delete i don't think it's needed
    placeholder: string;
    appear?: boolean;
    onChange: (value:string) => void;
};

const CreateInput: React.FC<CreateInputProps> = ({ appear=true, placeholder, onChange }) => { 

    if (appear) {
        return (
        <>
            <input className="subsection-title border-3 rounded-sm" placeholder={placeholder} onChange={(e) => onChange(e.target.value)}/>
        </>
        );
    }    
}

export default CreateInput;