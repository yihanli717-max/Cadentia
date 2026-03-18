"use client";
import React, { useState } from "react";
import Header from "@/components/Header";
import EntryPanel from "@/components/EntryPanel";
import ProviderGallery from "@/components/ProviderGallery/ProviderGallery";
import EssayPanel from "@/components/EssayPanel/EssayPanel";
import FeedbackVis from "@/components/FeedbackVis/FeedbackVis";
import Menu from "@/components/FeedbackVis/Menu";
import {
  // useOpenAIAPI,
  useFeedbackStore,
  useSharedConfigStore,
} from "@/lib/store";

const Page = () => {
  const [start, setStart] = useState(false);
  const allFeedback = useFeedbackStore((state) => state.feedback);
  const isLoading = useSharedConfigStore((state) => state.isLoading);

  return (
    <div>
      {!start && <EntryPanel setStart={setStart} />}
      {start && allFeedback.length > 0 && (
        <div>
          <Header />
          <div className="flex flex-row justify-between min-h-screen overflow-hidden">
            <EssayPanel classes="flex-none w-[512px] sticky top-0 h-screen overflow-auto" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-col h-full">
                <div className="flex-none mt-[3rem] h-[220px] border-b border-base-200 bg-white px-2 py-2">
                  <Menu dashboardOnly classes="h-full w-full" />
                </div>
                <FeedbackVis classes="w-full flex-1 min-h-0" />
              </div>
            </div>
            <ProviderGallery classes="flex-none h-screen overflow-auto pt-[3rem] w-[320px] sticky top-0 z-[10001]" />
          </div>
        </div>
      )}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-center backdrop-blur-sm z-[100001]">
          <span className="loading loading-spinner text-warning"></span>
        </div>
      )}
    </div>
  );
};

export default Page;
