"use client";
import React, { useRef } from "react";
import { cn } from "@/lib/utils";

type MenuProps = {
  classes?: string;
};

const Menu = ({ classes }: MenuProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {};

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          // here we can store the data in the state
          console.log("Data uploaded");
        } catch (error) {
          console.error("Error parsing JSON file", error);
        }
      };
      reader.readAsText(file);
    }
  };

  const loadDefaultData = async () => {
    try {
      const response = await fetch("/sample.json");
      if (response.ok) {
        const data = await response.json();
        // here we can store the data in the state
        console.log("Default data loaded");
        console.log(data);
      } else {
        console.error("Failed to load default data");
      }
    } catch (error) {
      console.error("Error fetching default data", error);
    }
  };

  return (
    <div className={cn(classes, "flex flex-row select-none items-center")}>
      <div className="flex flex-row gap-2 items-center">
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          className="btn text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload Data
        </button>
        <button className="btn text-xs" onClick={loadDefaultData}>
          Load Default Data
        </button>
        {/* <div className="divider divider-horizontal my-2"></div> */}
        {/* <button onClick={handleExport} className="btn text-xs">
          Export Data
        </button> */}
      </div>
    </div>
  );
};

export default Menu;
