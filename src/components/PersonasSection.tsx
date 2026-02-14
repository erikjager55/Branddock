import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Grid, 
  List,
  Target,
  CheckCircle,
  Edit,
  MoreVertical,
  Users,
  TrendingUp,
  MessageCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { PageHeader } from './ui/PageHeader';
import { usePersonas } from '../contexts';
import { Persona, PersonaStatus, PersonaResearchMethod } from '../types/persona';
import { PersonaDetailPage } from './personas/PersonaDetailPage';
import { CreatePersona } from './CreatePersona';
import { calculateDecisionStatus } from '../utils/decision-status-calculator';
import { DecisionStatus } from '../types/decision-status';
import { PersonaCardGrid } from './personas/PersonaCard';
import { PersonaAIExplorationPage } from './personas/PersonaAIExplorationPage';
import { PersonaChatModal } from './personas/PersonaChatModal';
import { toast } from 'sonner';
import { 
  SPACING, 
  TYPOGRAPHY, 
  ICON_SIZES, 
  ICON_CONTAINERS,
  LAYOUT_PATTERNS,
  HEADER_PATTERNS,
  cn 
} from '../constants/design-system';

interface PersonasSectionProps {
  onNavigate?: (section: string) => void;
}

const statusConfig: Record<PersonaStatus, { label: string; color: string; icon: any }> = {
  'draft': { label: 'Draft', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: Edit },
  'in-research': { label: 'In Research', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: Target },
  'validated': { label: 'Validated', color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle },
  'archived': { label: 'Archived', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: MoreVertical }
};

export function PersonasSection({ onNavigate }: PersonasSectionProps) {
  // Use context to get personas (synchronized with detail page)
  const { personas, updatePersona, addPersona, removePersona } = usePersonas();
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<PersonaStatus | 'all'>('all');
  const [aiExplorationPersona, setAIExplorationPersona] = useState<Persona | null>(null);
  const [chatPersona, setChatPersona] = useState<Persona | null>(null);
  
  const [showCreateDialog, setShowCreateDialog] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    return params.get('action') === 'create';
  });

  useEffect(() => {
    if (!showCreateDialog) {
      const currentHash = window.location.hash.split('?')[0];
      if (window.location.hash !== currentHash) {
        window.location.hash = currentHash;
      }
    }
  }, [showCreateDialog]);

  const filteredPersonas = personas.filter(persona => {
    const matchesSearch = persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         persona.tagline.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || persona.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Sort personas by strategic risk (decision status)
  const sortedPersonas = filteredPersonas.sort((a, b) => {
    const statusA = calculateDecisionStatus(a).status;
    const statusB = calculateDecisionStatus(b).status;
    
    const priorityOrder: Record<DecisionStatus, number> = {
      'blocked': 1,
      'decision-at-risk': 2,
      'safe-to-decide': 3,
    };
    
    return priorityOrder[statusA] - priorityOrder[statusB];
  });

  // Calculate summary stats
  const readyCount = personas.filter(p => calculateDecisionStatus(p).status === 'safe-to-decide').length;
  const needsWorkCount = personas.filter(p => calculateDecisionStatus(p).status !== 'safe-to-decide').length;

  const handleDeletePersona = (id: string) => {
    removePersona(id);
  };

  const handleArchivePersona = (id: string) => {
    updatePersona(id, { status: 'archived' as PersonaStatus });
  };

  const handleMethodClick = (personaId: string, method: PersonaResearchMethod, mode: 'work' | 'results') => {
    const persona = personas.find(p => p.id === personaId);
    if (!persona) return;

    // If mode is 'results', show results
    if (mode === 'results') {
      toast.info(`Viewing ${method.type} results for ${persona.name}...`);
      return;
    }

    // If method is ai-exploration, navigate to page
    if (method.type === 'ai-exploration') {
      setAIExplorationPersona(persona);
    } else {
      toast.success(`Starting ${method.type} research for ${persona.name}...`);
    }
  };

  const handleAIExplorationComplete = () => {
    if (!aiExplorationPersona) return;

    // Update persona state to mark AI exploration as completed
    updatePersona(aiExplorationPersona.id, {
      researchMethods: aiExplorationPersona.researchMethods.map(m =>
        m.type === 'ai-exploration' ? { ...m, status: 'completed' as const, completedDate: new Date().toISOString() } : m
      )
    });

    // Show success toast
    toast.success('AI Exploration voltooid!', {
      description: `+35% research vertrouwen toegevoegd aan ${aiExplorationPersona.name}`,
      duration: 5000,
    });
  };

  if (selectedPersona) {
    return (
      <PersonaDetailPage
        persona={selectedPersona}
        onBack={() => setSelectedPersona(null)}
        onUpdate={(updated) => {
          updatePersona(updated.id, updated);
          setSelectedPersona(updated);
        }}
        onNavigateToAIExploration={() => {
          setAIExplorationPersona(selectedPersona);
          setSelectedPersona(null);
        }}
      />
    );
  }

  if (aiExplorationPersona) {
    return (
      <PersonaAIExplorationPage
        persona={aiExplorationPersona}
        onBack={() => setAIExplorationPersona(null)}
        onComplete={handleAIExplorationComplete}
      />
    );
  }

  if (showCreateDialog) {
    return (
      <CreatePersona
        onBack={() => setShowCreateDialog(false)}
        onCreate={(newPersona) => {
          addPersona(newPersona);
          setShowCreateDialog(false);
        }}
      />
    );
  }

  return (
    <>
      <div className="h-full overflow-auto bg-background">
        {/* Header - Using master component */}
        <PageHeader
          icon={Users}
          iconGradient="purple"
          title="Personas"
          subtitle="Strategic decision instruments prioritized by research coverage"
          actions={
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Persona
            </Button>
          }
        />

        {/* Content */}
        <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
          
          {/* BLOCK 1: Overview Stats */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-3xl font-bold text-emerald-600 mb-1">{readyCount}</div>
                <div className="text-sm text-muted-foreground">Ready for strategic use</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-3xl font-bold text-amber-600 mb-1">{needsWorkCount}</div>
                <div className="text-sm text-muted-foreground">Need more research</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-3xl font-bold mb-1">{personas.length}</div>
                <div className="text-sm text-muted-foreground">Total personas</div>
              </CardContent>
            </Card>
          </div>

          {/* BLOCK 2: Search and Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search personas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  {filterStatus === 'all' ? 'All' : statusConfig[filterStatus].label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                  All Personas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('draft')}>
                  Draft
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('in-research')}>
                  In Research
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('validated')}>
                  Validated
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* BLOCK 3: Personas List */}
          <PersonaCardGrid
            personas={sortedPersonas}
            onPersonaClick={(persona) => setSelectedPersona(persona)}
            onMethodClick={handleMethodClick}
            onChatClick={(persona) => setChatPersona(persona)}
          />
        </div>
      </div>

      {/* Chat Modal */}
      <PersonaChatModal
        persona={chatPersona}
        open={!!chatPersona}
        onOpenChange={(open) => {
          if (!open) setChatPersona(null);
        }}
      />
    </>
  );
}