'use client';

import React, { useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, CheckCircle, Rocket } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { useDashboardPreferences, useUpdatePreferences } from '../../hooks/use-dashboard';

// ─── Step Data ─────────────────────────────────────────────

const STEP_1_FEATURES = [
  'Build your brand foundation with proven frameworks',
  'Validate assets through professional research',
  'Generate AI-powered strategies in minutes',
];

const STEP_2_PROCESS = [
  {
    number: 1,
    title: 'Define Your Brand',
    description: 'Create strategic assets like Golden Circle, Vision, and Mission',
  },
  {
    number: 2,
    title: 'Research & Validate',
    description: 'Use 4 methods: Workshops, Surveys, Interviews, or AI Exploration',
  },
  {
    number: 3,
    title: 'Generate Strategy',
    description: 'AI creates campaigns, GTM plans, and customer journeys from your data',
  },
];

const STEP_3_CHECKLIST = [
  'Create your first brand asset (Golden Circle)',
  'Define your target persona',
  'Plan your first research session',
  'Generate your first campaign strategy',
];

// ─── SVG Illustrations ─────────────────────────────────────

function HexagonIllustration() {
  return (
    <motion.svg
      viewBox="0 0 320 320"
      fill="none"
      className="w-full h-full"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Background glow */}
      <circle cx="160" cy="160" r="120" fill="url(#glow1)" opacity="0.15" />
      {/* Large hexagon */}
      <path
        d="M160 40L250 90V190L160 240L70 190V90L160 40Z"
        fill="url(#hex1)"
        opacity="0.2"
        stroke="url(#hex1)"
        strokeWidth="2"
      />
      {/* Medium hexagon */}
      <path
        d="M160 70L225 105V175L160 210L95 175V105L160 70Z"
        fill="url(#hex2)"
        opacity="0.3"
        stroke="url(#hex2)"
        strokeWidth="2"
      />
      {/* Small hexagon */}
      <path
        d="M160 100L200 120V160L160 180L120 160V120L160 100Z"
        fill="url(#hex3)"
        opacity="0.5"
      />
      {/* Center icon */}
      <circle cx="160" cy="140" r="24" fill="#0D9488" />
      <path d="M150 140L157 147L172 132" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Floating circles */}
      <circle cx="80" cy="70" r="8" fill="#5EEAD4" opacity="0.6" />
      <circle cx="250" cy="80" r="6" fill="#14B8A6" opacity="0.5" />
      <circle cx="60" cy="220" r="10" fill="#99F6E4" opacity="0.4" />
      <circle cx="260" cy="210" r="7" fill="#2DD4BF" opacity="0.5" />
      <circle cx="120" cy="260" r="5" fill="#5EEAD4" opacity="0.6" />
      <circle cx="210" cy="260" r="8" fill="#99F6E4" opacity="0.3" />
      <defs>
        <linearGradient id="glow1" x1="40" y1="40" x2="280" y2="280">
          <stop stopColor="#14B8A6" />
          <stop offset="1" stopColor="#5EEAD4" />
        </linearGradient>
        <linearGradient id="hex1" x1="70" y1="40" x2="250" y2="240">
          <stop stopColor="#0D9488" />
          <stop offset="1" stopColor="#5EEAD4" />
        </linearGradient>
        <linearGradient id="hex2" x1="95" y1="70" x2="225" y2="210">
          <stop stopColor="#14B8A6" />
          <stop offset="1" stopColor="#99F6E4" />
        </linearGradient>
        <linearGradient id="hex3" x1="120" y1="100" x2="200" y2="180">
          <stop stopColor="#2DD4BF" />
          <stop offset="1" stopColor="#99F6E4" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}

function ProcessIllustration() {
  return (
    <motion.svg
      viewBox="0 0 320 320"
      fill="none"
      className="w-full h-full"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Connecting lines */}
      <path d="M100 100V160" stroke="#99F6E4" strokeWidth="2" strokeDasharray="4 4" />
      <path d="M100 200V260" stroke="#99F6E4" strokeWidth="2" strokeDasharray="4 4" />
      <path d="M140 80H240" stroke="#5EEAD4" strokeWidth="1.5" opacity="0.4" />
      <path d="M140 180H260" stroke="#5EEAD4" strokeWidth="1.5" opacity="0.4" />
      <path d="M140 280H220" stroke="#5EEAD4" strokeWidth="1.5" opacity="0.4" />
      {/* Block 1 */}
      <rect x="60" y="50" width="80" height="60" rx="12" fill="#0D9488" opacity="0.15" stroke="#0D9488" strokeWidth="2" />
      <text x="100" y="88" textAnchor="middle" fill="#0D9488" fontSize="24" fontWeight="700">1</text>
      <rect x="160" y="55" width="100" height="12" rx="6" fill="#CCFBF1" />
      <rect x="160" y="75" width="70" height="8" rx="4" fill="#E2E8F0" />
      {/* Block 2 */}
      <rect x="60" y="150" width="80" height="60" rx="12" fill="#14B8A6" opacity="0.15" stroke="#14B8A6" strokeWidth="2" />
      <text x="100" y="188" textAnchor="middle" fill="#14B8A6" fontSize="24" fontWeight="700">2</text>
      <rect x="160" y="155" width="120" height="12" rx="6" fill="#CCFBF1" />
      <rect x="160" y="175" width="80" height="8" rx="4" fill="#E2E8F0" />
      {/* Block 3 */}
      <rect x="60" y="250" width="80" height="60" rx="12" fill="#2DD4BF" opacity="0.15" stroke="#2DD4BF" strokeWidth="2" />
      <text x="100" y="288" textAnchor="middle" fill="#2DD4BF" fontSize="24" fontWeight="700">3</text>
      <rect x="160" y="255" width="90" height="12" rx="6" fill="#CCFBF1" />
      <rect x="160" y="275" width="60" height="8" rx="4" fill="#E2E8F0" />
      {/* Decorative dots */}
      <circle cx="270" cy="110" r="6" fill="#5EEAD4" opacity="0.5" />
      <circle cx="250" cy="230" r="4" fill="#99F6E4" opacity="0.6" />
      <circle cx="50" cy="130" r="5" fill="#2DD4BF" opacity="0.4" />
    </motion.svg>
  );
}

function CheckmarkIllustration() {
  return (
    <motion.svg
      viewBox="0 0 320 320"
      fill="none"
      className="w-full h-full"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Outer glow ring */}
      <circle cx="160" cy="160" r="110" fill="url(#checkGlow)" opacity="0.1" />
      <circle cx="160" cy="160" r="90" fill="url(#checkGlow)" opacity="0.15" />
      {/* Main circle */}
      <circle cx="160" cy="160" r="70" fill="url(#checkGrad)" />
      {/* Checkmark */}
      <path
        d="M130 160L150 180L192 138"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Celebration particles */}
      <circle cx="90" cy="80" r="6" fill="#5EEAD4" opacity="0.7" />
      <circle cx="240" cy="90" r="8" fill="#14B8A6" opacity="0.5" />
      <circle cx="70" cy="230" r="7" fill="#99F6E4" opacity="0.5" />
      <circle cx="260" cy="220" r="5" fill="#2DD4BF" opacity="0.6" />
      <circle cx="160" cy="60" r="4" fill="#5EEAD4" opacity="0.8" />
      <circle cx="100" cy="130" r="3" fill="#2DD4BF" opacity="0.6" />
      <circle cx="225" cy="150" r="4" fill="#99F6E4" opacity="0.5" />
      {/* Sparkle stars */}
      <path d="M80 120L83 126L89 129L83 132L80 138L77 132L71 129L77 126Z" fill="#5EEAD4" opacity="0.6" />
      <path d="M245 170L248 176L254 179L248 182L245 188L242 182L236 179L242 176Z" fill="#14B8A6" opacity="0.5" />
      <path d="M200 70L202 74L206 76L202 78L200 82L198 78L194 76L198 74Z" fill="#2DD4BF" opacity="0.7" />
      <defs>
        <radialGradient id="checkGlow" cx="160" cy="160" r="110">
          <stop stopColor="#14B8A6" />
          <stop offset="1" stopColor="#5EEAD4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="checkGrad" x1="90" y1="90" x2="230" y2="230">
          <stop stopColor="#0D9488" />
          <stop offset="1" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}

// ─── Component ──────────────────────────────────────────────

export function OnboardingWizard() {
  const {
    showOnboarding,
    onboardingStep,
    dontShowAgain,
    setOnboardingStep,
    completeOnboarding,
    toggleDontShowAgain,
  } = useDashboardStore();
  const { data: preferences } = useDashboardPreferences();
  const updatePreferences = useUpdatePreferences();

  const step = onboardingStep; // 1 | 2 | 3
  const isFirst = step === 1;
  const isLast = step === 3;

  const handleClose = useCallback(() => {
    completeOnboarding();
    updatePreferences.mutate({
      onboardingComplete: true,
      dontShowOnboarding: dontShowAgain,
    });
  }, [completeOnboarding, updatePreferences, dontShowAgain]);

  const handleNext = useCallback(() => {
    if (isLast) {
      handleClose();
    } else {
      setOnboardingStep((step + 1) as 1 | 2 | 3);
    }
  }, [isLast, handleClose, setOnboardingStep, step]);

  const handlePrevious = useCallback(() => {
    if (!isFirst) {
      setOnboardingStep((step - 1) as 1 | 2 | 3);
    }
  }, [isFirst, setOnboardingStep, step]);

  // Keyboard navigation
  useEffect(() => {
    if (!showOnboarding || preferences?.onboardingComplete) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrevious();
      else if (e.key === 'Escape') handleClose();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showOnboarding, preferences?.onboardingComplete, handleNext, handlePrevious, handleClose]);

  if (!showOnboarding || preferences?.onboardingComplete) return null;

  const progress = (step / 3) * 100;

  return (
    <AnimatePresence>
      <div
        data-testid="onboarding-wizard"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* ── Progress Bar ── */}
          <div className="h-1.5 bg-gray-100">
            <motion.div
              className="h-full rounded-r-full"
              style={{ backgroundColor: '#0D9488' }}
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            />
          </div>

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <Image
                src="/Logo_Branddock_RGB.png"
                alt="Branddock"
                width={130}
                height={23}
                priority
              />
              <span className="text-sm text-gray-400 font-medium">
                Step {step} of 3
              </span>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close onboarding"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ── Dots ── */}
          <div className="flex items-center justify-center gap-2 py-3">
            {[1, 2, 3].map((s) => (
              <motion.button
                key={s}
                onClick={() => setOnboardingStep(s as 1 | 2 | 3)}
                className="rounded-full"
                style={{
                  backgroundColor: s === step ? '#0D9488' : s < step ? '#5EEAD4' : '#E5E7EB',
                }}
                animate={{
                  width: s === step ? 32 : 8,
                  height: 8,
                  scale: s === step ? 1 : 0.9,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                aria-label={`Go to step ${s}`}
              />
            ))}
          </div>

          {/* ── Content ── */}
          <div className="flex-1 relative overflow-hidden" style={{ minHeight: 380 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -60, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="absolute inset-0 px-8 py-6"
              >
                <div className="grid md:grid-cols-2 gap-8 h-full">
                  {/* Left Column */}
                  <div className="flex flex-col justify-center">
                    {step === 1 && <Step1Content />}
                    {step === 2 && <Step2Content />}
                    {step === 3 && <Step3Content />}
                  </div>

                  {/* Right Column — Illustration */}
                  <div className="hidden md:flex items-center justify-center">
                    <div className="w-full max-w-[280px]">
                      {step === 1 && <HexagonIllustration />}
                      {step === 2 && <ProcessIllustration />}
                      {step === 3 && <CheckmarkIllustration />}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Footer ── */}
          <div className="border-t border-gray-100 px-8 py-5">
            <div className="flex items-center justify-between">
              {/* Left: Don't show again */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <Checkbox
                  id="onboarding-dont-show"
                  checked={dontShowAgain}
                  onCheckedChange={() => toggleDontShowAgain()}
                />
                <span className="text-sm text-gray-500">Don&apos;t show this again</span>
              </label>

              {/* Right: Navigation buttons */}
              <div className="flex items-center gap-3">
                {!isFirst && (
                  <button
                    onClick={handlePrevious}
                    className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                )}

                {!isLast && (
                  <button
                    data-testid="skip-tour-button"
                    onClick={handleClose}
                    className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Skip Tour
                  </button>
                )}

                {isLast ? (
                  <motion.button
                    data-testid="get-started-button"
                    onClick={handleClose}
                    className="flex items-center gap-2 px-8 py-3 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
                    style={{ backgroundColor: '#0D9488' }}
                    whileHover={{ backgroundColor: '#0F766E' }}
                    animate={{
                      boxShadow: [
                        '0 0 0 0 rgba(13, 148, 136, 0)',
                        '0 0 0 6px rgba(13, 148, 136, 0.15)',
                        '0 0 0 0 rgba(13, 148, 136, 0)',
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    Get Started
                    <Rocket className="h-4 w-4" />
                  </motion.button>
                ) : (
                  <button
                    data-testid="next-button"
                    onClick={handleNext}
                    className="flex items-center gap-1.5 px-6 py-2.5 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
                    style={{ backgroundColor: '#0D9488' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0F766E'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0D9488'; }}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Keyboard hint */}
            <p className="text-xs text-center text-gray-400 mt-4 pt-3 border-t border-gray-50">
              Tip: Use arrow keys &larr; &rarr; to navigate, or press ESC to skip
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── Step Content Components ────────────────────────────────

function Step1Content() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Welcome to Branddock
        </h2>
        <p className="text-base text-gray-500 leading-relaxed">
          Transform your brand from intuition-driven to data-backed strategy in weeks, not months.
        </p>
      </div>
      <ul className="space-y-3">
        {STEP_1_FEATURES.map((feature, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 + 0.2 }}
            className="flex items-start gap-3"
          >
            <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-gray-600">{feature}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function Step2Content() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          How It Works
        </h2>
        <p className="text-base text-gray-500 leading-relaxed">
          A simple 3-step process to go from brand assets to validated strategies.
        </p>
      </div>
      <div className="space-y-3">
        {STEP_2_PROCESS.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 + 0.2 }}
            className="flex items-start gap-3 p-3.5 rounded-lg border-l-4 bg-teal-50"
            style={{ borderLeftColor: '#14B8A6' }}
          >
            <div className="w-7 h-7 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#0D9488' }}>
              {item.number}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
              <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Step3Content() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Let&apos;s Get Started!
        </h2>
        <p className="text-base text-gray-500 leading-relaxed">
          Follow our Quick Start checklist to unlock the full power of the platform.
        </p>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          You&apos;ll complete:
        </p>
        {STEP_3_CHECKLIST.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 + 0.2 }}
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50"
          >
            <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
              {i + 1}
            </div>
            <span className="text-sm text-gray-700">{item}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
