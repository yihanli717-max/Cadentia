import React from "react";
import { diffWords } from "diff";

interface TextDiffProps {
  oldText: string;
  newText: string;
}

const TextDiff = (props: TextDiffProps) => {
  const differences = diffWords(props.oldText, props.newText);

  return (
    <span>
      {differences.map((part: any, index: any) => {
        const color = part.added
          ? "#00a96e"
          : part.removed
            ? "#ff5961"
            : "grey";
        const textDecoration = part.removed ? "line-through" : "none";
        return (
          <span key={index} style={{ color, textDecoration }}>
            {part.value}
          </span>
        );
      })}
    </span>
  );
};

export default TextDiff;
