import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, Info, Lightbulb, AlertCircle, Sparkles, X } from 'lucide-react';
import { Button } from './ui/button';

// Tooltip types
export type TooltipType = 'info' | 'tip' | 'warning' | 'new-feature';

interface TooltipConfig {
  type: TooltipType;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
}

const tooltipConfigs: Record<TooltipType, TooltipConfig> = {
  'info': {
    type: 'info',
    icon: Info,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  'tip': {
    type: 'tip',
    icon: Lightbulb,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800'
  },
  'warning': {
    type: 'warning',
    icon: AlertCircle,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800'
  },
  'new-feature': {
    type: 'new-feature',
    icon: Sparkles,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800'
  }
};

// Context for global tooltip state
interface TooltipContextValue {
  showAllTooltips: boolean;
  setShowAllTooltips: (show: boolean) => void;
  dismissedTooltips: Set<string>;
  dismissTooltip: (id: string) => void;
}

const TooltipContext = createContext<TooltipContextValue>({
  showAllTooltips: false,
  setShowAllTooltips: () => {},
  dismissedTooltips: new Set(),
  dismissTooltip: () => {}
});

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  const [showAllTooltips, setShowAllTooltips] = useState(false);
  const [dismissedTooltips, setDismissedTooltips] = useState<Set<string>>(new Set());

  // Load dismissed tooltips from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('dismissed-tooltips');
    if (stored) {
      setDismissedTooltips(new Set(JSON.parse(stored)));
    }
  }, []);

  // Keyboard shortcut: Press ? to show all tooltips
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Don't trigger if user is typing in an input
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }
        
        e.preventDefault();
        setShowAllTooltips(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const dismissTooltip = (id: string) => {
    const newDismissed = new Set(dismissedTooltips);
    newDismissed.add(id);
    setDismissedTooltips(newDismissed);
    localStorage.setItem('dismissed-tooltips', JSON.stringify([...newDismissed]));
  };

  return (
    <TooltipContext.Provider value={{ showAllTooltips, setShowAllTooltips, dismissedTooltips, dismissTooltip }}>
      {children}
    </TooltipContext.Provider>
  );
}

export function useTooltips() {
  return useContext(TooltipContext);
}

// Main HelpTooltip component
export interface HelpTooltipProps {
  id: string;
  type?: TooltipType;
  title?: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  persistent?: boolean; // If true, can't be dismissed
  learnMoreUrl?: string;
  onLearnMore?: () => void;
  triggerElement?: React.ReactNode; // Custom trigger
}

export function HelpTooltip({
  id,
  type = 'info',
  title,
  content,
  placement = 'top',
  persistent = false,
  learnMoreUrl,
  onLearnMore,
  triggerElement
}: HelpTooltipProps) {
  const { showAllTooltips, dismissedTooltips, dismissTooltip } = useTooltips();
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const config = tooltipConfigs[type];
  const Icon = config.icon;

  // Check if dismissed
  useEffect(() => {
    setIsDismissed(dismissedTooltips.has(id));
  }, [dismissedTooltips, id]);

  // Force open when showing all tooltips
  useEffect(() => {
    if (showAllTooltips && !isDismissed) {
      setIsOpen(true);
    } else if (!showAllTooltips) {
      setIsOpen(false);
    }
  }, [showAllTooltips, isDismissed]);

  // Don't render if dismissed
  if (isDismissed && !showAllTooltips) {
    return null;
  }

  const handleDismiss = () => {
    if (!persistent) {
      dismissTooltip(id);
      setIsOpen(false);
    }
  };

  const placementClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-8 border-x-8 border-x-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-8 border-x-8 border-x-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-8 border-y-8 border-y-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-8 border-y-8 border-y-transparent'
  };

  return (
    <div className="relative inline-block">
      {/* Trigger */}
      <button
        type="button"
        className={`inline-flex items-center justify-center rounded-full transition-all ${
          isOpen || showAllTooltips
            ? `${config.bgColor} ${config.color} ring-2 ${config.borderColor.replace('border-', 'ring-')}`
            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
        } ${triggerElement ? '' : 'h-5 w-5'}`}
        onClick={() => !showAllTooltips && setIsOpen(!isOpen)}
        onMouseEnter={() => !showAllTooltips && setIsOpen(true)}
        onMouseLeave={() => !showAllTooltips && setIsOpen(false)}
      >
        {triggerElement || <HelpCircle className="h-4 w-4" />}
      </button>

      {/* Tooltip */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: placement === 'top' ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: placement === 'top' ? 10 : -10 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 ${placementClasses[placement]} w-80`}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => !showAllTooltips && setIsOpen(false)}
          >
            <div className={`rounded-lg border-2 ${config.borderColor} ${config.bgColor} shadow-lg p-4 relative`}>
              {/* Arrow */}
              <div
                className={`absolute ${arrowClasses[placement]}`}
                style={{
                  borderColor: placement === 'top' 
                    ? `${config.bgColor.includes('blue') ? '#dbeafe' : config.bgColor.includes('amber') ? '#fef3c7' : config.bgColor.includes('orange') ? '#ffedd5' : '#f3e8ff'} transparent transparent transparent`
                    : placement === 'bottom'
                    ? `transparent transparent ${config.bgColor.includes('blue') ? '#dbeafe' : config.bgColor.includes('amber') ? '#fef3c7' : config.bgColor.includes('orange') ? '#ffedd5' : '#f3e8ff'} transparent`
                    : placement === 'left'
                    ? `transparent transparent transparent ${config.bgColor.includes('blue') ? '#dbeafe' : config.bgColor.includes('amber') ? '#fef3c7' : config.bgColor.includes('orange') ? '#ffedd5' : '#f3e8ff'}`
                    : `transparent ${config.bgColor.includes('blue') ? '#dbeafe' : config.bgColor.includes('amber') ? '#fef3c7' : config.bgColor.includes('orange') ? '#ffedd5' : '#f3e8ff'} transparent transparent`
                }}
              />

              {/* Close button */}
              {!persistent && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 p-0"
                  onClick={handleDismiss}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}

              {/* Header */}
              <div className="flex items-start gap-3 mb-2">
                <div className={`rounded-lg ${config.bgColor} p-2 ${config.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                {title && (
                  <h4 className="font-semibold flex-1 pt-1.5 pr-6">{title}</h4>
                )}
              </div>

              {/* Content */}
              <p className="text-sm leading-relaxed text-foreground/90 pl-11">
                {content}
              </p>

              {/* Actions */}
              {(learnMoreUrl || onLearnMore) && (
                <div className="mt-3 pl-11">
                  <Button
                    variant="link"
                    size="sm"
                    className={`p-0 h-auto ${config.color}`}
                    onClick={() => {
                      if (onLearnMore) {
                        onLearnMore();
                      } else if (learnMoreUrl) {
                        window.open(learnMoreUrl, '_blank');
                      }
                    }}
                  >
                    Learn more →
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Inline variant (no trigger icon, always visible)
export function InlineHelp({
  id,
  type = 'tip',
  content,
  dismissible = true
}: {
  id: string;
  type?: TooltipType;
  content: string;
  dismissible?: boolean;
}) {
  const { dismissedTooltips, dismissTooltip } = useTooltips();
  const [isDismissed, setIsDismissed] = useState(false);

  const config = tooltipConfigs[type];
  const Icon = config.icon;

  useEffect(() => {
    setIsDismissed(dismissedTooltips.has(id));
  }, [dismissedTooltips, id]);

  if (isDismissed) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-3 mb-4`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${config.color} mt-0.5 flex-shrink-0`} />
        <p className="text-sm flex-1">{content}</p>
        {dismissible && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0 flex-shrink-0"
            onClick={() => dismissTooltip(id)}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// Help indicator badge (shows number of available tooltips)
export function HelpIndicator() {
  const { showAllTooltips, setShowAllTooltips } = useTooltips();

  return (
    <Button
      variant={showAllTooltips ? 'default' : 'outline'}
      size="sm"
      className="gap-2"
      onClick={() => setShowAllTooltips(!showAllTooltips)}
    >
      <HelpCircle className="h-4 w-4" />
      {showAllTooltips ? 'Hide' : 'Show'} Help
      <kbd className="ml-1 px-1.5 py-0.5 text-xs rounded bg-background/50 border border-border">
        ?
      </kbd>
    </Button>
  );
}

// Reset all dismissed tooltips (for testing)
export function resetAllTooltips() {
  localStorage.removeItem('dismissed-tooltips');
  window.location.reload();
}
