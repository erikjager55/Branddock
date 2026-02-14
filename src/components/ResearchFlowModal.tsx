import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { CustomConfetti } from './CustomConfetti';
import {
  Brain,
  Users,
  MessageCircle,
  FileText,
  Sparkles,
  CheckCircle2,
  Loader2,
  ArrowRight,
  TrendingUp,
  Unlock,
  Crown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ResearchMethod {
  id: string;
  name: string;
  icon: any;
  duration: string;
  unlocksPotential: number;
  unlockLevel: 'free' | 'basic' | 'pro';
}

interface ResearchFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  method: ResearchMethod;
  assetName: string;
  onComplete: (methodId: string) => void;
}

type FlowStep = 'start' | 'working' | 'completed';

export function ResearchFlowModal({
  isOpen,
  onClose,
  method,
  assetName,
  onComplete,
}: ResearchFlowModalProps) {
  const [step, setStep] = useState<FlowStep>('start');
  const [progress, setProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const MethodIcon = method.icon;

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('start');
      setProgress(0);
      setShowConfetti(false);
    }
  }, [isOpen]);

  // Simulate research progress
  useEffect(() => {
    if (step !== 'working') return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setStep('completed');
            setShowConfetti(true);
            onComplete(method.id);
            
            // Stop confetti after 3 seconds
            setTimeout(() => setShowConfetti(false), 3000);
          }, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [step, method.id, onComplete]);

  const handleStart = () => {
    setStep('working');
  };

  const handleClose = () => {
    if (step === 'completed') {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogContent className="sm:max-w-[600px] overflow-hidden">
        <CustomConfetti
          active={showConfetti}
          numberOfPieces={50}
          duration={3000}
        />

        <AnimatePresence mode="wait">
          {/* STEP 1: START */}
          {step === 'start' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <DialogHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#1FD1B2] to-blue-500 flex items-center justify-center">
                    <MethodIcon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <DialogTitle className="text-2xl">Start {method.name}</DialogTitle>
                      {method.unlockLevel === 'free' && (
                        <Badge className="bg-[#1FD1B2] text-white hover:bg-[#1FD1B2]">
                          FREE
                        </Badge>
                      )}
                      {method.unlockLevel === 'basic' && (
                        <Badge variant="outline">
                          <Crown className="h-3 w-3 mr-1" />
                          Basic
                        </Badge>
                      )}
                    </div>
                    <DialogDescription className="text-sm text-muted-foreground">
                      For {assetName}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-6">
                {/* Impact Preview */}
                <div className="bg-gradient-to-br from-[#1FD1B2]/10 to-blue-500/10 rounded-xl p-6 border border-[#1FD1B2]/20">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-[#1FD1B2]/20 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-6 w-6 text-[#1FD1B2]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">
                        Unlock +{method.unlocksPotential}% decision power
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        This research expands your ability to make strategic decisions for {assetName}.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-xs text-muted-foreground mb-1">Estimated time</div>
                    <div className="font-semibold">{method.duration}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-xs text-muted-foreground mb-1">Decision impact</div>
                    <div className="font-semibold text-[#1FD1B2]">+{method.unlocksPotential}%</div>
                  </div>
                </div>

                {/* What to Expect */}
                <div>
                  <h4 className="font-semibold mb-3">What can you expect?</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {method.id === 'ai-exploration' && (
                      <>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#1FD1B2] mt-0.5 flex-shrink-0" />
                          <span>AI-generated insights within minutes</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#1FD1B2] mt-0.5 flex-shrink-0" />
                          <span>Strategic recommendations based on best practices</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#1FD1B2] mt-0.5 flex-shrink-0" />
                          <span>No cost, instantly available</span>
                        </li>
                      </>
                    )}
                    {method.id === 'canvas-workshop' && (
                      <>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#1FD1B2] mt-0.5 flex-shrink-0" />
                          <span>Interactive session with stakeholders</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#1FD1B2] mt-0.5 flex-shrink-0" />
                          <span>Facilitated exercises and templates</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#1FD1B2] mt-0.5 flex-shrink-0" />
                          <span>Direct consensus and alignment</span>
                        </li>
                      </>
                    )}
                    {method.id === 'interviews' && (
                      <>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#1FD1B2] mt-0.5 flex-shrink-0" />
                          <span>Deep conversations with key stakeholders</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#1FD1B2] mt-0.5 flex-shrink-0" />
                          <span>Qualitative insights and stories</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#1FD1B2] mt-0.5 flex-shrink-0" />
                          <span>Personal perspectives and nuance</span>
                        </li>
                      </>
                    )}
                    {method.id === 'questionnaire' && (
                      <>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#1FD1B2] mt-0.5 flex-shrink-0" />
                          <span>Structured questionnaire for broad public</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#1FD1B2] mt-0.5 flex-shrink-0" />
                          <span>Quantitative data and statistics</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#1FD1B2] mt-0.5 flex-shrink-0" />
                          <span>Representative results and trends</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  size="lg"
                  onClick={handleStart}
                  className="bg-[#1FD1B2] hover:bg-[#1AB89A] text-white"
                >
                  Start research
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: WORKING */}
          {step === 'working' && (
            <motion.div
              key="working"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="py-12"
            >
              {/* Hidden accessibility description */}
              <DialogHeader className="sr-only">
                <DialogTitle>Research in progress</DialogTitle>
                <DialogDescription>
                  {method.name} is currently being conducted for {assetName}
                </DialogDescription>
              </DialogHeader>

              <div className="text-center space-y-6">
                {/* Animated Icon */}
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="inline-flex h-24 w-24 rounded-2xl bg-gradient-to-br from-[#1FD1B2] to-blue-500 items-center justify-center"
                >
                  <MethodIcon className="h-12 w-12 text-white" />
                </motion.div>

                <div>
                  <h3 className="text-2xl font-bold mb-2">
                    {method.name} in progress...
                  </h3>
                  <p className="text-muted-foreground">
                    {progress < 30 && 'Initializing research'}
                    {progress >= 30 && progress < 60 && 'Collecting data'}
                    {progress >= 60 && progress < 90 && 'Generating insights'}
                    {progress >= 90 && 'Finalizing results'}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <Progress value={progress} className="h-3" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
                    <span className="font-semibold text-[#1FD1B2]">
                      +{Math.round((progress / 100) * method.unlocksPotential)}% unlocked
                    </span>
                  </div>
                </div>

                {/* Loading Indicator */}
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>This may take a moment...</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: COMPLETED */}
          {step === 'completed' && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Hidden accessibility description */}
              <DialogHeader className="sr-only">
                <DialogTitle>Research completed</DialogTitle>
                <DialogDescription>
                  {method.name} was successfully completed for {assetName}
                </DialogDescription>
              </DialogHeader>

              <div className="text-center py-8 space-y-6">
                {/* Success Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="inline-flex h-24 w-24 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center"
                >
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </motion.div>

                <div>
                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-bold mb-2"
                  >
                    Research completed! 🎉
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-muted-foreground"
                  >
                    {method.name} was successfully completed for {assetName}
                  </motion.p>
                </div>

                {/* Impact Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800"
                >
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Unlock className="h-6 w-6 text-green-600" />
                    <div className="text-3xl font-bold text-green-600">
                      +{method.unlocksPotential}%
                    </div>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Decision power increased • Asset closer to unlock
                  </p>
                </motion.div>

                {/* Next Steps */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-left bg-muted/50 rounded-lg p-4"
                >
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#1FD1B2]" />
                    Next steps
                  </h4>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li>• Review the research results</li>
                    <li>• Conduct more research to further unlock the asset</li>
                    <li>• Start making strategic decisions once the asset is unlocked</li>
                  </ul>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-3 pt-4 border-t"
              >
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Back to overview
                </Button>
                <Button
                  size="lg"
                  onClick={handleClose}
                  className="flex-1 bg-[#1FD1B2] hover:bg-[#1AB89A] text-white"
                >
                  View results
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}