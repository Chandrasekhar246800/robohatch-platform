"use client";

import React from "react";
import { ShieldCheck, CreditCard, Truck, MessageCircle } from "lucide-react";

const ITEMS = [
	{ icon: CreditCard, title: "Secure Payments", subtitle: "Razorpay-backed" },
	{ icon: Truck, title: "Fast Delivery", subtitle: "Insured & tracked" },
	{ icon: ShieldCheck, title: "Engineer QA", subtitle: "DFM & tolerance checks" },
	{ icon: MessageCircle, title: "Support", subtitle: "Chat & WhatsApp" },
];

export default function TrustStrip() {
	return (
		<div className="bg-white/60 py-4">
			<div className="container-custom px-4">
				<div className="flex flex-wrap items-stretch justify-between gap-3">
					{ITEMS.map(({ icon: Icon, title, subtitle }, idx) => (
						<div
							key={idx}
							className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-100 flex-1 min-w-[170px]"
							role="group"
							aria-label={`${title} — ${subtitle}`}
						>
							<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
								<Icon className="text-primary" size={18} />
							</div>
							<div className="leading-tight">
								<div className="text-sm font-semibold">{title}</div>
								<div className="text-xs text-gray-600">{subtitle}</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

