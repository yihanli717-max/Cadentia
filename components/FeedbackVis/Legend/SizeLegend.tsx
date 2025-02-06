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
    <div className="flex flex-col items-start gap-1 relative p-2">
      <div className="text-2xs bg-gray-50 px-3 py-1 rounded absolute left-0 -top-2 font-medium">
        {numericalDimension}
      </div>

      <div className="flex items-end justify-between w-full pb-0">
        <div className="flex flex-col items-center gap-1">
          <div
            className="bg-gray-200 rounded-full transition-all duration-300 ease-in-out"
            style={{
              width: `${minR * 2}px`,
              height: `${minR * 2}px`,
            }}
          />
          <span className="text-2xs text-gray-600">
            {numericalMin.toLocaleString()}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div
            className="bg-gray-200 rounded-full transition-all duration-300 ease-in-out"
            style={{
              width: `${maxR * 2}px`,
              height: `${maxR * 2}px`,
            }}
          />
          <span className="text-2xs text-gray-600">
            {numericalMax.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="relative w-full">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
        <div className="flex justify-between text-2xs text-gray-500 mt-1 font-medium">
          <span>Smaller</span>
          <span>Larger</span>
        </div>
      </div>
    </div>
  );
};

export default SizeLegend;
