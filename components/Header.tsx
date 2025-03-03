import React, { useState } from "react";
import { noto_serif } from "@/app/fonts";
import Link from "next/link";
import { TbX, TbInfoCircleFilled } from "react-icons/tb";
import { eventTracker } from "@/lib/utils";

type HeaderProps = {};

const Header = ({}: HeaderProps) => {
  const [isCardVisible, setIsCardVisible] = useState(false);
  const handleInfoClick = () => {
    // console.log('info clicked');
    setIsCardVisible(true);
  };
  const handleClose = () => {
    setIsCardVisible(false);
  };

  return (
    <div className="flex flex-row w-full justify-between items-center p-4 border-b border-base-200 h-[3rem] bg-white absolute top-0 z-[100001]">
      <h1
        className={noto_serif.className + " font-semibold text-lg text-neutral"}
      >
        <Link href="/">Synthia</Link>
      </h1>
      <div className="flex flex-row gap-4 justify-center items-center">
        <button
          className="btn btn-sm text-xs text-gray-500"
          onClick={() => {
            eventTracker({
              action: "end study",
              data: {},
            });
          }}
        >
          Task End
        </button>
        <TbInfoCircleFilled
          size={24}
          className="text-base-300 hover:text-neutral cursor-pointer"
          onClick={handleInfoClick}
        />
      </div>

      {isCardVisible && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[99999]"
            onClick={handleClose}
          ></div>
          <div className="fixed inset-0 flex justify-center items-center z-[100000]">
            <div className="bg-white p-6 rounded-lg shadow-lg space-y-4">
              <div className="flex flex-row items-center justify-between mb-4">
                <p className={noto_serif.className + " font-semibold text-lg"}>
                  Guide
                </p>
                <TbX
                  size={24}
                  onClick={handleClose}
                  className="cursor-pointer"
                />
              </div>
              <p className="font-semibold">🍰 Helpfulness Metrics</p>
              <ul className="text-sm flex flex-col gap-2 my-2">
                <li className="flex flex-row items-center gap-2">
                  <span className="font-semibold">Actionability</span> is the
                  number of actionable suggestions in the feedback.
                </li>
                <li className="flex flex-row items-center gap-2">
                  <span className="font-semibold">Justification</span> is
                  whether the feedback is justified with reasons.
                </li>
                <li className="flex flex-row items-center gap-2">
                  <span className="font-semibold">Sentiment</span> is whether
                  the feedback is positive or negative.
                </li>
                <li className="flex flex-row items-center gap-2">
                  <span className="font-semibold">Specificity</span> is the
                  degree to which the feedback is specific and detailed.
                </li>
              </ul>
              <hr className="border-dashed" />
              <p className="font-semibold">📑 Feedback Category</p>
              <ul className="text-sm flex flex-col gap-2 my-2">
                <li className="flex flex-row items-center gap-2">
                  <span className="font-semibold">Claims/Ideas</span> feedback
                  critiques the position or claim being argued for.
                </li>
                <li className="flex flex-row items-center gap-2">
                  <span className="font-semibold">
                    Warrant/Reasoning/Backing
                  </span>{" "}
                  feedback focuses on the principle or reasoning of the claim.
                </li>
                <li className="flex flex-row items-center gap-2">
                  <span className="font-semibold">Evidence</span> feedback
                  critiques facts, theorems, or citations for supporting
                  claims/ideas.
                </li>
                <li className="flex flex-row items-center gap-2">
                  <span className="font-semibold">Rebuttal/Reservation</span>{" "}
                  feedback focuses on the development of content that rebuts
                  current claims/ideas.
                </li>
                <li className="flex flex-row items-center gap-2">
                  <span className="font-semibold">General Content</span>{" "}
                  feedback critique content that does not directly support or
                  rebut claims/ideas.
                </li>
                <li className="flex flex-row items-center gap-2">
                  <span className="font-semibold">
                    Conventions/Grammar/Spelling
                  </span>{" "}
                  feedback targets spelling or grammar errors, misusage of
                  punctuation or to follow the organizational conventions of
                  academic writing.
                </li>
                <li className="flex flex-row items-center gap-2">
                  <span className="font-semibold">Organization</span> feedback
                  help the author get a better ﬂow of the paper.
                </li>
                <li className="flex flex-row items-center gap-2">
                  <span className="font-semibold">Word Usage/Clarity</span>{" "}
                  feedback purports to improve the words or phrases for better
                  representation of ideas.
                </li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Header;
