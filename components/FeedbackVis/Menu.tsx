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
        <div tabIndex={0} role="button" className="btn text-xs m-1 w-36">
          <span className="text-gray-400">Color by</span>
          <span className="capitalize">{categoricalDimension}</span>
        </div>
        <ul
          tabIndex={0}
          className="dropdown-content menu bg-base-100 rounded-box z-[1] w-full p-2 shadow"
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
      <div className="dropdown">
        <div tabIndex={0} role="button" className="btn text-xs m-1 w-40">
          <span className="text-gray-400">Size by</span>
          <span className="capitalize">{numericalDimension}</span>
        </div>
        <ul
          tabIndex={0}
          className="dropdown-content menu bg-base-100 rounded-box z-[1] w-full p-2 shadow"
        >
          <li title="Length is the number of words in the feedback.">
            <a
              onClick={() => setNumericalDimension("length")}
              className={numericalDimension === "length" ? "active" : ""}
            >
              Length
            </a>
          </li>
          {/* <li title="Helpfulness is the sum of actionability, specificity, and justification.">
            <a
              onClick={() => setNumericalDimension("helpfulness")}
              className={numericalDimension === "helpfulness" ? "active" : ""}
            >
              Helpfulness
            </a>
          </li> */}
          <li title="Actionability is the number of actionable suggestions in the feedback.">
            <a
              onClick={() => setNumericalDimension("actionability")}
              className={numericalDimension === "actionability" ? "active" : ""}
            >
              Actionability
            </a>
          </li>
          <li title="Specificity is the degree to which the feedback is specific and detailed.">
            <a
              onClick={() => setNumericalDimension("specificity")}
              className={numericalDimension === "specificity" ? "active" : ""}
            >
              Specificity
            </a>
          </li>
          <li title="Justification is the degree to which the feedback is justified with reasons or evidence.">
            <a
              onClick={() => setNumericalDimension("justification")}
              className={numericalDimension === "justification" ? "active" : ""}
            >
              Justification
            </a>
          </li>
          <li title="Sentiment is the degree to which the feedback is positive (small) or negative (big).">
            <a
              onClick={() => setNumericalDimension("sentiment")}
              className={numericalDimension === "sentiment" ? "active" : ""}
            >
              Sentiment
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Menu;
