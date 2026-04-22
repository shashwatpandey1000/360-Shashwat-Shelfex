'use client';

import * as React from 'react';
import { Building2, Clock, Rocket, Check, type LucideIcon } from 'lucide-react';

interface StepDef {
  key: string;
  label: string;
  sub: string;
  icon: LucideIcon;
}

const STEPS: StepDef[] = [
  {
    key: 'details',
    label: 'Organization details',
    sub: 'Tell us about your business',
    icon: Building2,
  },
  {
    key: 'review',
    label: 'Under review',
    sub: 'We verify your registration',
    icon: Clock,
  },
  {
    key: 'active',
    label: 'Get started',
    sub: 'Access your dashboard',
    icon: Rocket,
  },
];

export type OnboardingStepKey = (typeof STEPS)[number]['key'];

export function VerticalStepRail({ currentStep }: { currentStep: string }) {
  const activeIndex = STEPS.findIndex((s) => s.key === currentStep);
  return (
    <ol className="flex flex-col items-start gap-0">
      {STEPS.map((step, i) => {
        const isLast = i === STEPS.length - 1;
        const isDone = i < activeIndex;
        const isActive = i === activeIndex;
        const filled = isActive || isDone;
        const Icon = step.icon;
        return (
          <li key={step.key} className="relative flex items-center gap-4">
            <div className="relative flex flex-col items-center self-stretch">
              <div
                className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center border ${
                  filled
                    ? 'border-[#131313] bg-[#131313] text-white dark:border-white dark:bg-white dark:text-[#131313]'
                    : 'border-gray-300 bg-white text-gray-400 dark:border-gray-800 dark:bg-[#131313] dark:text-gray-600'
                }`}
              >
                {isDone ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  <Icon className="h-4 w-4" strokeWidth={2} />
                )}
              </div>
              {!isLast && (
                <span
                  className={`min-h-8 w-px grow ${
                    isDone ? 'bg-[#131313] dark:bg-white' : 'bg-gray-200 dark:bg-gray-800'
                  }`}
                />
              )}
            </div>
            <div className={`flex flex-col justify-center ${!isLast ? 'pb-8' : ''}`}>
              <div
                className={`text-[14px] ${
                  isActive
                    ? 'font-medium text-[#131313] dark:text-white'
                    : isDone
                      ? 'text-[#131313] dark:text-white'
                      : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {step.label}
              </div>
              <div className="text-[12px] text-gray-400 dark:text-gray-500">{step.sub}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
