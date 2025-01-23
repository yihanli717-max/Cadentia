import React from "react";
import { useSharedConfigStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface MenuProps {
  classes?: string;
}

const Menu = (props: MenuProps) => {
  const [
    categoricalDimension,
    setCategoricalDimension,
    numericalDimension,
    setNumericalDimension,
  ] = useSharedConfigStore((state) => [
    state.categoricalDimension,
    state.setCategoricalDimension,
    state.numericalDimension,
    state.setNumericalDimension,
  ]);

  return (
    <div className={cn(props.classes, "space-x-2")}>
      <div className="dropdown">
        <div tabIndex={0} role="button" className="btn text-xs m-1">
          <span className="text-gray-400">Color by</span>
          <span className="capitalize">{categoricalDimension}</span>
        </div>
        <ul
          tabIndex={0}
          className="dropdown-content menu bg-base-100 rounded-box z-[1] w-24 p-2 shadow"
        >
          <li>
            <a
              onClick={() => setCategoricalDimension("type")}
              className={categoricalDimension === "type" ? "active" : ""}
            >
              Type
            </a>
          </li>
          <li>
            <a
              onClick={() => setCategoricalDimension("provider")}
              className={categoricalDimension === "provider" ? "active" : ""}
            >
              Provider
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Menu;
