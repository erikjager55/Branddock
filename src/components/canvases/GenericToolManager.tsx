import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { 
  Sparkles,
  CheckCircle,
  Circle,
  ChevronDown,
  Play,
  Check,
  ShoppingCart,
  FileText,
  Info,
  Download,
  Clock,
  Users,
  Euro,
  Calendar,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface GenericToolManagerProps {
  toolName: string;
  toolDescription: string;
  toolIcon: React.ComponentType<{ className?: string }>;
  price: number;
  duration: string;
  deliverables: string;
  includedItems: string[];
  onBack: () => void;
}

export function GenericToolManager({
  toolName,
  toolDescription,
  toolIcon: ToolIcon,
  price,
  duration,
  deliverables,
  includedItems,
  onBack
}: GenericToolManagerProps) {
  const [viewStatus, setViewStatus] = useState<'to-buy' | 'in-progress' | 'approved'>('to-buy');
  const [showDropdown, setShowDropdown] = useState(false);

  // Mock data for in-progress sessions
  const inProgressSessions = [
    {
      id: '1',
      name: `${toolName} Session #1`,
      startedDate: '2025-11-20',
      progress: 60,
      status: 'In progress'
    },
    {
      id: '2',
      name: `${toolName} Session #2`,
      startedDate: '2025-11-22',
      progress: 30,
      status: 'Awaiting input'
    }
  ];

  // Mock data for approved sessions
  const approvedSessions = [
    {
      id: '1',
      name: `${toolName} Session #1`,
      completedDate: '2025-11-15',
      keyOutcomes: ['Comprehensive analysis completed', 'Strategic recommendations provided', 'Implementation roadmap created']
    },
    {
      id: '2',
      name: `${toolName} Session #2`,
      completedDate: '2025-11-10',
      keyOutcomes: ['Detailed insights generated', 'Stakeholder alignment achieved', 'Next steps defined']
    }
  ];

  const getStatusLabel = () => {
    switch (viewStatus) {
      case 'to-buy':
        return 'To Buy';
      case 'in-progress':
        return 'In Progress';
      case 'approved':
        return 'Approved';
    }
  };

  const getStatusIcon = () => {
    switch (viewStatus) {
      case 'to-buy':
        return <ShoppingCart className="h-5 w-5" />;
      case 'in-progress':
        return <Play className="h-5 w-5" />;
      case 'approved':
        return <Check className="h-5 w-5" />;
    }
  };

  const getStatusColor = () => {
    switch (viewStatus) {
      case 'to-buy':
        return 'text-orange-600';
      case 'in-progress':
        return 'text-blue-600';
      case 'approved':
        return 'text-green-600';
    }
  };

  const renderToBuyView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{toolName}</CardTitle>
            <CardDescription>{toolDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">What's Included:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {includedItems.map((item, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <Clock className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm font-medium">Duration</p>
                  <p className="text-xs text-muted-foreground">{duration}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <FileText className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm font-medium">Deliverables</p>
                  <p className="text-xs text-muted-foreground">{deliverables}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="border-primary sticky top-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Package Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Package price:</span>
                <span className="font-medium">€{price}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Duration:</span>
                <span className="font-medium">{duration}</span>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Price:</span>
                <div className="text-2xl font-bold text-primary flex items-center">
                  <Euro className="h-5 w-5" />
                  {price}
                </div>
              </div>
            </div>

            <Separator />

            <Button className="w-full" size="lg">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Purchase Package
            </Button>
            <Button variant="outline" className="w-full" onClick={onBack}>
              Cancel
            </Button>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Delivery:</strong> {deliverables}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderInProgressView = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Play className="h-4 w-4 mr-2 text-blue-600" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            Track and manage ongoing {toolName.toLowerCase()} sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {inProgressSessions.map((session) => (
              <Card key={session.id} className="border-blue-200 dark:border-blue-900">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                          <ToolIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-medium">{session.name}</h4>
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            <span>Started: {session.startedDate}</span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Continue Session</DropdownMenuItem>
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Export Progress</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{session.progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all" 
                          style={{ width: `${session.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <Badge variant="outline" className="bg-background">
                        {session.status}
                      </Badge>
                    </div>

                    <Button className="w-full" variant="outline">
                      <Play className="h-4 w-4 mr-2" />
                      Continue Session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderApprovedView = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Check className="h-4 w-4 mr-2 text-green-600" />
            Completed Sessions
          </CardTitle>
          <CardDescription>
            Review completed {toolName.toLowerCase()} results and insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {approvedSessions.map((session) => (
              <Card key={session.id} className="border-green-200 dark:border-green-900">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h4 className="font-medium">{session.name}</h4>
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            <span>Completed: {session.completedDate}</span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Full Report</DropdownMenuItem>
                          <DropdownMenuItem>Export Data</DropdownMenuItem>
                          <DropdownMenuItem>Share Results</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Key Outcomes</p>
                      <ul className="space-y-1">
                        {session.keyOutcomes.map((outcome, index) => (
                          <li key={index} className="text-sm flex items-start space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{outcome}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex space-x-2">
                      <Button className="flex-1" variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        View Report
                      </Button>
                      <Button className="flex-1" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* PROMINENT VIEW SWITCHER - ALWAYS VISIBLE AT TOP */}
      <div className="bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6 sticky top-20 z-40 shadow-lg mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
              <ToolIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-xl">{toolName}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {viewStatus === 'to-buy' && toolDescription}
                {viewStatus === 'in-progress' && `Track and manage ongoing ${toolName.toLowerCase()} sessions`}
                {viewStatus === 'approved' && `Review completed ${toolName.toLowerCase()} results and insights`}
              </p>
            </div>
          </div>
          
          {/* VIEW SWITCHER DROPDOWN */}
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg" className="min-w-[200px] justify-between bg-background">
                  <div className="flex items-center">
                    <span className={`mr-2 ${getStatusColor()}`}>{getStatusIcon()}</span>
                    <span className="font-medium">{getStatusLabel()}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[220px]">
                <DropdownMenuItem onClick={() => setViewStatus('to-buy')} className="cursor-pointer py-3">
                  <ShoppingCart className="h-4 w-4 mr-2 text-orange-600" />
                  <span>To Buy</span>
                  {viewStatus === 'to-buy' && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewStatus('in-progress')} className="cursor-pointer py-3">
                  <Play className="h-4 w-4 mr-2 text-blue-600" />
                  <span>In Progress</span>
                  {viewStatus === 'in-progress' && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewStatus('approved')} className="cursor-pointer py-3">
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                  <span>Approved</span>
                  {viewStatus === 'approved' && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {viewStatus === 'to-buy' && renderToBuyView()}
      {viewStatus === 'in-progress' && renderInProgressView()}
      {viewStatus === 'approved' && renderApprovedView()}
    </div>
  );
}