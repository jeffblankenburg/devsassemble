"use client";

import { useState } from "react";

/**
 * A comic-styled on/off toggle backed by a hidden native checkbox, so it still
 * submits with the form (`name` → "on" when checked) while looking on-brand.
 */
export function ComicSwitch({
  name,
  defaultChecked = false,
  disabled = false,
}: {
  name: string;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <label
      className={`inline-flex shrink-0 items-center ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={(e) => setOn(e.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden
        className={`relative inline-block h-7 w-12 rounded-full border-ink transition-colors duration-100 ${
          on ? "bg-brand-lime" : "bg-white"
        }`}
      >
        <span
          className={`absolute top-[2px] left-[2px] h-[18px] w-[18px] rounded-full bg-brand-ink transition-transform duration-100 ${
            on ? "translate-x-[20px]" : ""
          }`}
        />
      </span>
    </label>
  );
}
