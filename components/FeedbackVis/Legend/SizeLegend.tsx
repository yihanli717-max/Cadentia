import React from "react";
import { useSharedConfigStore, useFeedbackStore } from "@/lib/store";

interface SizeLegendProps {
  minR: number;
  maxR: number;
}

const SizeLegend = ({ minR, maxR }: SizeLegendProps) => {
  const allFeedback = useFeedbackStore((state) => state.feedback);

  const { numericalDimension } = useSharedConfigStore();

  // find the max value of the numerical dimension in the feedback
  const numericalMax = allFeedback.reduce(
    (acc, item) => Math.max(acc, item[numericalDimension] as number),
    0,
  );
  const numericalMin = allFeedback.reduce(
    (acc, item) => Math.min(acc, item[numericalDimension] as number),
    Infinity,
  );

  return (
    <div className="flex flex-col items-start gap-1 relative">
      {/* <div className="text-2xs bg-base-100 px-3 py-1 rounded absolute left-0 top-0 font-medium">
        {numericalDimension}
      </div> */}

      <div className="flex items-end justify-between w-full pb-0">
        <div className="flex flex-col items-center gap-1">
          <div
            className="bg-base-300 rounded-full transition-all duration-300 ease-in-out"
            style={{
              width: `${minR * 2}px`,
              height: `${minR * 2}px`,
            }}
          />
          <span className="text-2xs opacity-60 font-medium">
            {numericalMin.toLocaleString()}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div
            className="bg-base-300 rounded-full transition-all duration-300 ease-in-out"
            style={{
              width: `${maxR * 2}px`,
              height: `${maxR * 2}px`,
            }}
          />
          <span className="text-2xs opacity-60 font-medium">
            {numericalMax.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="relative w-full">
        <div className="h-px bg-gradient-to-r from-transparent via-base-300 to-transparent" />
        <div className="flex justify-between font-medium mt-1 text-2xs">
          <span>Smaller</span>
          <span>Larger</span>
        </div>
      </div>
    </div>
  );
};

export default SizeLegend;
