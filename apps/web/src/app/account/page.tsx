'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  User,
  Package,
  Upload,
  Settings,
  LogOut,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Loader,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, AccountProfileSkeleton } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { useUserProfile } from '@/hooks/useUserProfile';
import { formatPrice, formatDate } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

export default function AccountPage() {
  const router = useRouter();
  const { isAuthenticated, logout, setAuth } = useAuthStore();
  const { user, loading, error, refetch } = useUserProfile();
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'uploads'>(
    'profile'
  );
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch user orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!isAuthenticated || activeTab !== 'orders') return;
      
      setOrdersLoading(true);
      setOrdersError('');
      try {
        const response = await apiClient.getOrders();
        if (response.success && response.data) {
          setOrders(response.data);
        }
      } catch (err: any) {
        console.error('Failed to fetch orders:', err);
        setOrdersError('Failed to load orders');
        setOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, activeTab]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleEditClick = () => {
    setEditName(user?.name || '');
    setIsEditing(true);
    setUpdateError('');
    setUpdateSuccess('');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName('');
    setUpdateError('');
    setUpdateSuccess('');
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      setUpdateError('Name cannot be empty');
      return;
    }

    setUpdateLoading(true);
    setUpdateError('');
    setUpdateSuccess('');

    try {
      const response = await apiClient.updateProfile({ name: editName.trim() });
      
      if (response.success && response.data) {
        // Update auth store with new user data
        setAuth(response.data, '');
        setUpdateSuccess('Profile updated successfully!');
        setIsEditing(false);
        
        // Refetch profile to ensure consistency
        setTimeout(() => {
          refetch();
          setUpdateSuccess('');
        }, 2000);
      } else {
        setUpdateError(response.message || 'Failed to update profile');
      }
    } catch (err: any) {
      console.error('Update profile error:', err);
      setUpdateError('Failed to update profile. Please try again.');
    } finally {
      setUpdateLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="py-6 md:py-8">
        <div className="container-custom px-4">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-4xl font-bold mb-2">My Account</h1>
            <p className="text-sm md:text-base text-gray-600">Manage your profile, orders, and uploads</p>
          </div>
          <AccountProfileSkeleton />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">Failed to load profile</p>
          <Button onClick={refetch}>Try Again</Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'shipped':
        return 'info';
      case 'processing':
        return 'warning';
      case 'cancelled':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <div className="py-6 md:py-8">
      <div className="container-custom px-4">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold mb-2">My Account</h1>
          <p className="text-sm md:text-base text-gray-600">Manage your profile, orders, and uploads</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                {/* User Info */}
                <div className="text-center mb-6">
                  <div className="relative w-24 h-24 mx-auto mb-4 bg-primary rounded-full flex items-center justify-center text-white text-3xl font-bold">
                    {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </div>
                  <h2 className="font-bold text-lg mb-1">{user.name || 'User'}</h2>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <Badge variant={user.role === 'ADMIN' ? 'danger' : 'default'} className="mt-2">
                    {user.role}
                  </Badge>
                </div>

                {/* Navigation */}
                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'profile'
                        ? 'bg-primary text-white'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <User size={20} />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'orders'
                        ? 'bg-primary text-white'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <Package size={20} />
                    <span>Orders</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('uploads')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'uploads'
                        ? 'bg-primary text-white'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <Upload size={20} />
                    <span>My Uploads</span>
                  </button>
                  <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-100">
                    <Settings size={20} />
                    <span>Settings</span>
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-red-50 text-red-600"
                  >
                    <LogOut size={20} />
                    <span>Logout</span>
                  </button>
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <h2 className="text-2xl font-bold">Profile Information</h2>
                      <div className="flex gap-2">
                        {!isEditing && (
                          <>
                            <Button 
                              variant="secondary" 
                              onClick={refetch}
                              disabled={loading}
                            >
                              {loading ? (
                                <Loader size={16} className="mr-2 animate-spin" />
                              ) : null}
                              Refresh
                            </Button>
                            <Button variant="secondary" onClick={handleEditClick}>
                              Edit Profile
                            </Button>
                          </>
                        )}
                        {isEditing && (
                          <>
                            <Button 
                              variant="ghost" 
                              onClick={handleCancelEdit}
                              disabled={updateLoading}
                            >
                              Cancel
                            </Button>
                            <Button 
                              variant="primary" 
                              onClick={handleUpdateProfile}
                              disabled={updateLoading}
                            >
                              {updateLoading ? (
                                <>
                                  <Loader size={16} className="mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                'Save Changes'
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
                      >
                        {error}
                      </motion.div>
                    )}

                    {updateError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
                      >
                        {updateError}
                      </motion.div>
                    )}

                    {updateSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm"
                      >
                        {updateSuccess}
                      </motion.div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="flex items-center text-sm text-gray-600 mb-2">
                            <User size={16} className="mr-2" />
                            Full Name
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="Enter your name"
                              disabled={updateLoading}
                            />
                          ) : (
                            <p className="font-medium">{user.name || 'Not set'}</p>
                          )}
                        </div>

                        <div>
                          <label className="flex items-center text-sm text-gray-600 mb-2">
                            <Mail size={16} className="mr-2" />
                            Email Address
                          </label>
                          <p className="font-medium">{user.email}</p>
                          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="flex items-center text-sm text-gray-600 mb-2">
                            <Calendar size={16} className="mr-2" />
                            Member Since
                          </label>
                          <p className="font-medium">
                            {formatDate(user.createdAt)}
                          </p>
                        </div>

                        <div>
                          <label className="flex items-center text-sm text-gray-600 mb-2">
                            <MapPin size={16} className="mr-2" />
                            Default Address
                          </label>
                          <p className="font-medium text-gray-500">
                            No address added yet
                          </p>
                          <Button variant="ghost" size="sm" className="mt-2">
                            Add Address
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <Card>
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl font-bold text-primary mb-2">
                        {orders.length}
                      </div>
                      <p className="text-gray-600">Total Orders</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl font-bold text-primary mb-2">
                        {formatPrice(
                          orders.reduce((sum, order) => sum + Number(order.total), 0)
                        )}
                      </div>
                      <p className="text-gray-600">Total Spent</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl font-bold text-primary mb-2">0</div>
                      <p className="text-gray-600">Custom Uploads</p>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-6">Order History</h2>

                    {ordersLoading && (
                      <div className="flex justify-center py-12">
                        <Loader size={32} className="animate-spin text-primary" />
                      </div>
                    )}

                    {ordersError && (
                      <div className="text-center py-12">
                        <p className="text-red-600 mb-4">{ordersError}</p>
                        <Button onClick={() => setActiveTab('orders')} variant="secondary">
                          Try Again
                        </Button>
                      </div>
                    )}

                    {!ordersLoading && !ordersError && orders.length === 0 && (
                      <div className="text-center py-12">
                        <Package size={64} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No Orders Yet</h3>
                        <p className="text-gray-600 mb-6">
                          Start shopping to see your orders here
                        </p>
                        <Link href="/products">
                          <Button>Browse Products</Button>
                        </Link>
                      </div>
                    )}

                    {!ordersLoading && !ordersError && orders.length > 0 && (
                      <div className="space-y-4">
                        {orders.map((order) => (
                          <div
                            key={order.id}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <p className="font-semibold text-lg">
                                  Order #{order.id.slice(0, 8).toUpperCase()}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Placed on {formatDate(order.createdAt)}
                                </p>
                              </div>
                              <Badge variant={getStatusColor(order.status.toLowerCase()) as any}>
                                {order.status.charAt(0).toUpperCase() +
                                  order.status.slice(1).toLowerCase()}
                              </Badge>
                            </div>

                            <div className="space-y-2 mb-4">
                              {order.items && order.items.map((item: any) => (
                                <div
                                  key={item.id}
                                  className="flex items-center space-x-3 text-sm"
                                >
                                  <div className="relative w-12 h-12 bg-gray-100 rounded flex-shrink-0">
                                    {item.product?.images?.[0]?.url ? (
                                      <Image
                                        src={item.product.images[0].url}
                                        alt={item.product.name}
                                        fill
                                        className="object-cover rounded"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded">
                                        <Package size={24} className="text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium line-clamp-1">
                                      {item.product?.name || 'Product'}
                                    </p>
                                    <p className="text-gray-600">Qty: {item.quantity} × {formatPrice(Number(item.price))}</p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t">
                              <p className="font-bold text-lg">
                                Total: {formatPrice(Number(order.total))}
                              </p>
                              <div className="flex gap-2">
                                <Link href={`/order/success?orderId=${order.id}`}>
                                  <Button variant="secondary" size="sm">
                                    View Details
                                  </Button>
                                </Link>
                                {order.status === 'DELIVERED' && (
                                  <Button size="sm">Buy Again</Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Uploads Tab */}
            {activeTab === 'uploads' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-6">My Custom Uploads</h2>

                    <div className="text-center py-12">
                      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Upload size={48} className="text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">
                        No Uploads Yet
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Start uploading your custom 3D designs to get them printed
                      </p>
                      <Link href="/upload-3d-file">
                        <Button size="lg">
                          <Upload className="mr-2" size={20} />
                          Upload Design
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
