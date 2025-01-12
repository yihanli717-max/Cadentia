"use client";
import React, { useState } from "react";
import { useOpenAIAPI } from "@/lib/store";
import { noto_serif } from "@/app/fonts";

const APIInput = () => {
  const [input, setIupt] = useState("");
  const API = useOpenAIAPI((state) => state.API);
  const setAPI = useOpenAIAPI((state) => state.setAPI);

  return (
    <div className="h-screen w-full flex items-center justify-center">
      <div className="flex flex-col gap-2 p-8 bg-white rounded-lg border w-[512px] select-none">
        <p className={noto_serif.className}>
          Hi there! Welcome to CritiqueComposer!
        </p>

        <div className="flex flex-col gap-2 w-full">
          <input
            type="text"
            value={input}
            placeholder="Your OpenAI API Key..."
            onChange={(event) => {
              setIupt(event.target.value);
            }}
            className="input input-bordered w-full"
          />
          <button
            className="btn"
            onClick={() => {
              setAPI(input);
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default APIInput;
