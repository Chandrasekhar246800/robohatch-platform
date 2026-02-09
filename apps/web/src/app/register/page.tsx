'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Box, Printer, Sparkles } from 'lucide-react';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Animated Gradient Panel */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.6, 0.05, 0.01, 0.9] }}
        className="hidden md:flex md:w-1/2 lg:w-1/2 bg-gradient-to-br from-primary via-accent to-dark-brown relative overflow-hidden min-h-[300px] md:min-h-screen"
      >
        {/* Animated Particles */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -500],
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full text-white p-6 md:p-8 lg:p-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-center"
          >
            <motion.h2
              className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6"
              animate={{
                textShadow: [
                  '0 0 20px #26030340',
                  '0 0 40px #26030380',
                  '0 0 20px #26030340',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Start Your
              <br />
              <span className="text-dark-espresso">Creative Journey</span>
            </motion.h2>
            <p className="text-lg md:text-xl text-dark-espresso/90 mb-8 md:mb-12">
              Join thousands of makers and creators
            </p>

            {/* Animated Feature Cards */}
            <div className="space-y-6 max-w-md">
              {[
                { icon: Printer, text: 'Premium 3D Printing', delay: 0.8 },
                { icon: Box, text: 'Custom Designs', delay: 0.9 },
                { icon: Sparkles, text: 'Fast Delivery', delay: 1.0 },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: feature.delay, duration: 0.5 }}
                  whileHover={{
                    scale: 1.05,
                    x: 10,
                    transition: { duration: 0.2 },
                  }}
                  className="flex items-center space-x-4 bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20"
                >
                  <motion.div
                    animate={{
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.3,
                    }}
                    className="w-12 h-12 bg-dark-espresso rounded-lg flex items-center justify-center"
                  >
                    <feature.icon size={24} className="text-white" />
                  </motion.div>
                  <span className="text-lg font-medium">{feature.text}</span>
                </motion.div>
              ))}
            </div>

            {/* Rotating 3D Shape */}
            <motion.div
              className="mt-12"
              animate={{
                rotateY: 360,
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{ perspective: 1000 }}
            >
              <div className="w-32 h-32 bg-gradient-to-br from-dark-espresso to-transparent border-4 border-white/30 rounded-2xl" />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Register Form */}
      <div className="w-full md:w-1/2 lg:w-1/2 flex items-center justify-center p-4 md:p-6 lg:p-8 bg-gray-50">
        <RegisterForm />
      </div>
    </div>
  );
}
