"use client";

import React from "react";

type Props = {
  price?: number;
  label?: string;
  onAction?: () => void;
  disabled?: boolean;
  helperText?: string;
};

export default function StickyMobileCTA({
  price,
  label = "Add to cart",
  onAction,
  disabled = false,
  helperText = "Secure checkout · Insured shipping",
}: Props) {
  return (
    <div data-testid="sticky-mobile-cta" className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
        <div>
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-lg font-semibold text-slate-900">{price ? `₹${price}` : '—'}</div>
          <div className="text-[11px] text-slate-500">{helperText}</div>
        </div>
        <button
          onClick={onAction}
          disabled={disabled}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {label}
        </button>
      </div>
    </div>
  );
}
