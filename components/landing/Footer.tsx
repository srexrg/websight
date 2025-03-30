"use client"

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, Mail, Instagram, Twitter, Facebook, Linkedin, ArrowRight, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

const Footer = () => {
  return (
    <footer className="relative pt-24 pb-12 overflow-hidden border-t border-violet-100 dark:border-violet-900/30">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-violet-50/50 to-transparent dark:from-violet-950/10 dark:to-transparent"></div>
        <motion.div 
          className="absolute -bottom-80 -left-40 w-96 h-96 rounded-full bg-violet-200/20 dark:bg-violet-900/10 filter blur-3xl"
          animate={{ 
            x: [0, 30, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -bottom-20 right-0 w-80 h-80 rounded-full bg-indigo-200/20 dark:bg-indigo-900/10 filter blur-3xl"
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
              <div className="p-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                <Globe className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-xl font-semibold bg-gradient-to-r from-violet-700 to-indigo-600 bg-clip-text text-transparent">
                WebSight
              </span>
            </div>
            
            <p className="text-muted-foreground mb-6 max-w-md">
              WebSight provides modern web analytics to help businesses understand their audience
              and make data-driven decisions without compromising user privacy.
            </p>
            
            <div className="flex gap-4 mb-6">
              <SocialLink icon={<Twitter className="h-4 w-4" />} href="https://twitter.com" />
              <SocialLink icon={<Linkedin className="h-4 w-4" />} href="https://linkedin.com" />
              <SocialLink icon={<Instagram className="h-4 w-4" />} href="https://instagram.com" />
              <SocialLink icon={<Facebook className="h-4 w-4" />} href="https://facebook.com" />
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-md font-semibold mb-4">Product</h3>
            <nav className="flex flex-col space-y-3">
              <FooterLink href="#features">Features</FooterLink>
              <FooterLink href="#pricing">Pricing</FooterLink>
              <FooterLink href="#customers">Testimonials</FooterLink>
              <FooterLink href="/docs">
                Documentation
                <ExternalLink className="h-3 w-3 ml-1" />
              </FooterLink>
              <FooterLink href="/blog">
                Blog
                <ExternalLink className="h-3 w-3 ml-1" />
              </FooterLink>
            </nav>
          </div>
          
          {/* Company Links */}
          <div>
            <h3 className="text-md font-semibold mb-4">Company</h3>
            <nav className="flex flex-col space-y-3">
              <FooterLink href="/about">About</FooterLink>
              <FooterLink href="/careers">Careers</FooterLink>
              <FooterLink href="/contact">Contact</FooterLink>
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/terms">Terms of Service</FooterLink>
            </nav>
          </div>
        </div>
        
        {/* Newsletter */}
        <div className="py-10 px-6 md:px-12 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 rounded-2xl mb-16">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-xl font-semibold mb-2">Stay up to date</h3>
              <p className="text-muted-foreground mb-0">
                Get the latest news and articles to your inbox every month.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input 
                type="email" 
                placeholder="Enter your email" 
                className="bg-white/70 dark:bg-gray-900/50 backdrop-blur-sm border-violet-100 dark:border-violet-800 rounded-full"
              />
              <Button className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white whitespace-nowrap">
                Subscribe
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-violet-100 dark:border-violet-900/30">
          <p className="text-sm text-muted-foreground order-2 md:order-1 mt-4 md:mt-0">
            © {new Date().getFullYear()} WebSight. All rights reserved.
          </p>
          
          <div className="flex gap-6 order-1 md:order-2">
            <Link href="/" className="text-sm text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
              Privacy
            </Link>
            <Link href="/" className="text-sm text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
              Terms
            </Link>
            <Link href="/" className="text-sm text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
              Cookies
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
    className="p-2 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-full hover:bg-violet-200 dark:hover:bg-violet-800/50 transition-colors"
    target="_blank"
    rel="noopener noreferrer"
  >
    {icon}
  </Link>
);

const FooterLink = ({ href, children }: { href: string, children: React.ReactNode }) => (
  <Link 
    href={href}
    className="text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex items-center"
  >
    {children}
  </Link>
);

export default Footer;
