"use client";

import Link from "next/link";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Rocky } from "../mascot/Rocky";
import { Home, Bell, Calendar, Settings, LogOut, Gamepad2, X, AlertTriangle, ShieldAlert } from "lucide-react";
import { onIncidentNotification } from "@/lib/notify";
import type { Incident } from "@/lib/types";

export function ParentDashboardLayout({
    children,
    currentPath = "/dashboard",
    userName = "Parent",
    hideGreeting = false,
    userId,
    initialIncidents = [],
}: {
    children: ReactNode;
    currentPath?: string;
    userName?: string;
    hideGreeting?: boolean;
    userId?: string;
    initialIncidents?: Incident[];
}) {
    const [activePath, setActivePath] = useState(currentPath);
    // Seed notifications with server-fetched alerts
    const [notifications, setNotifications] = useState<Incident[]>(() => {
        return initialIncidents
            .filter(i => i.severity === "high" || i.severity === "critical" || i.severity === "medium")
            .slice(0, 5);
    });
    const [showNotificationsList, setShowNotificationsList] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);

    useEffect(() => {
        if (currentPath === "/dashboard") {
            const handleScroll = () => {
                const alertsEl = document.getElementById("alerts");
                if (alertsEl) {
                    const rect = alertsEl.getBoundingClientRect();
                    if (rect.top <= window.innerHeight * 0.5 && rect.bottom >= 0) {
                        setActivePath("/dashboard#alerts");
                        return;
                    }
                }
                setActivePath("/dashboard");
            };

            handleScroll();
            window.addEventListener("scroll", handleScroll);
            return () => window.removeEventListener("scroll", handleScroll);
        } else {
            setActivePath(currentPath);
        }
    }, [currentPath]);

    // Request browser notification permission on mount
    useEffect(() => {
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    // Helper: trigger in-app dropdown + native browser push notification
    const notifTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    function fireNotification(inc: Incident) {
        setHasUnread(true);
        setShowNotificationsList(true);
        setTimeout(() => setShowNotificationsList(false), 8000);

        // Debounce native push: only the latest notification fires (prevents browser throttle)
        if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
        notifTimeoutRef.current = setTimeout(() => {
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                const title = inc.severity === "medium"
                    ? `⚠️ Rocky Warning: ${inc.event_type.replace(/_/g, " ")}`
                    : `🚨 Rocky DANGER: ${inc.event_type.replace(/_/g, " ")}`;
                const body = inc.summary || "An alert was detected. Open Rocky to view details.";
                const n = new Notification(title, {
                    body,
                    tag: `rocky-alert-${inc.id}`,
                    requireInteraction: inc.severity !== "medium",
                });
                n.onclick = () => {
                    window.focus();
                    window.location.href = `/events/${inc.id}`;
                    n.close();
                };
            }
        }, 300);
    }

    // Listen for incidents via BroadcastChannel (cross-tab) + same-tab event bus
    useEffect(() => {
        const unsubscribe = onIncidentNotification((inc) => {
            const isAlert = inc.severity === "high" || inc.severity === "critical" || inc.severity === "medium";
            if (!isAlert) return;

            console.log("[notifications] 🔔 Received incident:", inc.id, inc.event_type, inc.severity);

            // Add to notification list (deduplicate)
            setNotifications(prev => {
                const exists = prev.findIndex(n => n.id === inc.id);
                if (exists >= 0) {
                    const updated = [...prev];
                    updated[exists] = inc;
                    return updated;
                }
                return [inc, ...prev].slice(0, 5);
            });

            fireNotification(inc);
        });

        return unsubscribe;
    }, []);

    const navItems = [
        { label: "Dashboard", href: "/dashboard", icon: <Home className="w-[18px] h-[18px] text-indigo-500" /> },
        { label: "Alerts", href: "/dashboard#alerts", icon: <Bell className="w-[18px] h-[18px] text-rose-500" /> },
        { label: "Calendar", href: "/dashboard/calendar", icon: <Calendar className="w-[18px] h-[18px] text-amber-500" /> },
    ];

    return (
        <div className="min-h-screen bg-transparent text-slate-700 flex flex-col md:flex-row font-sans">
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-200/50 bg-white/60 backdrop-blur-xl shrink-0 p-4 md:p-8 flex flex-col gap-4 md:gap-10 md:sticky md:top-0 md:h-screen z-50">
                <div className="flex items-center justify-between md:justify-start gap-3 px-2 md:px-0">
                    <div className="flex items-center gap-3">
                        <Rocky mood="happy" className="scale-75 md:scale-90 origin-left" />
                        <span className="text-xl md:text-2xl font-bold tracking-tight text-slate-800">Rocky</span>
                    </div>
                    <div className="md:hidden">
                        <a
                            href="/auth/logout"
                            className="p-2 flex text-slate-400 hover:text-slate-700 transition-colors rounded-xl hover:bg-slate-100/50"
                        >
                            <LogOut className="w-5 h-5 flex-shrink-0" />
                        </a>
                    </div>
                </div>

                <nav className="flex flex-row md:flex-col gap-2 md:gap-3 overflow-x-auto snap-x pb-2 md:pb-0 md:flex-grow flex-nowrap shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {navItems.map((item) => {
                        const isActive = activePath === item.href;
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={`flex items-center snap-start gap-2 md:gap-4 px-4 py-2.5 md:px-5 md:py-4 rounded-2xl md:rounded-3xl transition-all duration-300 whitespace-nowrap ${isActive
                                    ? "bg-slate-800 text-white shadow-lg shadow-slate-200/50 md:translate-x-1"
                                    : "text-slate-500 hover:bg-white/50 hover:text-slate-800 md:hover:translate-x-1 card-hover"
                                    }`}
                            >
                                <span className="flex items-center justify-center w-5 md:w-6">{item.icon}</span>
                                <span className="font-medium text-sm">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="hidden md:block pt-6 border-t border-slate-200/50">
                    <a
                        href="/auth/logout"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-slate-700 transition-colors rounded-2xl hover:bg-slate-100/50 duration-300"
                    >
                        <LogOut className="w-[18px] h-[18px] ml-1" /> Sign out
                    </a>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 lg:p-10 w-full overflow-x-hidden relative">

                {/* Top Notification Bell */}
                <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50">
                    <button
                        onClick={() => {
                            setShowNotificationsList(!showNotificationsList);
                            if (!showNotificationsList) setHasUnread(false);
                        }}
                        className="relative p-3 bg-white/60 backdrop-blur-md border border-slate-200 shadow-sm rounded-full card-hover text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <Bell className="w-5 h-5" />
                        {hasUnread && (
                            <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 border-2 border-white rounded-full animate-pulse" />
                        )}
                    </button>
                    {showNotificationsList && (
                        <div className="absolute top-14 right-0 w-80 md:w-96 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl p-4 animate-in fade-in slide-in-from-top-4 origin-top-right">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                                <button onClick={() => setShowNotificationsList(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {notifications.length === 0 ? (
                                <div className="py-4 flex flex-col items-center justify-center text-center">
                                    <ShieldAlert className="w-8 h-8 text-emerald-500 mb-2 opacity-80" />
                                    <p className="text-xs font-medium text-slate-600">All monitoring systems online</p>
                                    <p className="text-[10px] text-slate-400 mt-1">No recent alerts detected.</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                                    {notifications.map((inc) => (
                                        <div key={inc.id} className={`p-3 rounded-xl border flex gap-3 items-start transition-colors ${inc.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                                            <div className={`w-8 h-8 rounded-full flex flex-shrink-0 items-center justify-center ${inc.severity === 'medium' ? 'bg-amber-500' : 'bg-rose-500'}`}>
                                                <AlertTriangle className="w-4 h-4 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-xs font-bold truncate ${inc.severity === 'medium' ? 'text-amber-700' : 'text-rose-700'}`}>
                                                    {inc.severity === 'medium' ? 'Warning: ' : 'Danger: '}
                                                    {inc.event_type.replace(/_/g, " ")}
                                                </h4>
                                                <p className="text-[10px] font-medium text-slate-600 mt-0.5 line-clamp-2">{inc.summary || "Urgent sensor anomaly detected."}</p>
                                                <Link
                                                    href={`/events/${inc.id}`}
                                                    onClick={() => setShowNotificationsList(false)}
                                                    className={`inline-block mt-2 text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors ${inc.severity === 'medium' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}
                                                >
                                                    View Incident &rarr;
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="max-w-7xl mx-auto w-full pt-12 md:pt-0">
                    {/* Top Header */}
                    {!hideGreeting && (
                        <header className="mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div>
                                <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Hello, {userName}</h1>
                                <p className="mt-2 text-slate-500 font-semibold opacity-80">Here is your daily companion update.</p>
                            </div>
                            <Link
                                href="/simulate"
                                className="card-soft px-6 py-3 text-sm font-bold text-slate-600 hover:text-slate-900 border border-white/50 card-hover flex items-center gap-3 bg-white/50 backdrop-blur-md shadow-sm rounded-2xl"
                            >
                                <Gamepad2 className="w-5 h-5 text-sky-500" /> Simulation Studio
                            </Link>
                        </header>
                    )}

                    {children}
                </div>
            </main>
        </div>
    );
}
