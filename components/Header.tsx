import React, { useState } from "react";
import { noto_serif } from "@/app/fonts";
import Link from "next/link";
import { TbInfoCircleFilled } from "react-icons/tb";
import Menu from "@/components/Menu";

type HeaderProps = {};

const Header = ({}: HeaderProps) => {
  return (
    <div className="flex flex-row w-full justify-between items-center p-4 border-b border-base-200 h-[3rem] bg-white absolute top-0 z-[100001]">
      <h1
        className={noto_serif.className + " font-semibold text-lg text-neutral"}
      >
        <Link href="/">Synthia</Link>
      </h1>
      <div className="flex flex-row gap-4 justify-center items-center">
        <Menu classes="z-50" />
        <TbInfoCircleFilled
          size={24}
          className="text-base-300 hover:text-neutral cursor-pointer"
        />
      </div>
    </div>
  );
};

export default Header;
