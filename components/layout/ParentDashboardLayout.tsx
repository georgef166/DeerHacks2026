import Link from "next/link";
import { ReactNode } from "react";
import { Rocky } from "../mascot/Rocky";
import { Home, Bell, Calendar, Settings, LogOut, Gamepad2 } from "lucide-react";

export function ParentDashboardLayout({
    children,
    currentPath = "/dashboard",
    userName = "Parent",
}: {
    children: ReactNode;
    currentPath?: string;
    userName?: string;
}) {
    const navItems = [
        { label: "Dashboard", href: "/dashboard", icon: <Home className="w-[18px] h-[18px] text-indigo-500" /> },
        { label: "Alerts", href: "/dashboard#alerts", icon: <Bell className="w-[18px] h-[18px] text-rose-500" /> },
        { label: "Calendar", href: "/dashboard#calendar", icon: <Calendar className="w-[18px] h-[18px] text-amber-500" /> },
        { label: "Settings", href: "/settings", icon: <Settings className="w-[18px] h-[18px] text-emerald-500" /> },
    ];

    return (
        <div className="min-h-screen bg-transparent text-slate-700 flex flex-col md:flex-row font-sans">
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-white/20 bg-white/30 backdrop-blur-2xl shrink-0 p-8 flex flex-col gap-10">
                <div className="flex items-center gap-3">
                    <Rocky mood="happy" className="scale-90 origin-left" />
                    <span className="text-2xl font-bold tracking-tight text-slate-800">SafeDay</span>
                </div>

                <nav className="flex flex-col gap-3 flex-grow justify-center">
                    {navItems.map((item) => {
                        const isActive = currentPath === item.href;
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={`flex items-center gap-4 px-5 py-4 rounded-3xl transition-all duration-300 ${isActive
                                    ? "bg-slate-800 text-white shadow-lg shadow-slate-200/50 translate-x-1"
                                    : "text-slate-500 hover:bg-white/50 hover:text-slate-800 hover:translate-x-1 card-hover"
                                    }`}
                            >
                                <span className="flex items-center justify-center w-6">{item.icon}</span>
                                <span className="font-medium text-sm">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="pt-6 border-t border-slate-200/50">
                    <a
                        href="/auth/logout"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-slate-700 transition-colors rounded-2xl hover:bg-slate-100/50 duration-300"
                    >
                        <LogOut className="w-[18px] h-[18px] ml-1" /> Sign out
                    </a>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 md:p-10 lg:p-14 w-full overflow-x-hidden">
                {/* Top Header */}
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

                {children}
            </main>
        </div>
    );
}
