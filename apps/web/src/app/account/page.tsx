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
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
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
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'uploads' | 'addresses'>(
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
  // Address management state
  const [addresses, setAddresses] = useState<any[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [addressFormData, setAddressFormData] = useState({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    isDefault: false,
  });
  const [addressFormLoading, setAddressFormLoading] = useState(false);
  const [addressFormError, setAddressFormError] = useState('');

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

  // Fetch user addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!isAuthenticated || activeTab !== 'addresses') return;
      
      setAddressesLoading(true);
      setAddressesError('');
      try {
        const response = await apiClient.getAddresses();
        if (response.success && response.data) {
          setAddresses(response.data);
        }
      } catch (err: any) {
        console.error('Failed to fetch addresses:', err);
        setAddressesError('Failed to load addresses');
        setAddresses([]);
      } finally {
        setAddressesLoading(false);
      }
    };

    fetchAddresses();
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

  // Address management handlers
  const handleAddAddress = () => {
    setEditingAddress(null);
    setAddressFormData({
      fullName: user?.name || '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
      isDefault: addresses.length === 0,
    });
    setAddressFormError('');
    setShowAddressModal(true);
  };

  const handleEditAddress = (address: any) => {
    setEditingAddress(address);
    setAddressFormData({
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
    });
    setAddressFormError('');
    setShowAddressModal(true);
  };

  const handleSaveAddress = async () => {
    // Validation
    if (!addressFormData.fullName.trim() || !addressFormData.phone.trim() || 
        !addressFormData.addressLine1.trim() || !addressFormData.city.trim() || 
        !addressFormData.state.trim() || !addressFormData.postalCode.trim()) {
      setAddressFormError('Please fill in all required fields');
      return;
    }

    setAddressFormLoading(true);
    setAddressFormError('');

    try {
      if (editingAddress) {
        // Update existing address
        const response = await apiClient.updateAddress(editingAddress.id, addressFormData);
        if (response.success) {
          setAddresses(addresses.map(addr => 
            addr.id === editingAddress.id ? response.data : addr
          ));
          setShowAddressModal(false);
        } else {
          setAddressFormError(response.message || 'Failed to update address');
        }
      } else {
        // Create new address
        const response = await apiClient.createAddress(addressFormData);
        if (response.success) {
          setAddresses([...addresses, response.data]);
          setShowAddressModal(false);
        } else {
          setAddressFormError(response.message || 'Failed to add address');
        }
      }
    } catch (err: any) {
      console.error('Save address error:', err);
      setAddressFormError('Failed to save address. Please try again.');
    } finally {
      setAddressFormLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const response = await apiClient.deleteAddress(addressId);
      if (response.success) {
        setAddresses(addresses.filter(addr => addr.id !== addressId));
      }
    } catch (err: any) {
      console.error('Delete address error:', err);
      alert('Failed to delete address');
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      const response = await apiClient.setDefaultAddress(addressId);
      if (response.success) {
        setAddresses(addresses.map(addr => ({
          ...addr,
          isDefault: addr.id === addressId
        })));
      }
    } catch (err: any) {
      console.error('Set default address error:', err);
      alert('Failed to set default address');
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
                  <button
                    onClick={() => setActiveTab('addresses')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'addresses'
                        ? 'bg-primary text-white'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <MapPin size={20} />
                    <span>Addresses</span>
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
                            {user.createdAt ? formatDate(user.createdAt) : 'Not available'}
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

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold">Saved Addresses</h2>
                      <Button onClick={handleAddAddress} size="sm">
                        <Plus size={16} className="mr-2" />
                        Add Address
                      </Button>
                    </div>

                    {addressesLoading && (
                      <div className="flex justify-center py-12">
                        <Loader size={32} className="animate-spin text-primary" />
                      </div>
                    )}

                    {addressesError && (
                      <div className="text-center py-12">
                        <p className="text-red-600 mb-4">{addressesError}</p>
                        <Button onClick={() => setActiveTab('addresses')} variant="secondary">
                          Try Again
                        </Button>
                      </div>
                    )}

                    {!addressesLoading && !addressesError && addresses.length === 0 && (
                      <div className="text-center py-12">
                        <MapPin size={64} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No Addresses Saved</h3>
                        <p className="text-gray-600 mb-6">
                          Add your delivery address for faster checkout
                        </p>
                        <Button onClick={handleAddAddress}>
                          <Plus size={16} className="mr-2" />
                          Add Your First Address
                        </Button>
                      </div>
                    )}

                    {!addressesLoading && !addressesError && addresses.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {addresses.map((address) => (
                          <div
                            key={address.id}
                            className={`border rounded-lg p-4 ${
                              address.isDefault ? 'border-primary bg-primary/5' : 'border-gray-200'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold">{address.fullName}</p>
                                  {address.isDefault && (
                                    <Badge variant="success">Default</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{address.phone}</p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditAddress(address)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title="Edit address"
                                >
                                  <Edit2 size={16} className="text-gray-600" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAddress(address.id)}
                                  className="p-1 hover:bg-red-50 rounded"
                                  title="Delete address"
                                >
                                  <Trash2 size={16} className="text-red-600" />
                                </button>
                              </div>
                            </div>
                            <div className="text-sm text-gray-700 mb-3">
                              <p>{address.addressLine1}</p>
                              {address.addressLine2 && <p>{address.addressLine2}</p>}
                              <p>{address.city}, {address.state} {address.postalCode}</p>
                              <p>{address.country}</p>
                            </div>
                            {!address.isDefault && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleSetDefaultAddress(address.id)}
                                className="w-full"
                              >
                                Set as Default
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Address Modal */}
                {showAddressModal && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                    >
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold">
                          {editingAddress ? 'Edit Address' : 'Add New Address'}
                        </h3>
                        <button
                          onClick={() => setShowAddressModal(false)}
                          className="p-2 hover:bg-gray-100 rounded-full"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      {addressFormError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                          {addressFormError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={addressFormData.fullName}
                            onChange={(e) =>
                              setAddressFormData({ ...addressFormData, fullName: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            disabled={addressFormLoading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            value={addressFormData.phone}
                            onChange={(e) =>
                              setAddressFormData({ ...addressFormData, phone: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            disabled={addressFormLoading}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address Line 1 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={addressFormData.addressLine1}
                            onChange={(e) =>
                              setAddressFormData({ ...addressFormData, addressLine1: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="House no., Street name"
                            disabled={addressFormLoading}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address Line 2
                          </label>
                          <input
                            type="text"
                            value={addressFormData.addressLine2}
                            onChange={(e) =>
                              setAddressFormData({ ...addressFormData, addressLine2: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Landmark, Area (optional)"
                            disabled={addressFormLoading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={addressFormData.city}
                            onChange={(e) =>
                              setAddressFormData({ ...addressFormData, city: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            disabled={addressFormLoading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            State <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={addressFormData.state}
                            onChange={(e) =>
                              setAddressFormData({ ...addressFormData, state: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            disabled={addressFormLoading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Postal Code <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={addressFormData.postalCode}
                            onChange={(e) =>
                              setAddressFormData({ ...addressFormData, postalCode: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            disabled={addressFormLoading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Country <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={addressFormData.country}
                            onChange={(e) =>
                              setAddressFormData({ ...addressFormData, country: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            disabled={addressFormLoading}
                          />
                        </div>

                        {!editingAddress && addresses.length > 0 && (
                          <div className="md:col-span-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={addressFormData.isDefault}
                                onChange={(e) =>
                                  setAddressFormData({ ...addressFormData, isDefault: e.target.checked })
                                }
                                className="mr-2"
                                disabled={addressFormLoading}
                              />
                              <span className="text-sm text-gray-700">Set as default address</span>
                            </label>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3 mt-6">
                        <Button
                          variant="ghost"
                          onClick={() => setShowAddressModal(false)}
                          disabled={addressFormLoading}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveAddress}
                          disabled={addressFormLoading}
                          className="flex-1"
                        >
                          {addressFormLoading ? (
                            <>
                              <Loader size={16} className="mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check size={16} className="mr-2" />
                              Save Address
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
