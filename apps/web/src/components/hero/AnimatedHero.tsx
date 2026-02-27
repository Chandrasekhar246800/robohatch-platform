'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Upload, ArrowRight, Sparkles } from 'lucide-react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

export const AnimatedHero: React.FC = () => {
  const brandName = 'ROBOHATCH';
  const tagline = 'Custom 3D Prints. Engineered for You.';

  const letterVariants = {
    hidden: { opacity: 0, y: 50, rotateX: -90 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.6,
        ease: [0.6, 0.05, 0.01, 0.9],
      },
    }),
  };

  const glowVariants = {
    initial: { backgroundPosition: '-200% center' },
    animate: {
      backgroundPosition: '200% center',
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'linear',
      },
    },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.8,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.6, 0.05, 0.01, 0.9],
      },
    },
  };

  const floatingVariants = {
    animate: {
      y: [0, -20, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-dark-espresso">
      {/* Animated Background Gradient */}
      <motion.div
        className="absolute inset-0 opacity-30"
        animate={{
          background: [
            'radial-gradient(circle at 0% 0%, #F27405 0%, transparent 50%)',
            'radial-gradient(circle at 100% 100%, #F25C05 0%, transparent 50%)',
            'radial-gradient(circle at 0% 100%, #8C3503 0%, transparent 50%)',
            'radial-gradient(circle at 100% 0%, #F27405 0%, transparent 50%)',
            'radial-gradient(circle at 0% 0%, #F27405 0%, transparent 50%)',
          ],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />

      {/* Floating Particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-primary/20 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: 'easeInOut',
          }}
        />
      ))}

      <div className="container-custom relative z-10 text-center px-4">
        {/* Brand Name with Letter Animation */}
        <div className="mb-8">
          <div className="flex justify-center items-center gap-x-0.5 sm:gap-x-1 md:gap-x-2">
            {brandName.split('').map((letter, i) => (
              <motion.span
                key={i}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={letterVariants}
                className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-bold text-white relative inline-block whitespace-nowrap"
                style={{ perspective: '1000px' }}
              >
                {letter}
                {/* Glow effect on hover */}
                <motion.span
                  className="absolute inset-0 text-primary blur-xl"
                  whileHover={{ scale: 1.2, opacity: 0.8 }}
                  transition={{ duration: 0.3 }}
                >
                  {letter}
                </motion.span>
              </motion.span>
            ))}
          </div>

          {/* Animated gradient sweep */}
          <motion.div
            variants={glowVariants}
            initial="initial"
            animate="animate"
            className="h-1 w-full mt-4 rounded-full"
            style={{
              background:
                'linear-gradient(90deg, transparent, #F27405, #F25C05, transparent)',
              backgroundSize: '200% 100%',
            }}
          />
        </div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="text-xl md:text-3xl text-secondary-peach mb-12 font-light tracking-wide"
        >
          {tagline}
        </motion.p>

        {/* Floating Icon */}
        <motion.div variants={floatingVariants} animate="animate" className="mb-12">
          <Sparkles className="w-12 h-12 mx-auto text-primary" />
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <motion.div variants={itemVariants}>
            <Link href="/products">
              <AnimatedButton size="lg" className="min-w-[200px] group">
                Shop Products
                <motion.div
                  className="ml-2"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight size={20} />
                </motion.div>
              </AnimatedButton>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Link href="/upload-3d-file">
              <AnimatedButton
                variant="secondary"
                size="lg"
                className="min-w-[200px] bg-transparent border-secondary-peach text-secondary-peach hover:bg-secondary-peach hover:text-dark-espresso"
              >
                <Upload className="mr-2" size={20} />
                Upload Design
              </AnimatedButton>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
