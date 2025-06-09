'use client'

import React from "react";
// import { Switch } from "@/components/ui/switch"

type ToggleProps = {
    toggled: boolean;
    onChange: (checked: boolean) => void;
    // some function, bool, 

};

export default function CreateToggleButton({toggled, onChange}: ToggleProps) { 
    return (
        <div className="pl-10">
            <button 
            className={`flex items-center justify-center w-20 h-8 duration-300 rounded-full ${toggled ? 'bg-primary' : 'bg-gray-300'}`}
            onClick={() => onChange(!toggled)}     
            >
                <div className={`w-6 h-6 bg-white rounded-full transform duration-300 ${toggled ? 'translate-x-6' : '-translate-x-11/12'}`}/> 
            </button>
        </div>

        
    );
}