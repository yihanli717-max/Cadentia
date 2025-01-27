"use client";
import React from "react";
import Header from "@/components/Header";
import APIInput from "@/components/APIInput";
import FeedbackGallery from "@/components/FeedbackGallery/FeedbackGallery";
import EssayPanel from "@/components/EssayPanel/EssayPanel";
import FeedbackVis from "@/components/FeedbackVis/FeedbackVis";
import RevisionGallery from "@/components/RevisionGallery/RevisionGallery";
import { useOpenAIAPI, useSharedConfigStore } from "@/lib/store";

const Page = () => {
  const API = useOpenAIAPI((state) => state.API);
  const isLoading = useSharedConfigStore((state) => state.isLoading);

  return (
    <div>
      {API === "" && <APIInput />}
      {API !== "" && (
        <div>
          <Header />
          <div className="flex flex-row justify-between">
            <FeedbackGallery classes="flex-none h-screen overflow-auto pt-16 w-80" />
            <div className="grow flex flex-col">
              <RevisionGallery classes="w-full h-40 flex-none mt-16" />
              <FeedbackVis classes="w-full grow" />
            </div>
            <EssayPanel classes="flex-none w-[512px]" />
          </div>
        </div>
      )}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 backdrop-blur-sm">
          <span className="loading loading-spinner text-warning"></span>
        </div>
      )}
    </div>
  );
};

export default Page;
