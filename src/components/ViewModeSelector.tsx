/**
 * COMPONENT: View Mode Selector
 * 
 * Schakel tussen normale view, executive view, en report mode.
 */

import React from 'react';
import { Button } from './ui/button';
import {
  LayoutDashboard,
  Eye,
  FileText,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export type ViewMode = 'normal' | 'executive' | 'report';

interface ViewModeSelectorProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export function ViewModeSelector({ currentMode, onModeChange }: ViewModeSelectorProps) {
  const getModeIcon = (mode: ViewMode) => {
    switch (mode) {
      case 'executive':
        return Eye;
      case 'report':
        return FileText;
      default:
        return LayoutDashboard;
    }
  };

  const getModeLabel = (mode: ViewMode) => {
    switch (mode) {
      case 'executive':
        return 'Executive View';
      case 'report':
        return 'Report Mode';
      default:
        return 'Platform View';
    }
  };

  const getModeDescription = (mode: ViewMode) => {
    switch (mode) {
      case 'executive':
        return 'Overzicht voor directie en stakeholders';
      case 'report':
        return 'Genereer rapporten voor externe communicatie';
      default:
        return 'Volledige platform functionaliteit';
    }
  };

  const CurrentIcon = getModeIcon(currentMode);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 h-9"
        >
          <CurrentIcon className="h-4 w-4" />
          <span className="hidden lg:inline">{getModeLabel(currentMode)}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Weergave Modus
        </div>
        <DropdownMenuSeparator />
        
        {/* Platform View */}
        <DropdownMenuItem
          onClick={() => onModeChange('normal')}
          className={currentMode === 'normal' ? 'bg-muted' : ''}
        >
          <div className="flex items-start gap-3 py-1">
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
              <LayoutDashboard className="h-4 w-4 text-blue-700 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Platform View</p>
              <p className="text-xs text-muted-foreground">
                Volledige platform functionaliteit
              </p>
            </div>
          </div>
        </DropdownMenuItem>

        {/* Executive View */}
        <DropdownMenuItem
          onClick={() => onModeChange('executive')}
          className={currentMode === 'executive' ? 'bg-muted' : ''}
        >
          <div className="flex items-start gap-3 py-1">
            <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
              <Eye className="h-4 w-4 text-purple-700 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Executive View</p>
              <p className="text-xs text-muted-foreground">
                Overzicht voor directie en stakeholders
              </p>
            </div>
          </div>
        </DropdownMenuItem>

        {/* Report Mode */}
        <DropdownMenuItem
          onClick={() => onModeChange('report')}
          className={currentMode === 'report' ? 'bg-muted' : ''}
        >
          <div className="flex items-start gap-3 py-1">
            <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
              <FileText className="h-4 w-4 text-green-700 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Report Mode</p>
              <p className="text-xs text-muted-foreground">
                Genereer rapporten voor externe communicatie
              </p>
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <div className="px-2 py-2">
          <p className="text-xs text-muted-foreground">
            Alle views gebruiken dezelfde onderliggende data
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
