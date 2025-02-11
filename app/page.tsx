"use client";
import React from "react";
import Header from "@/components/Header";
import APIInput from "@/components/APIInput";
import ProviderGallery from "@/components/ProviderGallery/ProviderGallery";
import EssayPanel from "@/components/EssayPanel/EssayPanel";
import FeedbackVis from "@/components/FeedbackVis/FeedbackVis";
import RevisionGallery from "@/components/RevisionGallery/RevisionGallery";
import {
  useOpenAIAPI,
  useFeedbackStore,
  useSharedConfigStore,
} from "@/lib/store";

const Page = () => {
  const API = useOpenAIAPI((state) => state.API);
  const allFeedback = useFeedbackStore((state) => state.feedback);
  const isLoading = useSharedConfigStore((state) => state.isLoading);

  return (
    <div>
      {API === "" && <APIInput />}
      {API !== "" && allFeedback.length > 0 && (
        <div>
          <Header />
          <div className="flex flex-row justify-between min-h-screen overflow-hidden">
            <EssayPanel classes="flex-none w-[512px] sticky top-0 h-screen overflow-auto" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-col h-full">
                <RevisionGallery classes="flex-none mt-14 overflow-x-auto" />
                <FeedbackVis classes="w-full flex-1 min-h-0" />
              </div>
            </div>
            <ProviderGallery classes="flex-none h-screen overflow-auto pt-14 w-[300px] sticky top-0 z-[10001]" />
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
