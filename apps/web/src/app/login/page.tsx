'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Animated Gradient Panel */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.6, 0.05, 0.01, 0.9] }}
        className="hidden md:flex md:w-1/2 lg:w-1/2 bg-gradient-to-br from-dark-espresso via-dark-brown to-primary relative overflow-hidden min-h-[300px] md:min-h-screen"
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: Math.random() * 300 + 50,
                height: Math.random() * 300 + 50,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: `radial-gradient(circle, ${
                  i % 2 === 0 ? '#F27405' : '#F25C05'
                }20, transparent)`,
              }}
              animate={{
                x: [0, Math.random() * 100 - 50, 0],
                y: [0, Math.random() * 100 - 50, 0],
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 10 + Math.random() * 5,
                repeat: Infinity,
                ease: 'easeInOut',
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
              className="text-5xl font-bold mb-6"
              animate={{
                textShadow: [
                  '0 0 20px #F2740540',
                  '0 0 40px #F2740580',
                  '0 0 20px #F2740540',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Welcome to
              <br />
              <span className="text-secondary-peach">ROBOHATCH</span>
            </motion.h2>
            <p className="text-xl text-secondary-peach/80 mb-8">
              Your journey to custom 3D printing excellence
            </p>

            {/* Animated 3D Grid */}
            <motion.div
              className="grid grid-cols-3 gap-4 max-w-xs mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {[...Array(9)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-20 h-20 bg-primary/20 rounded-lg backdrop-blur-sm border border-primary/30"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{
                    scale: 1,
                    rotate: 0,
                  }}
                  transition={{
                    delay: 0.9 + i * 0.05,
                    type: 'spring',
                    stiffness: 200,
                  }}
                  whileHover={{
                    scale: 1.1,
                    backgroundColor: '#F2740530',
                    transition: { duration: 0.2 },
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <LoginForm />
      </div>
    </div>
  );
}
