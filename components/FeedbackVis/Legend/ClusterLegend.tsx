import { getClusterColor, typeMap } from "@/lib/utils";
import { FeedbackItem } from "@/lib/type";
import { useFeedbackStore } from "@/lib/store";

interface ClusterLegendProps {
  colorDimension: string;
}

const getGroupsFromData = (data: FeedbackItem[], colorDimension: string) => {
  const groupsSet = new Set<string>();
  data.forEach((item) => {
    const value = item[colorDimension as keyof FeedbackItem]?.toString();
    if (value && typeof value === "string") {
      groupsSet.add(value);
    }
  });
  return Array.from(groupsSet);
};

const ClusterLegend = ({ colorDimension }: ClusterLegendProps) => {
  const allFeedback = useFeedbackStore((state) => state.feedback);
  const groups = getGroupsFromData(allFeedback, colorDimension);
  const getColorFn = getClusterColor(colorDimension);

  return (
    <div className="flex flex-row justify-center items-center gap-1">
      {groups.map((group) => (
        <div key={group} className="flex items-center space-x-1">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: getColorFn(group) }}
          />
          <span className="text-2xs bg-gray-50 p-1 min-w-6 text-center rounded-lg">
            {typeMap[group.toLowerCase() as keyof typeof typeMap]}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ClusterLegend;
