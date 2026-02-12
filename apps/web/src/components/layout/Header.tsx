'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ShoppingCart, User, Menu, X, LogOut, Package, Heart, ChevronDown, Sparkles, Upload } from 'lucide-react';
import { Button } from '@/components/ui';
import { useCartStore } from '@/store/cart.store';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { motion, AnimatePresence } from 'framer-motion';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  
  const itemCount = useCartStore((state) => state.getItemCount());
  const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useUIStore();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    
    // Handle scroll shadow
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  // Close profile dropdown on ESC
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isProfileOpen]);

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    router.push('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setIsSearchOpen(false);
    }
  };

  const navigation = [
    { name: 'Home', href: '/', hideForAdmin: true },
    { name: 'Products', href: '/products', hideForAdmin: true },
    { name: 'Categories', href: '/products', hideForAdmin: true },
    { name: 'Custom Design', href: '/login?redirect=/upload-3d-file', hideForAdmin: true },
  ];

  return (
    <header className={`sticky top-0 z-50 bg-white transition-shadow ${isScrolled ? 'shadow-md' : 'shadow-sm'}`}>
      <div className="container-custom">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center space-x-2 group flex-shrink-0">
            <div className="w-10 h-10 flex items-center justify-center transform group-hover:scale-110 transition-all duration-300">
              <img 
                src="/logo.jpeg" 
                alt="RoboHatch Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xl font-bold text-gray-900 hidden sm:inline">
              Robo<span className="text-primary">Hatch</span>
            </span>
          </Link>

          {/* Center: Search Bar (Desktop) */}
          <form 
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-2xl mx-4"
          >
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search for products, brands and more"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 pl-12 pr-4 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>
          </form>

          {/* Right: Actions */}
          <div className="flex items-center space-x-1 sm:space-x-4">
            {/* Search Icon (Mobile) */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-primary transition-colors rounded-lg hover:bg-gray-100"
              aria-label="Search"
            >
              <Search size={22} />
            </button>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative p-2 text-gray-600 hover:text-primary transition-colors rounded-lg hover:bg-gray-100 flex items-center space-x-1"
              aria-label="Shopping Cart"
            >
              <ShoppingCart size={22} />
              <span className="hidden sm:inline text-sm font-medium">Cart</span>
              {mounted && itemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-accent text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md"
                >
                  {itemCount > 9 ? '9+' : itemCount}
                </motion.span>
              )}
            </Link>

            {/* Auth Section */}
            {mounted && isAuthenticated ? (
              // Logged In: Profile Dropdown
              <div className="relative hidden sm:block" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-primary transition-colors rounded-lg hover:bg-gray-100 font-medium"
                >
                  <User size={20} />
                  <span className="text-sm">{user?.name || 'My Account'}</span>
                  <ChevronDown size={16} className={`transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2"
                    >
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">Hello,</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>
                      
                      <Link
                        href="/account"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <User size={18} />
                        <span>My Profile</span>
                      </Link>
                      
                      <Link
                        href="/orders"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Package size={18} />
                        <span>My Orders</span>
                      </Link>
                      
                      <Link
                        href="/wishlist"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Heart size={18} />
                        <span>Wishlist</span>
                      </Link>
                      
                      <Link
                        href="/custom-design"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Sparkles size={18} />
                        <span>Custom Design</span>
                      </Link>
                      
                      <Link
                        href="/upload-3d-file"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Upload size={18} />
                        <span>Upload 3D File</span>
                      </Link>
                      
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                        >
                          <LogOut size={18} />
                          <span>Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : mounted ? (
              // Not Logged In: Login Button
              <Link href="/login" className="hidden sm:block">
                <Button 
                  variant="primary" 
                  size="sm"
                  className="px-6 font-medium shadow-sm hover:shadow-md transition-shadow"
                >
                  Login
                </Button>
              </Link>
            ) : (
              <div className="hidden sm:block w-20 h-9"></div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-gray-600 hover:text-primary transition-colors rounded-lg hover:bg-gray-100"
              onClick={toggleMobileMenu}
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden pb-4 overflow-hidden"
            >
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search for products, brands and more"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2.5 pl-12 pr-4 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                    autoFocus
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-200"
          >
            <nav className="container-custom py-4 flex flex-col space-y-1">
              {navigation.map((item: any) => {
                if (item.hideForAdmin && user?.role === 'ADMIN') return null;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className="px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    {item.name}
                  </Link>
                );
              })}
              
              {/* Mobile Auth Section */}
              {isAuthenticated ? (
                <div className="flex flex-col space-y-1 pt-2 border-t border-gray-200 sm:hidden">
                  <div className="px-4 py-2">
                    <p className="text-sm font-medium text-gray-900">Hello,</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  
                  <Link
                    href="/account"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <User size={18} />
                    <span>My Profile</span>
                  </Link>
                  
                  <Link
                    href="/orders"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <Package size={18} />
                    <span>My Orders</span>
                  </Link>
                  
                  <Link
                    href="/wishlist"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <Heart size={18} />
                    <span>Wishlist</span>
                  </Link>
                  
                  <button
                    onClick={() => {
                      handleLogout();
                      closeMobileMenu();
                    }}
                    className="flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col space-y-2 pt-2 border-t border-gray-200 sm:hidden">
                  <Link href="/login" onClick={closeMobileMenu}>
                    <Button variant="primary" size="sm" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link href="/register" onClick={closeMobileMenu}>
                    <Button variant="ghost" size="sm" className="w-full">
                      Register
                    </Button>
                  </Link>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
