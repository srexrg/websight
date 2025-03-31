"use client"

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  LineChart, 
  Menu, 
  X, 
  ArrowRight, 
  Globe,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header 
        className="fixed top-0 left-0 right-0 z-50 py-4 dark:bg-black/70 backdrop-blur-lg shadow-md"
      >
        <div className="container mx-auto px-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 relative z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-lg blur-sm"></div>
              <div className="p-1.5 dark:bg-gray-900 rounded-lg border border-violet-100 dark:border-violet-900 relative">
                <Globe className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <span className="text-lg font-semibold bg-gradient-to-r from-violet-700 to-indigo-600 bg-clip-text text-transparent">
              WebSight
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 relative z-10">
            <NavLink href="#features">Features</NavLink>
            <NavLink href="#pricing">Pricing</NavLink>
            <NavLink href="#customers">Customers</NavLink>
            <NavLink href="/docs">Documentation</NavLink>
          </nav>

          {/* Desktop Call-to-actions */}
          <div className="hidden md:flex items-center gap-3 relative z-10">
            <Link href="/auth">
              <Button 
                variant="ghost" 
                className="text-sm font-medium rounded-full px-4 hover:bg-violet-50 dark:hover:bg-violet-900/20"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/auth">
              <Button 
                className="text-sm font-medium bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-full px-5 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all duration-300"
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
            className="md:hidden relative z-50"
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
            className="fixed inset-0 z-40 dark:bg-gray-900 flex flex-col pt-24 pb-8 px-6"
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
                <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </MobileNavLink>
            </nav>
            
            <div className="mt-auto space-y-3">
              <Link href="/auth" className="block">
                <Button 
                  variant="outline" 
                  className="w-full rounded-full text-center py-6 h-auto"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/auth" className="block">
                <Button 
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full py-6 h-auto"
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
    className="px-4 py-2 text-sm font-medium rounded-full text-gray-700 dark:hover:bg-violet-900/20 hover:text-violet-700transition-colors relative group"
  >
    {children}
    <span className="absolute inset-x-0 -bottom-px h-px scale-x-0 group-hover:scale-x-100 transition-transform duration-300 bg-gradient-to-r from-violet-400 to-indigo-400"></span>
  </Link>
);

// Mobile navigation link
const MobileNavLink = ({ href, onClick, children }: { href: string, onClick: () => void, children: React.ReactNode }) => (
  <Link 
    href={href} 
    onClick={onClick}
    className="py-3 text-lg font-medium border-b dark:border-gray-800 flex items-center text-gray-900"
  >
    {children}
  </Link>
);

export default Navbar;
