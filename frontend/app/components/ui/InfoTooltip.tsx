"use client";

import { useState } from "react";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";

export interface InfoTooltipProps {
  content: string;
}

const InfoTooltip = ({ content }: InfoTooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="text-text-tertiary hover:text-text-secondary transition-colors duration-200"
      >
        <QuestionMarkCircleIcon className="h-5 w-5" />
      </button>

      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm text-white bg-text-primary rounded-lg shadow-lg whitespace-nowrap">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-text-primary"></div>
        </div>
      )}
    </div>
  );
};

InfoTooltip.displayName = "InfoTooltip";

export default InfoTooltip;
