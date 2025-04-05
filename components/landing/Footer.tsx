"use client"

import Link from "next/link";
import { Globe } from "lucide-react";
import { motion } from "framer-motion";
import { FaTwitter,FaInstagram,FaLinkedin } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="relative pt-24 pb-12 overflow-hidden border-t border-zinc-800 bg-black">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-100px,#2563eb10,transparent)]" />
        <motion.div 
          className="absolute -bottom-80 -left-40 w-96 h-96 rounded-full bg-blue-500/5 filter blur-3xl"
          animate={{ 
            x: [0, 30, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -bottom-20 right-0 w-80 h-80 rounded-full bg-blue-500/5 filter blur-3xl"
          animate={{ 
            x: [0, -20, 0],
            y: [0, 20, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg blur-sm opacity-60"></div>
                <div className="p-1.5 bg-zinc-900/80 rounded-lg border border-blue-500/20 relative">
                  <Globe className="h-5 w-5 text-blue-400" />
                </div>
              </div>
              <span className="text-lg font-semibold text-white">
                WebSight
              </span>
            </div>
            
            <p className="text-gray-400 mb-6 max-w-md">
              WebSight provides modern web analytics to help businesses understand their audience
              and make data-driven decisions without compromising user privacy.
            </p>
            
            <div className="flex gap-4 mb-6">
              <SocialLink icon={<FaTwitter className="h-4 w-4" />} href="https://twitter.com" />
              <SocialLink icon={<FaLinkedin className="h-4 w-4" />} href="https://linkedin.com" />
              <SocialLink icon={<FaInstagram className="h-4 w-4" />} href="https://instagram.com" />
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-medium text-white mb-6">Product</h3>
            <nav className="flex flex-col space-y-3">
              <FooterLink href="#features">Features</FooterLink>
              <FooterLink href="#pricing">Pricing</FooterLink>
              <FooterLink href="#customers">Testimonials</FooterLink>
              <FooterLink href="/docs">Documentation</FooterLink>
              <FooterLink href="/blog">Blog</FooterLink>
            </nav>
          </div>
          
          {/* Company Links */}
          <div>
            <h3 className="text-lg font-medium text-white mb-6">Company</h3>
            <nav className="flex flex-col space-y-3">
              <FooterLink href="/about">About</FooterLink>
              <FooterLink href="/careers">Careers</FooterLink>
              <FooterLink href="/contact">Contact</FooterLink>
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/terms">Terms of Service</FooterLink>
            </nav>
          </div>
        </div>
        
        
        {/* Bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-zinc-800">
          <p className="text-sm text-gray-400 order-2 md:order-1 mt-4 md:mt-0">
            © {new Date().getFullYear()} WebSight. All rights reserved.
          </p>
          
          <div className="flex gap-6 order-1 md:order-2">
            <Link href="/privacy" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

const SocialLink = ({ icon, href }: { icon: React.ReactNode, href: string }) => (
  <Link 
    href={href}
    className="p-2 bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 text-gray-400 rounded-lg hover:bg-zinc-900/60 hover:text-blue-400 transition-all duration-300"
    target="_blank"
    rel="noopener noreferrer"
  >
    {icon}
  </Link>
);

const FooterLink = ({ href, children }: { href: string, children: React.ReactNode }) => (
  <Link 
    href={href}
    className="text-gray-400 hover:text-blue-400 transition-colors flex items-center group"
  >
    {children}
  </Link>
);

export default Footer;
