"use client";
import React from "react";
import Header from "@/components/Header";
import ProviderGallery from "@/components/ProviderGallery/ProviderGallery";
import EssayPanel from "@/components/EssayPanel/EssayPanel";
import FeedbackVis from "@/components/FeedbackVis/FeedbackVis";
import Menu from "@/components/FeedbackVis/Menu";
import {
  // useOpenAIAPI,
  useSharedConfigStore,
} from "@/lib/store";

const Page = () => {
  const isLoading = useSharedConfigStore((state) => state.isLoading);

  return (
    <div>
      <div>
        <Header />
        <div className="flex flex-row justify-between min-h-screen overflow-hidden">
          <EssayPanel classes="flex-none w-[512px] sticky top-0 h-screen overflow-auto" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-col h-full">
              <div className="relative flex-none mt-[3rem] h-[260px] border-b border-base-200 bg-white">
                <Menu dashboardOnly classes="absolute left-3 right-[6px] top-2 bottom-2" />
              </div>
              <FeedbackVis classes="w-full flex-1 min-h-0" />
            </div>
          </div>
          <ProviderGallery classes="flex-none h-screen overflow-auto pt-[3rem] w-[320px] sticky top-0 z-[10001]" />
        </div>
      </div>
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-center backdrop-blur-sm z-[100001]">
          <span className="loading loading-spinner text-warning"></span>
        </div>
      )}
    </div>
  );
};

export default Page;
