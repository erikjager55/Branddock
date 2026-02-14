import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { 
  X, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  Target,
  Rocket,
  CheckCircle
} from 'lucide-react';

interface WelcomeModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onGetStarted?: () => void;
}

const WELCOME_MODAL_KEY = 'welcome-modal-shown';

export function WelcomeModal({ isOpen = true, onClose, onGetStarted }: WelcomeModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [direction, setDirection] = useState(1); // 1 for next, -1 for previous

  const slides = [
    {
      id: 'welcome',
      icon: Sparkles,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
      title: 'Welcome to Your Strategic Research Hub',
      description: 'Transform your brand from intuition-driven to data-backed strategy in weeks, not months.',
      image: 'https://images.unsplash.com/photo-1739298061740-5ed03045b280?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtJTIwY29sbGFib3JhdGlvbiUyMHN0cmF0ZWd5fGVufDF8fHx8MTc2NjM5NTkxMXww&ixlib=rb-4.1.0&q=80&w=1080',
      features: [
        'Build your brand foundation with proven frameworks',
        'Validate assets through professional research',
        'Generate AI-powered strategies in minutes'
      ]
    },
    {
      id: 'how-it-works',
      icon: Target,
      iconColor: 'text-[#5252E3]',
      iconBg: 'bg-[#5252E3]/10',
      title: 'How It Works',
      description: 'A simple 3-step process to go from brand assets to validated strategies.',
      image: 'https://images.unsplash.com/photo-1763038311036-6d18805537e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXNlYXJjaCUyMGRhdGElMjBpbnNpZ2h0c3xlbnwxfHx8fDE3NjY0OTcwODR8MA&ixlib=rb-4.1.0&q=80&w=1080',
      steps: [
        {
          number: '1',
          title: 'Define Your Brand',
          description: 'Create strategic assets like Golden Circle, Vision, and Mission',
          color: 'border-primary bg-primary/10'
        },
        {
          number: '2',
          title: 'Research & Validate',
          description: 'Use 4 methods: Workshops, Surveys, Interviews, or AI Exploration',
          color: 'border-[#5252E3] bg-[#5252E3]/10'
        },
        {
          number: '3',
          title: 'Generate Strategy',
          description: 'AI creates campaigns, GTM plans, and customer journeys from your data',
          color: 'border-[#F9FD48] bg-[#F9FD48]/20'
        }
      ]
    },
    {
      id: 'get-started',
      icon: Rocket,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
      title: "Let's Get Started!",
      description: 'Follow our Quick Start checklist to unlock the full power of the platform.',
      image: 'https://images.unsplash.com/photo-1758518731027-78a22c8852ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdWNjZXNzJTIwYWNoaWV2ZW1lbnQlMjBnb2FsfGVufDF8fHx8MTc2NjQxNDc0MXww&ixlib=rb-4.1.0&q=80&w=1080',
      quickWins: [
        'Create your first brand asset (Golden Circle)',
        'Define your target persona',
        'Plan your first research session',
        'Generate your first campaign strategy'
      ]
    }
  ];

  const currentSlideData = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;
  const isFirstSlide = currentSlide === 0;

  const handleNext = () => {
    if (isLastSlide) {
      handleGetStarted();
    } else {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstSlide) {
      setDirection(-1);
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleGetStarted = () => {
    if (dontShowAgain) {
      localStorage.setItem(WELCOME_MODAL_KEY, 'true');
    }
    onGetStarted?.();
    onClose();
  };

  const handleSkip = () => {
    if (dontShowAgain) {
      localStorage.setItem(WELCOME_MODAL_KEY, 'true');
    }
    onClose();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && !isLastSlide) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && !isFirstSlide) {
        handlePrevious();
      } else if (e.key === 'Escape') {
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentSlide, isLastSlide, isFirstSlide]);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -1000 : 1000,
      opacity: 0
    })
  };

  const Icon = currentSlideData.icon;

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-background rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="relative border-b border-border p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-xl">B</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base font-semibold text-foreground">Brandshift</span>
                  <span className="text-base font-semibold text-primary">.ai</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Step {currentSlide + 1} of {slides.length}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Dots */}
          <div className="flex items-center justify-center gap-2 py-4 border-b border-border">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => {
                  setDirection(index > currentSlide ? 1 : -1);
                  setCurrentSlide(index);
                }}
                className={`h-2 rounded-full transition-all ${
                  index === currentSlide
                    ? 'w-8 bg-primary'
                    : index < currentSlide
                    ? 'w-2 bg-primary/50'
                    : 'w-2 bg-muted-foreground/30'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Slide Content */}
          <div className="relative overflow-hidden" style={{ minHeight: '450px' }}>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentSlide}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: 'spring', stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
                className="absolute inset-0 p-8"
              >
                <div className="grid md:grid-cols-2 gap-8 h-full">
                  {/* Left Column - Content */}
                  <div className="flex flex-col justify-center space-y-6">
                    <div>
                      <h3 className="text-3xl font-semibold mb-3">
                        {currentSlideData.title}
                      </h3>
                      <p className="text-lg text-muted-foreground">
                        {currentSlideData.description}
                      </p>
                    </div>

                    {/* Slide 1: Features */}
                    {currentSlideData.id === 'welcome' && currentSlideData.features && (
                      <ul className="space-y-3">
                        {currentSlideData.features.map((feature, index) => (
                          <motion.li
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 + 0.3 }}
                            className="flex items-start gap-3"
                          >
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">{feature}</span>
                          </motion.li>
                        ))}
                      </ul>
                    )}

                    {/* Slide 2: Steps */}
                    {currentSlideData.id === 'how-it-works' && currentSlideData.steps && (
                      <div className="space-y-4">
                        {currentSlideData.steps.map((step, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.15 + 0.3 }}
                            className={`p-4 rounded-lg border-2 ${step.color}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="h-8 w-8 rounded-full bg-white dark:bg-background border-2 border-current flex items-center justify-center shrink-0 font-bold">
                                {step.number}
                              </div>
                              <div>
                                <h4 className="font-semibold mb-1">{step.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {step.description}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Slide 3: Quick Wins */}
                    {currentSlideData.id === 'get-started' && currentSlideData.quickWins && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          You'll Complete:
                        </p>
                        {currentSlideData.quickWins.map((item, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 + 0.3 }}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                          >
                            <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center text-xs font-medium text-muted-foreground">
                              {index + 1}
                            </div>
                            <span>{item}</span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column - Image */}
                  <div className="hidden md:flex items-center justify-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="relative w-full h-full max-h-96 rounded-xl overflow-hidden shadow-xl"
                    >
                      <img
                        src={currentSlideData.image}
                        alt={currentSlideData.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="border-t border-border p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="dont-show"
                  checked={dontShowAgain}
                  onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
                />
                <label
                  htmlFor="dont-show"
                  className="text-sm text-muted-foreground cursor-pointer select-none"
                >
                  Don't show this again
                </label>
              </div>

              <div className="flex items-center gap-3">
                {!isFirstSlide && (
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                )}
                
                {!isLastSlide && (
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                  >
                    Skip Tour
                  </Button>
                )}

                <Button
                  onClick={handleNext}
                  className="gap-2"
                  size="lg"
                >
                  {isLastSlide ? (
                    <>
                      Get Started
                      <Rocket className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Keyboard Hints */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-center text-muted-foreground">
                💡 Tip: Use arrow keys ← → to navigate, or press ESC to skip
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Hook to check if welcome modal should show
export function useShouldShowWelcome(): boolean {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const hasShown = localStorage.getItem(WELCOME_MODAL_KEY);
    setShouldShow(!hasShown);
  }, []);

  return shouldShow;
}

// Function to reset welcome modal (for testing)
export function resetWelcomeModal() {
  localStorage.removeItem(WELCOME_MODAL_KEY);
}