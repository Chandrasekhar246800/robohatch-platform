"use client";

import React from "react";
import { motion } from "framer-motion";

const TESTIMONIALS = [
  { name: 'Priya R.', text: 'Amazing quality — prints matched the CAD precisely.', role: 'Product Designer' },
  { name: 'Arun K.', text: 'Fast turnaround and engineering checks saved our prototype run.', role: 'Founder' },
  { name: 'Sneha M.', text: 'Great support and insured delivery — highly recommended.', role: 'Maker' },
];

export default function Testimonials() {
  return (
    <section className="py-12 lg:py-16">
      <div className="container-custom px-4">
        <motion.h2 initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="text-2xl font-bold">What builders say</motion.h2>
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.08}} className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <article key={i} className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-slate-700">“{t.text}”</p>
              <div className="mt-4 text-sm font-semibold">{t.name}</div>
              <div className="text-xs text-slate-500">{t.role}</div>
            </article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
