"use client";

import { useState } from "react";
import ZipGate from "./ZipGate";

interface Props {
  cityName: string;
  zip: string | null;
  needsZip: boolean;
}

/** 顶部常驻：当前城市 + Zip + 更改按钮 */
export default function CityBar({ cityName, zip, needsZip }: Props) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800"
      >
        📍 {cityName}
        {zip ? ` · ${zip}` : ""}
        <span className="text-emerald-600 underline">更改 Zip</span>
      </button>
      <ZipGate open={needsZip || editing} restore={needsZip} currentZip={zip} onClose={editing ? () => setEditing(false) : undefined} />
    </>
  );
}
