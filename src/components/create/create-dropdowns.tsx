"use client";

import React from "react";

// add props including, lists (the options or single input) -> this should connect to other variables to help

type CreateDropdownProps = {
  options: string[];
  onChange: (value: string) => void;
  appear?: boolean;
};

export default function CreateRoomDropdown({
  options,
  onChange,
  appear = true,
}: CreateDropdownProps) {

  if (appear) {
    return (
      <div className="">
        <select
          className="subsection-title font-normal border-3"
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((val) => (
            <option key={val}>{val}</option>
          ))}
        </select>
      </div>
    );
  }
}
