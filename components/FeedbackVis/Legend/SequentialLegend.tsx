import * as d3 from "d3";
import { sequentialColorScales, getSequentialColor } from "@/lib/utils";

interface SequentialLegendProps {
  colorDimension: string;
  width?: number;
  height?: number;
}
const SequentialLegend = ({
  colorDimension,
  width = 160,
  height = 15,
}: SequentialLegendProps) => {
  const colorScale = getSequentialColor(colorDimension);
  const domain = sequentialColorScales[colorDimension].domain();

  const stops = d3.range(0, 1.01, 0.1).map((t) => {
    const value = domain[0] + t * (domain[1] - domain[0]);
    return { offset: t * 100 + "%", color: colorScale(value) };
  });

  const gradientId = `gradient-${colorDimension}`;

  return (
    <div>
      <svg width={width} height={height}>
        <defs>
          <linearGradient id={gradientId}>
            {stops.map((stop, index) => (
              <stop key={index} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        </defs>
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={`url(#${gradientId})`}
        />
      </svg>

      <div className="flex justify-between mt-1 text-2xs font-medium">
        <span>Negative</span>
        <span>Positive</span>
      </div>
    </div>
  );
};

export default SequentialLegend;
