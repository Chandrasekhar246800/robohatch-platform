"use client";

import React from 'react';
import { Truck, Shield, RefreshCcw } from 'lucide-react';

type Props = {
  shippingEta?: string;
  returnsText?: string;
  helper?: string;
};

export default function TrustRow({
  shippingEta = 'Ships in 48–72 hrs',
  returnsText = '30‑day returns',
  helper = 'Secure payments powered by Razorpay',
}: Props) {
  return (
    <div data-testid="trust-row" className="w-full bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between text-xs text-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Truck className="text-primary" size={16} />
            <div>
              <div className="font-medium text-xs text-gray-900">{shippingEta}</div>
              <div className="text-[11px] text-gray-500">Fast, insured delivery</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <RefreshCcw className="text-primary" size={16} />
            <div>
              <div className="font-medium text-xs text-gray-900">{returnsText}</div>
              <div className="text-[11px] text-gray-500">Hassle-free returns</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Shield className="text-primary" size={16} />
          <div className="text-xs text-gray-700">{helper}</div>
        </div>
      </div>
    </div>
  );
}
