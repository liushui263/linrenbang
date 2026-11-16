"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveArea } from "@/app/actions/location";

export default function AreaSelect({ areas, value }: { areas: string[]; value: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="片区"
      value={value ?? ""}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await saveArea(e.target.value || null);
          router.refresh();
        })
      }
      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
    >
      <option value="">全部片区</option>
      {areas.map((a) => (
        <option key={a} value={a}>
          {a}
        </option>
      ))}
    </select>
  );
}
