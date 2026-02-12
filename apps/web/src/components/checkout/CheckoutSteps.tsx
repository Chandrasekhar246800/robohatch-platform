'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface Step {
  name: string;
  status: 'complete' | 'current' | 'upcoming';
}

interface CheckoutStepsProps {
  currentStep: 'address' | 'payment' | 'processing' | 'complete';
}

export function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  const steps: Step[] = [
    {
      name: 'Address',
      status: currentStep === 'address' 
        ? 'current' 
        : ['payment', 'processing', 'complete'].includes(currentStep) 
        ? 'complete' 
        : 'upcoming',
    },
    {
      name: 'Payment',
      status: currentStep === 'payment' 
        ? 'current' 
        : ['processing', 'complete'].includes(currentStep) 
        ? 'complete' 
        : 'upcoming',
    },
    {
      name: 'Processing',
      status: currentStep === 'processing' 
        ? 'current' 
        : currentStep === 'complete' 
        ? 'complete' 
        : 'upcoming',
    },
    {
      name: 'Complete',
      status: currentStep === 'complete' ? 'complete' : 'upcoming',
    },
  ];

  return (
    <nav aria-label="Progress" className="mb-8">
      <ol role="list" className="flex items-center justify-center">
        {steps.map((step, stepIdx) => (
          <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
            {step.status === 'complete' ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  {stepIdx !== steps.length - 1 && (
                    <div className="h-0.5 w-full bg-primary" />
                  )}
                </div>
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary hover:bg-accent transition-colors">
                  <Check className="h-5 w-5 text-white" aria-hidden="true" />
                  <span className="sr-only">{step.name}</span>
                </div>
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-900 whitespace-nowrap">
                  {step.name}
                </span>
              </>
            ) : step.status === 'current' ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  {stepIdx !== steps.length - 1 && (
                    <div className="h-0.5 w-full bg-gray-200" />
                  )}
                </div>
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
                  <span className="sr-only">{step.name}</span>
                </div>
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-primary whitespace-nowrap">
                  {step.name}
                </span>
              </>
            ) : (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  {stepIdx !== steps.length - 1 && (
                    <div className="h-0.5 w-full bg-gray-200" />
                  )}
                </div>
                <div className="group relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-transparent group-hover:bg-gray-300" aria-hidden="true" />
                  <span className="sr-only">{step.name}</span>
                </div>
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-500 whitespace-nowrap">
                  {step.name}
                </span>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
