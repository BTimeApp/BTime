import { cn } from "@/lib/utils";
import React from "react";

// add props including, lists (the options or single input) -> this should connect to other variables to help

type DropdownProps = {
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function Dropdown({
  options,
  onChange,
  placeholder,
  className,
}: DropdownProps) {
  return (
    <div className="">
      <select
        className={cn(className)}
        onChange={(e) => onChange(e.target.value)}
        value={placeholder ? placeholder : options[0]}
      >
        {options.map((val) => (
          <option key={val} value={val}>
            {val}
          </option>
        ))}
      </select>
    </div>
  );
}
