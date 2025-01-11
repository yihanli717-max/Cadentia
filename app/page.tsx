"use client";
import React, { useState } from "react";
import Header from "@/components/Header";
import APIInput from "@/components/APIInput";
import { useOpenAIAPI } from "@/lib/store";

const Page = () => {
  const API = useOpenAIAPI((state) => state.API);

  return (
    <div>
      {API === "" && <APIInput />}
      {API !== "" && (
        <div>
          <Header />
        </div>
      )}
    </div>
  );
};

export default Page;
