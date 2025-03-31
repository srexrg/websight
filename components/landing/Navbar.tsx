"use client"

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  X, 
  ArrowRight,
  Globe
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header 
        className="fixed top-0 left-0 right-0 z-50 py-4 bg-black/60 backdrop-blur-xl border-b border-zinc-800"
      >
        <div className="container mx-auto px-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 relative z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg blur-sm opacity-60"></div>
              <div className="p-1.5 bg-zinc-900/80 rounded-lg border border-blue-500/20 relative">
                <Globe className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <span className="text-lg font-semibold text-white">
              WebSight
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 relative z-10">
            <NavLink href="#features">Features</NavLink>
            <NavLink href="#pricing">Pricing</NavLink>
            <NavLink href="#customers">Customers</NavLink>
            <NavLink href="/docs">Docs</NavLink>
          </nav>

          {/* Desktop Call-to-actions */}
          <div className="hidden md:flex items-center gap-3 relative z-10">
            <Link href="/auth">
              <Button 
                variant="ghost" 
                className="text-sm font-medium rounded-md px-4 bg-zinc-900/40 hover:bg-zinc-900/60 text-gray-300 hover:text-white backdrop-blur-xl border border-zinc-800"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/auth">
              <Button 
                className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md px-5 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300"
              >
                Get Started
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden relative z-50 text-gray-300 hover:text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl flex flex-col pt-24 pb-8 px-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <nav className="flex flex-col gap-3 mb-8">
              <MobileNavLink href="#features" onClick={() => setIsMobileMenuOpen(false)}>
                Features
              </MobileNavLink>
              <MobileNavLink href="#pricing" onClick={() => setIsMobileMenuOpen(false)}>
                Pricing
              </MobileNavLink>
              <MobileNavLink href="#customers" onClick={() => setIsMobileMenuOpen(false)}>
                Customers
              </MobileNavLink>
              <MobileNavLink href="/docs" onClick={() => setIsMobileMenuOpen(false)}>
                Documentation
              </MobileNavLink>
            </nav>
            
            <div className="mt-auto space-y-3">
              <Link href="/auth" className="block">
                <Button 
                  variant="outline" 
                  className="w-full rounded-md text-center py-6 h-auto bg-zinc-900/40 hover:bg-zinc-900/60 text-gray-300 hover:text-white backdrop-blur-xl border border-zinc-800"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/auth" className="block">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-md py-6 h-auto shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Get Started
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Desktop navigation link
const NavLink = ({ href, children }: { href: string, children: React.ReactNode }) => (
  <Link 
    href={href} 
    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors relative group"
  >
    {children}
    <span className="absolute inset-x-0 -bottom-px h-px scale-x-0 group-hover:scale-x-100 transition-transform duration-300 bg-blue-500"></span>
  </Link>
);

// Mobile navigation link
const MobileNavLink = ({ href, onClick, children }: { href: string, onClick: () => void, children: React.ReactNode }) => (
  <Link 
    href={href} 
    onClick={onClick}
    className="py-3 text-lg font-medium text-gray-300 hover:text-white border-b border-zinc-800 flex items-center transition-colors"
  >
    {children}
  </Link>
);

export default Navbar;
