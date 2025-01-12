"use client";
import React, { useState } from "react";
import Header from "@/components/Header";
import APIInput from "@/components/APIInput";
import FeedbackGallery from "@/components/FeedbackGallery";
import { useOpenAIAPI, useFeedbackStore } from "@/lib/store";
import { FeedbackItem } from "@/lib/type";

const Page = () => {
  const API = useOpenAIAPI((state) => state.API);

  return (
    <div>
      {API === "" && <APIInput />}
      {API !== "" && (
        <div>
          <Header />
          <FeedbackGallery classes="h-screen overflow-auto pt-16 w-80" />
        </div>
      )}
    </div>
  );
};

export default Page;
