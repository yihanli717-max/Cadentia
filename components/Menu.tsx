"use client";
import React, { useRef } from "react";
import { essay } from "@/data/essay";
import { feedback } from "@/data/feedback";
import {
  useEssayStore,
  useFeedbackStore,
  useSharedConfigStore,
} from "@/lib/store";
import { cn, countWords, getEmbedding } from "@/lib/utils";

type MenuProps = {
  classes?: string;
};

const Menu = ({ classes }: MenuProps) => {
  const [setLoading, setCategoricalDimension, setNumericalDimension] =
    useSharedConfigStore((state) => [
      state.setLoading,
      state.setCategoricalDimension,
      state.setNumericalDimension,
    ]);

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
    useEssayStore.setState({ essay: essay });
    // useFeedbackStore.setState({ feedback: feedback })

    setLoading(true);

    // iterate over the feedback and calculate the sentence lengths of each feedback content
    const feedbackWithLengthAndEmbeddings = await Promise.all(
      feedback.map(async (item) => ({
        ...item,
        length: countWords(item.content),
        embeddings: await getEmbedding(item.content),
      })),
    ).then((result) => {
      setLoading(false);
      setCategoricalDimension("type");
      setNumericalDimension("length");
      return result;
    });

    console.log(feedbackWithLengthAndEmbeddings);

    useFeedbackStore.setState({ feedback: feedbackWithLengthAndEmbeddings });
  };

  return (
    <div className={cn(classes, "flex flex-row select-none items-center")}>
      <div className="flex flex-row gap-2 items-center">
        <input
          type="provider"
          accept=".json"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          className="btn text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload Feedback
        </button>
        <button
          className="btn text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload Essay
        </button>
        {/* <button className="btn text-xs" onClick={loadDefaultData}>
          Load Default Data
        </button> */}
        {/* <div className="divider divider-horizontal my-2"></div> */}
        {/* <button onClick={handleExport} className="btn text-xs">
          Export Data
        </button> */}
      </div>
    </div>
  );
};

export default Menu;
