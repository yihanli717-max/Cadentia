import React from "react";
import { useSharedConfigStore } from "@/lib/store";

interface SizeLegendProps {
  minR: number;
  maxR: number;
}

const SizeLegend = ({ minR, maxR }: SizeLegendProps) => {
  const { numericalDimension } = useSharedConfigStore();

  const numericalMin = 0;
  const numericalMax = 100;

  return (
    <div className="flex flex-col items-start gap-1 relative p-2">
      <div className="text-2xs bg-gray-50 px-3 py-1 rounded absolute left-0 -top-2">
        {numericalDimension}
      </div>

      <div className="flex items-end justify-between w-full pb-0">
        <div className="flex flex-col items-center gap-1">
          <div
            className="bg-gray-200 rounded-full"
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
            className="bg-gray-200 rounded-full"
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
        <div className="flex justify-between text-2xs text-gray-500 mt-1">
          <span>Smaller</span>
          <span>Larger</span>
        </div>
      </div>
    </div>
  );
};

export default SizeLegend;
