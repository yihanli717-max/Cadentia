import React, { useState } from "react";
import { noto_serif } from "@/app/fonts";
import Link from "next/link";
import { TbInfoCircleFilled } from "react-icons/tb";
import Menu from "@/components/Menu";

type HeaderProps = {};

const Header = ({}: HeaderProps) => {
  return (
    <div className="flex flex-row w-full justify-between items-center p-4 border-b border-gray-100 h-16 bg-white z-50">
      <h1
        className={
          noto_serif.className + " font-semibold text-md text-gray-800"
        }
      >
        <Link href="/">CritiqueComposer</Link>
      </h1>
      <Menu classes="absolute z-50 left-48" />
      <TbInfoCircleFilled
        size={24}
        className="text-gray-400 hover:text-gray-800 cursor-pointer"
      />
    </div>
  );
};

export default Header;
