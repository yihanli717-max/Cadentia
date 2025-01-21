"use client";
import React from "react";
import Header from "@/components/Header";
import APIInput from "@/components/APIInput";
import FeedbackGallery from "@/components/FeedbackGallery/FeedbackGallery";
import EssayPanel from "@/components/EssayPanel/EssayPanel";
import { useOpenAIAPI } from "@/lib/store";

const Page = () => {
  const API = useOpenAIAPI((state) => state.API);

  return (
    <div>
      {API === "" && <APIInput />}
      {API !== "" && (
        <div>
          <Header />
          <div className="flex flex-row justify-between">
            <FeedbackGallery classes="h-screen overflow-auto pt-16 w-80" />
            <EssayPanel classes="max-w-lg" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;
