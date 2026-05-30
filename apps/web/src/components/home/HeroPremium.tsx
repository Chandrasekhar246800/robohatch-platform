"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { trackHeroCta, trackUploadDesignCta } from "@/lib/analytics";

export default function HeroPremium() {
  return (
    <section className="bg-white">
      <div className="container-custom grid gap-8 lg:grid-cols-2 items-center py-20 lg:py-32">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight text-slate-900"
          >
            Precision 3D Manufacturing, Delivered
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-4 text-base md:text-lg text-slate-600 max-w-2xl"
          >
            Upload your design, get engineer-verified prints with DFM checks, and insured
            delivery — secure Razorpay checkout and 24/7 support.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-6 flex flex-wrap gap-3 items-center"
          >
            <Link href="/upload-3d-file">
              <Button size="lg" onClick={() => {
                trackHeroCta('upload_design');
                trackUploadDesignCta('hero');
              }}>
                Upload Design
              </Button>
            </Link>

            <Link href="/products" className="inline-flex">
              <Button variant="secondary" size="lg" onClick={() => trackHeroCta('shop_bestsellers')}>
                Shop Bestsellers
              </Button>
            </Link>
          </motion.div>

        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="order-first lg:order-last"
        >
          <div className="relative rounded-2xl overflow-hidden shadow-2xl">
            <Image
              src="/images/hero-3d-bench.svg"
              alt="3D printed part on bench"
              width={940}
              height={620}
              className="w-full h-auto object-cover"
              priority={true}
            />
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
              <svg className="w-full h-full opacity-10" preserveAspectRatio="none">
                <defs />
              </svg>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
