/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from "react";
import { formatRupiah } from "../utils";

interface StatCardProps {
  id: string;
  title: string;
  value: number | string;
  icon: ReactNode;
  colorClass?: string; // e.g. "text-emerald-400", "text-amber-400"
  description?: string;
  badgeText?: string;
  badgeColorClass?: string;
}

export default function StatCard({
  id,
  title,
  value,
  icon,
  colorClass = "text-blue-500",
  description,
  badgeText,
  badgeColorClass = "bg-blue-500/10 text-blue-500 border-blue-500/20",
}: StatCardProps) {
  return (
    <div
      id={id}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all shadow-md hover:shadow-lg relative overflow-hidden group"
    >
      <div className={`absolute -right-2 -bottom-2 opacity-5 text-zinc-100 group-hover:scale-110 group-hover:${colorClass} transition-transform duration-500`}>
        {icon}
      </div>
      
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">
            {title}
          </span>
          <h3 className={`text-2xl font-bold tracking-tight font-mono ${colorClass}`}>
            {typeof value === "number" ? formatRupiah(value) : value}
          </h3>
        </div>
        <div className={`p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 group-hover:${colorClass} group-hover:border-zinc-700 transition-all`}>
          {icon}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800/80">
        <span className="text-xs text-zinc-400 truncate max-w-[70%]">
          {description || "Total akumulasi dana"}
        </span>
        {badgeText && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColorClass}`}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
}
