"use client";

import React from "react";
import { ShieldCheck, CreditCard, Truck, MessageSquare } from "lucide-react";

const ITEMS = [
	{ icon: CreditCard, title: "Secure Payments", subtitle: "Razorpay-backed" },
	{ icon: Truck, title: "Fast Delivery", subtitle: "Insured & tracked" },
	{ icon: ShieldCheck, title: "Engineer QA", subtitle: "DFM & tolerance checks" },
	{ icon: MessageSquare, title: "Support", subtitle: "Chat & WhatsApp" },
];

export default function TrustStrip() {
	return (
		<div className="bg-slate-50 border-t border-b border-slate-100 py-4">
			<div className="container-custom px-4">
				<div className="flex gap-3 flex-wrap items-stretch">
					{ITEMS.map(({ icon: Icon, title, subtitle }, idx) => (
						<div
							key={idx}
							className="flex-1 min-w-[160px] bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm"
						>
							<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
								<Icon className="text-primary" size={18} />
							</div>
							<div>
								<div className="text-sm font-semibold text-slate-900">{title}</div>
								<div className="text-xs text-slate-600">{subtitle}</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

