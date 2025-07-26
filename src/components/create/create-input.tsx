'use client'

import React from "react";

type CreateInputProps = {
    value?: string; //might delete i don't think it's needed
    placeholder: string;
    appear?: boolean;
    className?: string;
    onChange: (value:string) => void;
};

const CreateInput: React.FC<CreateInputProps> = ({ appear=true, placeholder, className, onChange }) => { 

    if (appear) {
        return (
        <>
            <input className={`subsection-title border-3 rounded-sm ${className}`} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}/>
        </>
        );
    }    
}

export default CreateInput;