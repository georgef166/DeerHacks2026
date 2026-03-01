export type RockyMood = "happy" | "concerned" | "sleepy" | "normal";

export function Rocky({ mood = "normal", className = "" }: { mood?: RockyMood; className?: string }) {
    const colors = {
        happy: { bg: "#10b981", face: "#ffffff" }, // Emerald Green
        concerned: { bg: "#f59e0b", face: "#ffffff" }, // Amber
        sleepy: { bg: "#3b82f6", face: "#ffffff" }, // Bright Blue
        normal: { bg: "#a855f7", face: "#ffffff" }, // Vibrant Purple
    };

    const c = colors[mood];

    return (
        <div className={`relative inline-flex items-center justify-center animate-float ${className}`}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="64" height="64" rx="20" fill={c.bg} />
                <g className="animate-blink" style={{ transformOrigin: "center", transformBox: "fill-box" }} fill={c.face}>
                    {mood === "happy" && (
                        <>
                            <path d="M 18 28 Q 22 24 26 28" stroke={c.face} strokeWidth="3" strokeLinecap="round" fill="none" />
                            <path d="M 38 28 Q 42 24 46 28" stroke={c.face} strokeWidth="3" strokeLinecap="round" fill="none" />
                        </>
                    )}
                    {mood === "concerned" && (
                        <>
                            <circle cx="22" cy="28" r="3" />
                            <circle cx="42" cy="28" r="3" />
                            <line x1="18" y1="24" x2="26" y2="26" stroke={c.face} strokeWidth="3" strokeLinecap="round" />
                            <line x1="38" y1="26" x2="46" y2="24" stroke={c.face} strokeWidth="3" strokeLinecap="round" />
                        </>
                    )}
                    {mood === "sleepy" && (
                        <>
                            <line x1="18" y1="28" x2="26" y2="28" stroke={c.face} strokeWidth="3" strokeLinecap="round" />
                            <line x1="38" y1="28" x2="46" y2="28" stroke={c.face} strokeWidth="3" strokeLinecap="round" />
                        </>
                    )}
                    {mood === "normal" && (
                        <>
                            <circle cx="22" cy="28" r="3" />
                            <circle cx="42" cy="28" r="3" />
                        </>
                    )}
                </g>
                <g stroke={c.face} strokeWidth="3" strokeLinecap="round" fill="none">
                    {mood === "happy" && <path d="M 28 36 Q 32 40 36 36" />}
                    {mood === "concerned" && <path d="M 28 38 Q 32 34 36 38" />}
                    {mood === "sleepy" && <circle cx="32" cy="38" r="2" fill={c.face} stroke="none" />}
                    {mood === "normal" && <path d="M 28 36 Q 32 38 36 36" />}
                </g>
            </svg>
        </div>
    );
}
