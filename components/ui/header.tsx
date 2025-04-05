import Link from "next/link";
import { Button } from "./button";
import { GlobeIcon } from "lucide-react";
import SignOutButton from "../auth/sign-out-button";

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
                                <div className="p-1.5 bg-blue-600/10 rounded-lg cursor-pointer transition-colors">
                                    <GlobeIcon className="h-6 w-6 text-blue-500" />
                                </div>
                            </Link>
                            <Link
                                href="/dashboard"
                                className="text-xl font-semibold text-white  transition-colors cursor-pointer"
                            >
                                WebSight
                            </Link>
                        </div>

                        <div className="hidden md:flex items-center gap-1">
                            <Link href="/dashboard">
                                <Button
                                    variant="ghost"
                                    className="text-gray-400  cursor-pointer"
                                >
                                    Dashboard
                                </Button>
                            </Link>
                            <Link href="/settings">
                                <Button
                                    variant="ghost"
                                    className="text-gray-400 cursor-pointer"
                                >
                                    Settings
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-400">{user?.email}</span>
                            <div className="h-8 w-8 rounded-full bg-blue-600/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-500">
                                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                                </span>
                            </div>
                            <SignOutButton />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}