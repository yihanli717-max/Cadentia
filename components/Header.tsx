import React, { useState } from "react";
import { noto_serif } from "@/app/fonts";
import Link from "next/link";
import { TbX, TbInfoCircleFilled } from "react-icons/tb";

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
          ></div>{" "}
          <div className="fixed inset-0 flex justify-center items-center z-[100000]">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex flex-row items-center justify-between mb-4">
                <p className={noto_serif.className + " font-semibold"}>
                  Feedback Category
                </p>
                <TbX
                  size={24}
                  onClick={handleClose}
                  className="cursor-pointer"
                />
              </div>
              <ul className="text-sm flex flex-col gap-2 mb-2">
                <li className="flex flex-row items-center gap-2">
                  <div className="rounded-full w-3 h-3 bg-pink-500" />
                  <span className="font-semibold">Claims/Ideas</span> feedback
                  critiques the position or claim being argued for.
                </li>
                <li className="flex flex-row items-center gap-2">
                  <div className="rounded-full w-3 h-3 bg-red-500" />
                  <span className="font-semibold">
                    Warrant/Reasoning/Backing
                  </span>{" "}
                  feedback focuses on the principle or reasoning of the claim.
                </li>
                <li className="flex flex-row items-center gap-2">
                  <div className="rounded-full w-3 h-3 bg-orange-500" />
                  <span className="font-semibold">Evidence</span> feedback
                  critiques facts, theorems, or citations for supporting
                  claims/ideas.
                </li>
                <li className="flex flex-row items-center gap-2">
                  <div className="rounded-full w-3 h-3 bg-amber-500" />
                  <span className="font-semibold">
                    Rebuttal/Reservation
                  </span>{" "}
                  feedback focuses on the development of content that rebuts
                  current claims/ideas.
                </li>
                <li className="flex flex-row items-center gap-2">
                  <div className="rounded-full w-3 h-3 bg-stone-500" />
                  <span className="font-semibold">General Content</span>{" "}
                  feedback critique content that does not directly support or
                  rebut claims/ideas.
                </li>
                <li className="flex flex-row items-center gap-2">
                  <div className="rounded-full w-3 h-3 bg-violet-500" />
                  <span className="font-semibold">
                    Conventions/Grammar/Spelling
                  </span>{" "}
                  feedback targets spelling or grammar errors, misusage of
                  punctuation or to follow the organizational conventions of
                  academic writing.
                </li>
                <li className="flex flex-row items-center gap-2">
                  <div className="rounded-full w-3 h-3 bg-blue-500" />
                  <span className="font-semibold">Organization</span> feedback
                  help the author get a better ﬂow of the paper.
                </li>
                <li className="flex flex-row items-center gap-2">
                  <div className="rounded-full w-3 h-3 bg-cyan-500" />
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
