import Link from "next/link";
import { Button } from "./button";
import { Bell, GlobeIcon, ImageIcon, Settings } from "lucide-react";

interface HeaderProps {
    user: {
        email?: string;
    };
}

export function Header({ user }: HeaderProps) {
    return (
        <header className="border-b border-zinc-800 py-4 backdrop-blur-xl bg-black/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard">
                                <div className="p-1.5 bg-blue-600/10 rounded-lg cursor-pointer hover:bg-blue-600/20 transition-colors">
                                    <GlobeIcon className="h-6 w-6 text-blue-500" />
                                </div>
                            </Link>
                            <Link
                                href="/dashboard"
                                className="text-xl font-semibold text-white hover:text-blue-400 transition-colors cursor-pointer"
                            >
                                WebSight
                            </Link>
                        </div>

                        <div className="hidden md:flex items-center gap-1">
                            <Link href="/dashboard">
                                <Button
                                    variant="ghost"
                                    className="text-gray-400 hover:text-white cursor-pointer"
                                >
                                    Dashboard
                                </Button>
                            </Link>
                            <Link href="/settings">
                                <Button
                                    variant="ghost"
                                    className="text-gray-400 hover:text-white cursor-pointer"
                                >
                                    Settings
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="h-8 w-px bg-zinc-800"></div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-400">{user?.email}</span>
                            <div className="h-8 w-8 rounded-full bg-blue-600/10 flex items-center justify-center cursor-pointer">
                                <span className="text-sm font-medium text-blue-500">
                                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}