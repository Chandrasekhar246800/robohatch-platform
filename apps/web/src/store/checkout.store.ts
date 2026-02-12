import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ShippingAddress {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface CheckoutState {
  // Address data
  shippingAddress: ShippingAddress | null;
  
  // Order data
  orderId: string | null;
  razorpayOrderId: string | null;
  paymentId: string | null;
  
  // Step tracking
  currentStep: 'address' | 'payment' | 'processing' | 'complete';
  
  // Actions
  setShippingAddress: (address: ShippingAddress) => void;
  setOrderId: (orderId: string) => void;
  setRazorpayOrderId: (razorpayOrderId: string) => void;
  setPaymentId: (paymentId: string) => void;
  setCurrentStep: (step: 'address' | 'payment' | 'processing' | 'complete') => void;
  clearCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      // Initial state
      shippingAddress: null,
      orderId: null,
      razorpayOrderId: null,
      paymentId: null,
      currentStep: 'address',

      // Actions
      setShippingAddress: (address) => set({ shippingAddress: address }),
      
      setOrderId: (orderId) => set({ orderId }),
      
      setRazorpayOrderId: (razorpayOrderId) => set({ razorpayOrderId }),
      
      setPaymentId: (paymentId) => set({ paymentId }),
      
      setCurrentStep: (step) => set({ currentStep: step }),
      
      clearCheckout: () => set({
        shippingAddress: null,
        orderId: null,
        razorpayOrderId: null,
        paymentId: null,
        currentStep: 'address',
      }),
    }),
    {
      name: 'robohatch-checkout-storage',
    }
  )
);
