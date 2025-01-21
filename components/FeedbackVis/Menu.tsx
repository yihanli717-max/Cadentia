import React from "react";
import { cn } from "@/lib/utils";

interface MenuProps {
  classes?: string;
  categoricalDimension: string;
  setCategoricalDimension: React.Dispatch<React.SetStateAction<string>>;
}

const Menu = (props: MenuProps) => {
  return (
    <div className={cn(props.classes, "space-x-2")}>
      <div className="dropdown">
        <div tabIndex={0} role="button" className="btn text-xs m-1">
          <span className="text-gray-400">Color by</span>
          <span className="capitalize">{props.categoricalDimension}</span>
        </div>
        <ul
          tabIndex={0}
          className="dropdown-content menu bg-base-100 rounded-box z-[1] w-24 p-2 shadow"
        >
          <li>
            <a
              onClick={() => props.setCategoricalDimension("type")}
              className={props.categoricalDimension === "type" ? "active" : ""}
            >
              Type
            </a>
          </li>
          <li>
            <a
              onClick={() => props.setCategoricalDimension("source")}
              className={
                props.categoricalDimension === "source" ? "active" : ""
              }
            >
              Source
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Menu;
