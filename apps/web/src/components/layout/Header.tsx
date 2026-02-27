'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ShoppingCart, User, Menu, X, LogOut, Package, Heart, ChevronDown, Sparkles, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';

interface SearchResult {
  id: string;
  name: string;
  price: number;
  images: string[];
  category?: { name: string };
}

export const Header: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const itemCount = useCartStore((state) => state.getItemCount());
  const wishlistCount = useWishlistStore((state) => state.count);
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
        setShowDropdown(false);
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isProfileOpen]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    router.push('/');
  };

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);

    try {
      const response = await apiClient.searchProducts(query);
      if (response.success && response.data) {
        setSearchResults(response.data.slice(0, 5)); // Show max 5 suggestions
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search input change with debouncing
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for debounced search (300ms)
    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  // Handle search form submit (Enter key or search button)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

  // Handle clicking on a search result
  const handleResultClick = (productId: string) => {
    router.push(`/product/${productId}`);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    setIsSearchOpen(false);
  };

  // View all results
  const handleViewAllResults = () => {
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearchOpen(false);
    }
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const navigation = [
    { name: 'Home', href: '/', hideForAdmin: true },
    { name: 'Products', href: '/products', hideForAdmin: true },
    { name: 'Categories', href: '/products', hideForAdmin: true },
    { name: 'Custom Design', href: '/custom-design', hideForAdmin: true },
  ];

  return (
    <header className={`sticky top-0 z-50 bg-white transition-shadow ${isScrolled ? 'shadow-md' : 'shadow-sm'}`}>
      <div className="container-custom">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center space-x-2 group flex-shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center transform group-hover:scale-110 transition-all duration-300">
              <img 
                src="/logo.jpeg" 
                alt="RoboHatch Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xl font-black text-black">
              ROBOHATCH
            </span>
          </Link>

          {/* Center: Search Bar (Desktop) */}
          <div ref={searchRef} className="hidden md:flex flex-1 max-w-2xl mx-4 relative">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative w-full">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for products, brands and more"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => searchQuery.length >= 2 && searchResults.length > 0 && setShowDropdown(true)}
                  className="w-full px-4 py-2.5 pl-12 pr-4 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                  autoComplete="off"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                {isSearching && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-primary animate-spin" size={18} />
                )}
              </div>
            </form>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showDropdown && (searchResults.length > 0 || (searchQuery.length >= 2 && !isSearching)) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border border-gray-200 max-h-96 overflow-y-auto z-50"
                >
                  {searchResults.length > 0 ? (
                    <>
                      <div className="p-2">
                        {searchResults.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => handleResultClick(product.id)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                          >
                            <div className="relative w-12 h-12 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                              {product.images && product.images.length > 0 ? (
                                <Image
                                  src={product.images[0]}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <Package size={20} />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-sm font-semibold text-primary">{formatPrice(product.price)}</p>
                                {product.category && (
                                  <span className="text-xs text-gray-500">• {product.category.name}</span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-gray-200 p-2">
                        <button
                          onClick={handleViewAllResults}
                          className="w-full px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
                        >
                          View all results for "{searchQuery}"
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center">
                      <Package className="mx-auto mb-3 text-gray-400" size={32} />
                      <p className="text-sm font-medium text-gray-900">No products found</p>
                      <p className="text-xs text-gray-500 mt-1">Try different keywords</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-1 sm:space-x-4">
            {/* Search Icon (Desktop Only) */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="hidden md:block p-2 text-gray-600 hover:text-primary transition-colors rounded-lg hover:bg-gray-100"
              aria-label="Search"
            >
              <Search size={22} />
            </button>

            {/* Wishlist (Desktop Only, Only show if authenticated) */}
            {mounted && isAuthenticated && (
              <Link
                href="/wishlist"
                className="hidden sm:flex relative p-2 text-gray-600 hover:text-primary transition-colors rounded-lg hover:bg-gray-100 items-center space-x-1"
                aria-label="Wishlist"
              >
                <Heart size={22} />
                <span className="hidden sm:inline text-sm font-medium">Wishlist</span>
                {wishlistCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md"
                  >
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </motion.span>
                )}
              </Link>
            )}

            {/* Cart - Show on mobile only when authenticated */}
            <Link
              href="/cart"
              className={`relative p-2 text-gray-600 hover:text-primary transition-colors rounded-lg hover:bg-gray-100 items-center space-x-1 ${
                mounted && !isAuthenticated ? 'hidden sm:flex' : 'flex'
              }`}
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
              // Logged In: Profile Icon (Mobile) / Profile Dropdown (Desktop)
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-2 px-2 sm:px-4 py-2 text-gray-700 hover:text-primary transition-colors rounded-lg hover:bg-gray-100 font-medium"
                >
                  <User size={20} />
                  <span className="text-sm hidden sm:inline">{user?.name || 'My Account'}</span>
                  <ChevronDown size={16} className={`transition-transform hidden sm:inline ${isProfileOpen ? 'rotate-180' : ''}`} />
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
                        <div className="flex items-center justify-between flex-1">
                          <span>Wishlist</span>
                          {wishlistCount > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                              {wishlistCount > 9 ? '9+' : wishlistCount}
                            </span>
                          )}
                        </div>
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
              // Not Logged In: Login Button (Show on mobile and desktop)
              <Link href="/login">
                <Button 
                  variant="primary" 
                  size="sm"
                  className="px-4 sm:px-6 font-medium shadow-sm hover:shadow-md transition-shadow"
                >
                  Login
                </Button>
              </Link>
            ) : (
              <div className="w-16 sm:w-20 h-9"></div>
            )}
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
                    onChange={handleSearchChange}
                    className="w-full px-4 py-2.5 pl-12 pr-4 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                    autoFocus
                    autoComplete="off"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  {isSearching && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-primary animate-spin" size={18} />
                  )}
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
                    <div className="flex items-center justify-between flex-1">
                      <span>Wishlist</span>
                      {wishlistCount > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {wishlistCount > 9 ? '9+' : wishlistCount}
                        </span>
                      )}
                    </div>
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
