"use client";
import { presetRange } from "@/lib/analytics";
import type { DateRange } from "@/lib/analytics";
export function AnalyticsDateFilter({
  range,
  onChange,
}: {
  range: DateRange;
  onChange: (range: DateRange) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <select
        aria-label="Hazır tarih aralığı"
        onChange={(e) => onChange(presetRange(e.target.value))}
        className="h-10 rounded-xl border bg-white px-3 text-sm"
      >
        <option value="today">Bugün</option>
        <option value="yesterday">Dün</option>
        <option value="7d">Son 7 gün</option>
        <option value="30d">Son 30 gün</option>
        <option value="month">Bu ay</option>
        <option value="last-month">Geçen ay</option>
      </select>
      <label className="text-xs font-bold">
        Başlangıç
        <input
          type="date"
          value={range.start}
          onChange={(e) => onChange({ ...range, start: e.target.value })}
          className="mt-1 block h-9 rounded-lg border px-2 font-normal"
        />
      </label>
      <label className="text-xs font-bold">
        Bitiş
        <input
          type="date"
          value={range.end}
          onChange={(e) => onChange({ ...range, end: e.target.value })}
          className="mt-1 block h-9 rounded-lg border px-2 font-normal"
        />
      </label>
    </div>
  );
}
