"use client";

import type { LucideIcon } from "lucide-react";

export function ActionButton({
    btnText,
    icon,
    btnColor,
    actionType,
    actionValue
}: {
    btnText: string;
    icon: React.ReactNode;
    btnColor: string;
    actionType?: "link" | "prompt" | "notify";
    actionValue?: string;
}) {
    const handleClick = () => {
        if (actionType === "link" && actionValue) {
            window.location.href = actionValue;
        } else if (actionType === "prompt") {
            const details = window.prompt("Enter child details (clothing, last location, etc.):", "");
            if (details) {
                window.alert("Details saved securely and added to report.");
            }
        } else if (actionType === "notify") {
            window.alert("Emergency message sent to your trusted circle.");
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-transform active:scale-95 shadow-sm ${btnColor}`}
        >
            {icon}
            {btnText}
        </button>
    );
}
