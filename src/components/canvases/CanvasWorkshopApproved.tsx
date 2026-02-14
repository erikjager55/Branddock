import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import {
  CheckCircle,
  Calendar,
  Download,
  Lock,
  Unlock,
  Table,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Users,
  Clock,
  MapPin,
  FileText,
  Sparkles,
  Target,
  Lightbulb,
  TrendingUp
} from 'lucide-react';
import { WorkshopReport } from './WorkshopReport';

interface Workshop {
  id: string;
  date: string;
  time: string;
  description: string;
  assets?: string[];
  hasFacilitator?: boolean;
  facilitatorName?: string;
  approvedAt?: string;
  approvedBy?: string;
  participantCount?: number;
}

interface Asset {
  id: string;
  name: string;
  icon: any;
  type: string;
}

interface CanvasWorkshopApprovedProps {
  workshops: Workshop[];
  selectedWorkshopId: string | null;
  onWorkshopSelect: (id: string) => void;
  availableAssets: Asset[];
  onReopenSession?: () => void;
  onBack: () => void;
  onSwitchToInProgress?: () => void;
}

export function CanvasWorkshopApproved({
  workshops,
  selectedWorkshopId,
  onWorkshopSelect,
  availableAssets,
  onReopenSession,
  onBack,
  onSwitchToInProgress
}: CanvasWorkshopApprovedProps) {
  const [isReportLocked, setIsReportLocked] = useState(true);
  const [currentWorkshopIndex, setCurrentWorkshopIndex] = useState(0);

  // Mock workshop results data - in real app this would come from backend
  const workshopResults = workshops.map((workshop, index) => ({
    id: workshop.id,
    name: `${workshop.description} Workshop`,
    status: 'completed',
    completedDate: workshop.date,
    lastUpdated: workshop.date,
    dataPoints: Math.floor(Math.random() * 50) + 30,
    participantCount: workshop.participantCount || Math.floor(Math.random() * 8) + 4,
    sessionDuration: `${Math.floor(Math.random() * 2) + 1}.5 hours`,
    metrics: {
      stakeholderAlignment: Math.floor(Math.random() * 15) + 85,
      conceptClarity: Math.floor(Math.random() * 15) + 80,
      feasibilityScore: Math.floor(Math.random() * 15) + 82,
      innovationIndex: Math.floor(Math.random() * 15) + 78
    }
  }));

  const currentWorkshop = workshops[currentWorkshopIndex];
  const currentResults = workshopResults[currentWorkshopIndex];

  const goToPreviousWorkshop = () => {
    if (currentWorkshopIndex > 0) {
      setCurrentWorkshopIndex(currentWorkshopIndex - 1);
    }
  };

  const goToNextWorkshop = () => {
    if (currentWorkshopIndex < workshops.length - 1) {
      setCurrentWorkshopIndex(currentWorkshopIndex + 1);
    }
  };

  if (!currentWorkshop || !currentResults) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No completed workshops found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Workshop Navigator */}
      {workshops.length > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goToPreviousWorkshop}
            disabled={currentWorkshopIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Workshop
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Workshop {currentWorkshopIndex + 1} of {workshops.length}
            </p>
            <p className="font-medium text-lg mt-1">{currentResults.name}</p>
          </div>

          <Button
            variant="outline"
            onClick={goToNextWorkshop}
            disabled={currentWorkshopIndex === workshops.length - 1}
            className="gap-2"
          >
            Next Workshop
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Completion Banner with Action Buttons */}
      <Card className="border-[#1FD1B2]/30 bg-gradient-to-br from-[#1FD1B2]/5 to-emerald-50/50 dark:from-[#1FD1B2]/10 dark:to-emerald-950/20 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1FD1B2] to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-[#1F2937] dark:text-green-400 mb-2">
                Workshop Complete
              </h3>
              <p className="text-slate-700 dark:text-green-300 mb-4 leading-relaxed">
                Your workshop results have been successfully captured from {currentResults.participantCount} participants across a {currentResults.sessionDuration} session.
              </p>
              <div className="flex items-center gap-3 flex-wrap text-sm text-slate-600 dark:text-green-300">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Completed: {currentResults.completedDate}</span>
                </div>
                <span className="text-slate-400">•</span>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{currentResults.participantCount} participants</span>
                </div>
                <span className="text-slate-400">•</span>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{currentResults.sessionDuration}</span>
                </div>
                {currentWorkshop.hasFacilitator && (
                  <>
                    <span className="text-slate-400">•</span>
                    <div className="flex items-center gap-2">
                      <span>Facilitator: {currentWorkshop.facilitatorName}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap pt-5 border-t border-[#1FD1B2]/20">
            <Button 
              variant={isReportLocked ? "default" : "outline"}
              onClick={() => setIsReportLocked(!isReportLocked)}
              className={isReportLocked 
                ? "bg-[#1FD1B2] hover:bg-[#1FD1B2]/90 text-white" 
                : "hover:border-[#1FD1B2] hover:text-[#1FD1B2] transition-colors bg-white/80 dark:bg-slate-900/80"
              }
            >
              {isReportLocked ? (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Locked
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Unlocked
                </>
              )}
            </Button>
            <Button variant="outline" className="hover:border-[#1FD1B2] hover:text-[#1FD1B2] transition-colors bg-white/80 dark:bg-slate-900/80">
              <Download className="h-4 w-4 mr-2" />
              PDF download
            </Button>
            <Button variant="outline" className="hover:border-[#1FD1B2] hover:text-[#1FD1B2] transition-colors bg-white/80 dark:bg-slate-900/80">
              <Table className="h-4 w-4 mr-2" />
              Download raw data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workshop Report */}
      <WorkshopReport 
        isLocked={isReportLocked}
        onLockToggle={() => setIsReportLocked(!isReportLocked)}
      />

      {/* Bottom Actions */}
      <div className="flex justify-between items-center pt-6 pb-4 border-t border-border">
        <Button 
          variant="outline" 
          onClick={onSwitchToInProgress} 
          size="lg"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Return to In Progress
        </Button>
        <Button 
          size="lg" 
          onClick={onBack}
          className="bg-[#1FD1B2] hover:bg-[#1FD1B2]/90 text-white shadow-sm"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Done
        </Button>
      </div>
    </div>
  );
}