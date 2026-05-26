"use client";

import React from "react";
import Image from "next/image";

export default function FounderCred() {
  return (
    <section className="py-12 bg-slate-50">
      <div className="container-custom px-4 flex flex-col lg:flex-row items-center gap-8">
        <div className="w-full lg:w-1/3">
          <Image src="/images/founder.svg" alt="Founder" width={360} height={360} className="rounded-xl object-cover" />
        </div>
        <div className="w-full lg:w-2/3">
          <h3 className="text-xl font-bold">Founder-led engineering</h3>
          <p className="mt-3 text-slate-700">Founded by practicing engineers, RoboHatch optimizes every design for manufacturability. Our team performs DFM reviews and publishes inspection photos on request.</p>
          <div className="mt-4 flex gap-3">
            <a className="text-sm text-primary font-semibold" href="/about">Read our story</a>
            <a className="text-sm text-slate-600" href="/contact">Contact the team</a>
          </div>
        </div>
      </div>
    </section>
  );
}
