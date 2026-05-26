"use client";

import React from "react";
import Link from "next/link";
import { Mail, MessageCircle, MapPin, Clock, ShieldCheck, CreditCard } from "lucide-react";
import { trackWhatsAppClick } from "@/lib/analytics";

export default function FooterPremium() {
  return (
    <footer className="border-t border-slate-100 bg-white">
      <div className="container-custom px-4 py-10 sm:py-12 lg:py-14">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <div className="text-xl font-bold">ROBOHATCH</div>
            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">
              Premium 3D printing for creators, founders, and teams — engineered for trust, speed, and precision.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
              <CreditCard className="text-primary" size={14} /> Secure payments powered by Razorpay
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900">Shop</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link href="/products">All Products</Link></li>
              <li><Link href="/products?category=keychains">Keychains</Link></li>
              <li><Link href="/products?category=lamps">Lamps</Link></li>
              <li><Link href="/upload-3d-file">Upload Design</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link href="/about">About</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href="/terms">Terms & Conditions</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900">Support</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/refund">Refund Policy</Link></li>
              <li><Link href="/shipping">Shipping</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900">Contact</h4>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <a href="mailto:founder@robohatch.in" className="flex items-center gap-2 hover:text-primary">
                <Mail size={16} className="text-primary" /> founder@robohatch.in
              </a>
              <a
                href="https://wa.me/919505551727"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsAppClick('footer')}
                className="flex items-center gap-2 hover:text-primary"
              >
                <MessageCircle size={16} className="text-primary" /> WhatsApp support
              </a>
              <div className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 text-primary" />
                <span>Urbanrise Revolution 1, C-Block 726, Padur, Chennai - 603103, Tamil Nadu, India</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock size={16} className="mt-0.5 text-primary" />
                <span>Support hours: Mon-Sat, 10:00 AM to 7:00 PM IST</span>
              </div>
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                Secure checkout, tracked shipping, and made-to-order production are available before payment.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 text-center text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <span>© {new Date().getFullYear()} ROBOHATCH. All rights reserved.</span>
          <span>Custom manufacturing • Razorpay-secure payments • Insured delivery</span>
        </div>
      </div>
    </footer>
  );
}
