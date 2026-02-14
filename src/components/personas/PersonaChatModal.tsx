/**
 * Enhanced Persona Chat Modal
 * Advanced AI-simulated persona chat with research modes, insights tracking, and personality-driven responses
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  Send, 
  User, 
  Sparkles, 
  Loader2,
  AlertCircle,
  RotateCcw,
  Brain,
  Heart,
  Target,
  Lightbulb,
  TrendingUp,
  Download,
  Mic,
  Smile,
  Meh,
  Frown,
  Zap,
  Clock,
  MapPin as Journey,
  CheckCircle2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Persona } from '../../types/persona';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { cn } from '../../lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  mood?: 'happy' | 'neutral' | 'frustrated' | 'excited';
  category?: string;
}

interface Insight {
  id: string;
  category: 'goal' | 'pain' | 'motivation' | 'behavior' | 'decision';
  content: string;
  timestamp: Date;
}

type ChatMode = 'free' | 'interview' | 'empathy' | 'jtbd';

interface PersonaChatModalProps {
  persona: Persona | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CHAT_MODES = {
  free: {
    icon: MessageCircle,
    label: 'Free Chat',
    description: 'Open gesprek met de persona',
    color: 'text-blue-500'
  },
  interview: {
    icon: Mic,
    label: 'Interview',
    description: 'Gestructureerde onderzoeksvragen',
    color: 'text-purple-500'
  },
  empathy: {
    icon: Heart,
    label: 'Empathy Map',
    description: 'Verken gevoelens en gedachten',
    color: 'text-pink-500'
  },
  jtbd: {
    icon: Target,
    label: 'Jobs-to-be-Done',
    description: 'Focus op taken en outcomes',
    color: 'text-orange-500'
  }
};

const MOOD_ICONS = {
  happy: { icon: Smile, color: 'text-green-500', label: 'Positief' },
  neutral: { icon: Meh, color: 'text-gray-500', label: 'Neutraal' },
  frustrated: { icon: Frown, color: 'text-red-500', label: 'Gefrustreerd' },
  excited: { icon: Zap, color: 'text-yellow-500', label: 'Enthousiast' }
};

export function PersonaChatModal({ persona, open, onOpenChange }: PersonaChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('free');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'insights'>('chat');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize conversation when persona changes
  useEffect(() => {
    if (persona && open) {
      initializeConversation();
    }
  }, [persona, open, chatMode]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const initializeConversation = () => {
    if (!persona) return;
    
    const welcomeMessages: Record<ChatMode, string> = {
      free: `Hoi! Ik ben ${persona.name}. ${persona.tagline} Stel me gerust vragen over wat mij bezighoudt!`,
      interview: `Hallo! Bedankt dat je tijd neemt voor dit interview. Ik ben ${persona.name}, ${persona.demographics?.occupation?.toLowerCase() || 'professional'}. Stel me gerust je vragen - ik zal eerlijk antwoorden!`,
      empathy: `Hey! Ik ben ${persona.name}. In deze modus kan je echt doorvragen over wat ik voel, denk, zeg en doe. Ik deel graag mijn perspectief!`,
      jtbd: `Hi! ${persona.name} hier. Laten we het hebben over wat ik echt wil bereiken en waarom. Vraag me naar mijn taken, doelen en wat ik nodig heb om succesvol te zijn!`
    };

    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: welcomeMessages[chatMode],
        timestamp: new Date(),
        mood: 'happy'
      },
    ]);
  };

  const extractInsight = (message: string, category: Insight['category']): Insight | null => {
    // Simple insight extraction based on message content
    if (message.length > 30) {
      return {
        id: `insight-${Date.now()}`,
        category,
        content: message,
        timestamp: new Date()
      };
    }
    return null;
  };

  const generatePersonaResponse = (userMessage: string): { content: string; mood: Message['mood']; category?: string } => {
    if (!persona) return { content: 'Sorry, ik kan nu niet antwoorden.', mood: 'neutral' };

    const lowerMessage = userMessage.toLowerCase();

    // Personality traits to influence tone
    const personality = persona.personality || 'professional';
    const isEnthusiastic = personality.toLowerCase().includes('enthusiast') || personality.toLowerCase().includes('energetic');
    const isAnalytical = personality.toLowerCase().includes('analytical') || personality.toLowerCase().includes('data');

    // Mode-specific responses
    if (chatMode === 'interview') {
      // More structured, detailed responses
      if (lowerMessage.includes('doel') || lowerMessage.includes('goal')) {
        const goals = persona.goals || [];
        if (goals.length > 0) {
          const insight = extractInsight(goals.join('. '), 'goal');
          if (insight) setInsights(prev => [...prev, insight]);
          
          return {
            content: `Mijn primaire doel is ${goals[0].toLowerCase()}. ${goals.length > 1 ? `Daarnaast werk ik ook aan ${goals[1].toLowerCase()}.` : ''} Dit is belangrijk voor me omdat het direct impact heeft op mijn ${persona.demographics?.occupation ? 'werk als ' + persona.demographics.occupation.toLowerCase() : 'dagelijkse taken'}.`,
            mood: 'neutral',
            category: 'Goals'
          };
        }
      }
    }

    if (chatMode === 'empathy') {
      // Focus on feelings and thoughts
      if (lowerMessage.includes('voel') || lowerMessage.includes('emotie') || lowerMessage.includes('gevoel')) {
        const frustrations = persona.frustrations || [];
        if (frustrations.length > 0) {
          return {
            content: `Eerlijk gezegd voel ik me vaak gefrustreerd door ${frustrations[0].toLowerCase()}. Het geeft me stress en het gevoel dat ik niet optimaal presteer. ${isEnthusiastic ? 'Maar ik blijf positief en zoek naar oplossingen!' : 'Dit beïnvloedt mijn werkplezier.'}`,
            mood: 'frustrated',
            category: 'Feelings'
          };
        }
        const motivations = persona.motivations || [];
        if (motivations.length > 0) {
          return {
            content: `Wat me energie geeft is ${motivations[0].toLowerCase()}. ${isEnthusiastic ? 'Daar word ik echt enthousiast van!' : 'Dat motiveert me om door te gaan.'} Het helpt me om door moeilijke momenten heen te komen.`,
            mood: 'excited',
            category: 'Feelings'
          };
        }
      }

      if (lowerMessage.includes('denk') || lowerMessage.includes('mening') || lowerMessage.includes('vind')) {
        return {
          content: `Ik denk er ${isAnalytical ? 'analytisch en data-gedreven' : 'pragmatisch en praktisch'} over na. Voor mij is het belangrijk dat dingen werken en bewezen resultaat opleveren. Ik heb geen geduld voor oplossingen die mooie beloftes maken maar niet leveren.`,
          mood: 'neutral',
          category: 'Thinking'
        };
      }

      if (lowerMessage.includes('doe') || lowerMessage.includes('actie') || lowerMessage.includes('gedrag')) {
        const behaviors = persona.behaviors || [];
        if (behaviors.length > 0) {
          return {
            content: `In mijn dagelijkse routine ${behaviors[0].toLowerCase()}. ${behaviors.length > 1 ? `Ook ${behaviors[1].toLowerCase()}.` : ''} Ik ben iemand die graag actie onderneemt en resultaten ziet.`,
            mood: 'neutral',
            category: 'Doing'
          };
        }
      }

      if (lowerMessage.includes('zeg') || lowerMessage.includes('communiceer')) {
        return {
          content: `Naar anderen toe ben ik ${personality.toLowerCase().includes('direct') ? 'heel direct en eerlijk' : 'professioneel en helder'}. Ik waardeer transparante communicatie en verwacht dat ook van anderen. Als iets niet werkt, zeg ik dat.`,
          mood: 'neutral',
          category: 'Saying'
        };
      }
    }

    if (chatMode === 'jtbd') {
      // Focus on jobs, outcomes, and success criteria
      if (lowerMessage.includes('taak') || lowerMessage.includes('werk') || lowerMessage.includes('job') || lowerMessage.includes('doe')) {
        const goals = persona.goals || [];
        return {
          content: `De belangrijkste taak waar ik mee bezig ben is ${goals[0] || 'mijn werk optimaliseren'}. Het outcome dat ik zoek is niet alleen dat het af is, maar dat het echt waarde toevoegt. ${isAnalytical ? 'Ik meet succes aan concrete KPIs en resultaten.' : 'Voor mij is het belangrijk dat ik de impact kan zien.'}`,
          mood: 'neutral',
          category: 'Jobs-to-be-Done'
        };
      }

      if (lowerMessage.includes('succes') || lowerMessage.includes('bereik') || lowerMessage.includes('win')) {
        return {
          content: `Succes betekent voor mij dat ik mijn doelen haal zonder onnodige overhead. Ik wil efficiënt werken en zichtbare resultaten boeken. ${isEnthusiastic ? 'Als ik vooruitgang zie, geeft me dat echt energie!' : 'Stagnatie frustreert me enorm.'}`,
          mood: 'excited',
          category: 'Success Criteria'
        };
      }

      if (lowerMessage.includes('uitdaging') || lowerMessage.includes('probleem') || lowerMessage.includes('barrier')) {
        const frustrations = persona.frustrations || [];
        if (frustrations.length > 0) {
          return {
            content: `De grootste barrier die ik ervaar is ${frustrations[0].toLowerCase()}. Dit voorkomt dat ik optimaal presteer. ${frustrations.length > 1 ? `Ook ${frustrations[1].toLowerCase()} maakt het lastiger.` : ''} Een oplossing zou me echt helpen om mijn job beter te doen.`,
            mood: 'frustrated',
            category: 'Barriers'
          };
        }
      }
    }

    // General responses (work for all modes)
    if (lowerMessage.includes('probleem') || lowerMessage.includes('frustratie') || lowerMessage.includes('pain')) {
      const frustrations = persona.frustrations || [];
      if (frustrations.length > 0) {
        const insight = extractInsight(frustrations[0], 'pain');
        if (insight) setInsights(prev => [...prev, insight]);
        
        return {
          content: `${isEnthusiastic ? 'Ik moet eerlijk zijn - ' : ''}wat me het meeste frustreert is ${frustrations[0].toLowerCase()}. Dit kost me tijd en energie die ik liever anders besteed. ${frustrations.length > 1 ? `Daarnaast heb ik ook last van ${frustrations[1].toLowerCase()}.` : ''} ${isAnalytical ? 'Ik heb berekend dat dit me gemiddeld X uur per week kost.' : 'Dit beïnvloedt mijn productiviteit enorm.'}`,
          mood: 'frustrated',
          category: 'Pain Points'
        };
      }
    }

    if (lowerMessage.includes('besliss') || lowerMessage.includes('koop') || lowerMessage.includes('kies')) {
      return {
        content: `Bij beslissingen ben ik ${isAnalytical ? 'zeer data-gedreven en grondig' : 'pragmatisch en resultaatgericht'}. Ik wil concrete bewijzen zien - case studies, reviews, resultaten. ${isEnthusiastic ? 'Als iets me enthousiast maakt én de data klopt, ben ik snel overtuigd!' : 'Ik neem geen overhaaste beslissingen.'} Ook betrek ik graag anderen in het proces om blinde vlekken te vermijden.`,
        mood: 'neutral',
        category: 'Decision Making'
      };
    }

    if (lowerMessage.includes('budget') || lowerMessage.includes('prijs') || lowerMessage.includes('kost')) {
      return {
        content: `Qua budget kijk ik vooral naar ROI en totale waarde. ${isAnalytical ? 'Ik maak een business case met concrete cijfers.' : 'Ik wil weten wat het me oplevert.'} Als de investering zichzelf terugverdient binnen ${persona.demographics?.income?.includes('hoog') ? '6' : '12'} maanden, dan ben ik bereid om te investeren. Goedkoop is niet altijd voordelig - kwaliteit telt.`,
        mood: 'neutral',
        category: 'Budget'
      };
    }

    if (lowerMessage.includes('motiv') || lowerMessage.includes('waarom') || lowerMessage.includes('drijfveer')) {
      const motivations = persona.motivations || [];
      if (motivations.length > 0) {
        const insight = extractInsight(motivations[0], 'motivation');
        if (insight) setInsights(prev => [...prev, insight]);
        
        return {
          content: `Wat me echt drijft is ${motivations[0].toLowerCase()}. ${motivations.length > 1 ? `Ook ${motivations[1].toLowerCase()} is heel belangrijk.` : ''} ${isEnthusiastic ? 'Dit geeft me zoveel energie - daar word ik elke dag voor wakker!' : 'Dit is mijn primaire motivatie om te blijven verbeteren.'}`,
          mood: 'excited',
          category: 'Motivations'
        };
      }
    }

    if (lowerMessage.includes('tool') || lowerMessage.includes('software') || lowerMessage.includes('technologie')) {
      const values = persona.values || [];
      const valuesEaseOfUse = values.some(v => v.toLowerCase().includes('gebruiksvriendelijk') || v.toLowerCase().includes('simpel'));
      
      return {
        content: `Ik gebruik dagelijks verschillende tools. Wat ik belangrijk vind: ${valuesEaseOfUse ? 'intuïtieve interface en snelle leercurve' : 'krachtige features en flexibiliteit'}. ${isAnalytical ? 'Ik evalueer tools op basis van efficiëntiewinst en integratiemogelijkheden.' : 'Het moet gewoon werken, zonder gedoe.'} Ik heb geen tijd voor tools die meer werk creëren dan ze oplossen.`,
        mood: 'neutral',
        category: 'Technology'
      };
    }

    if (lowerMessage.includes('team') || lowerMessage.includes('collega') || lowerMessage.includes('samen')) {
      return {
        content: `Met mijn team werk ik ${personality.toLowerCase().includes('collaborat') ? 'graag nauw samen' : 'efficiënt en doelgericht'}. Ik waardeer input van anderen maar neem ook graag het voortouw. ${isEnthusiastic ? 'Samen bereiken we meer!' : 'Goede samenwerking is essentieel voor resultaat.'} Communicatie moet helder en transparant zijn.`,
        mood: 'happy',
        category: 'Collaboration'
      };
    }

    if (lowerMessage.includes('dag') || lowerMessage.includes('routine') || lowerMessage.includes('typisch')) {
      return {
        content: `Een typische dag begint voor mij met ${persona.behaviors?.[0]?.toLowerCase() || 'het checken van prioriteiten'}. Ik ben het meest productief ${persona.demographics?.age?.includes('20') || persona.demographics?.age?.includes('30') ? 'in de ochtend en werk vaak tot laat' : 'als ik gefocuste tijd heb zonder onderbrekingen'}. ${isAnalytical ? 'Ik plan mijn dag zorgvuldig en track mijn tijd.' : 'Ik probeer flexibel te blijven maar wel gestructureerd te werken.'}`,
        mood: 'neutral',
        category: 'Daily Routine'
      };
    }

    if (lowerMessage.includes('advies') || lowerMessage.includes('tip') || lowerMessage.includes('aanbeveling')) {
      return {
        content: `Mijn advies? ${isEnthusiastic ? 'Ga ervoor, maar doe je homework!' : 'Neem de tijd om grondig te onderzoeken.'} Wat voor mij werkt: focus op ${persona.goals?.[0] || 'je primaire doel'}, elimineer wat niet bijdraagt, en meet je resultaten. ${isAnalytical ? 'Data liegen niet - laat cijfers je beslissingen sturen.' : 'Vertrouw op je expertise maar blijf flexibel.'} En vergeet niet om te vieren als je vooruitgang boekt!`,
        mood: 'excited',
        category: 'Advice'
      };
    }

    // Greeting
    if (lowerMessage.includes('hoi') || lowerMessage.includes('hallo') || lowerMessage.includes('hey') || lowerMessage.includes('hi')) {
      return {
        content: `${isEnthusiastic ? 'Hey! Super dat je met me chat!' : 'Hallo!'} ${chatMode === 'interview' ? 'Bedankt voor je interesse in mijn perspectief.' : 'Vraag me gerust alles wat je wilt weten!'} Ik deel graag mijn ervaringen en inzichten.`,
        mood: 'happy',
        category: 'Greeting'
      };
    }

    // Thanks
    if (lowerMessage.includes('bedankt') || lowerMessage.includes('dank') || lowerMessage.includes('thanks')) {
      return {
        content: `${isEnthusiastic ? 'Graag gedaan! Ik vond het leuk om dit te delen!' : 'Geen probleem!'} Als je nog meer vragen hebt, stel ze gerust. ${chatMode === 'interview' ? 'Ik waardeer je interesse in mijn perspectief.' : 'Ik help je graag verder!'}`,
        mood: 'happy',
        category: 'Closing'
      };
    }

    // Default fallback - personality-driven
    const responses = [
      {
        content: `${isAnalytical ? 'Interessante vraag. Laat me daar analytisch over nadenken...' : 'Goede vraag!'} Vanuit mijn perspectief als ${persona.demographics?.occupation || 'professional'}: ${persona.tagline.toLowerCase()} ${isEnthusiastic ? 'Kun je me wat meer context geven? Dan kan ik je echt helpen!' : 'Wat wil je precies weten?'}`,
        mood: 'neutral' as const,
      },
      {
        content: `${isEnthusiastic ? 'Ooh, daar heb ik wel gedachten over!' : 'Dat is een onderwerp waar ik mee bezig ben.'} ${isAnalytical ? 'Ik zou graag meer specifieke details hebben om je een gefundeerd antwoord te geven.' : 'Kun je je vraag iets specifieker maken?'} Zo kan ik je beter helpen!`,
        mood: 'neutral' as const,
      },
      {
        content: `Laat me daar even over nadenken... Als ${persona.name} vind ik het belangrijk om ${isAnalytical ? 'data-gedreven en accuraat' : 'eerlijk en praktisch'} te zijn. ${isEnthusiastic ? 'Vertel me meer!' : 'Wat is precies je vraag?'} Dan kan ik je een beter antwoord geven.`,
        mood: 'neutral' as const,
      },
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  const getModeQuestions = (): string[] => {
    if (!persona) return [];

    const questions: Record<ChatMode, string[]> = {
      free: [
        'Wat is je belangrijkste uitdaging?',
        'Hoe maak je beslissingen?',
        'Wat motiveert je?',
      ],
      interview: [
        'Kun je je typische werkdag beschrijven?',
        'Wat zijn je primaire verantwoordelijkheden?',
        'Welke tools gebruik je dagelijks?',
        'Wat zijn je grootste uitdagingen?',
      ],
      empathy: [
        'Wat voel je als [situatie]?',
        'Wat denk je over [onderwerp]?',
        'Wat doe je wanneer [situatie]?',
        'Wat zeg je tegen je team als [situatie]?',
      ],
      jtbd: [
        'Welke taken wil je bereiken?',
        'Wat definieert succes voor jou?',
        'Welke barriers ervaar je?',
        'Welke outcomes zijn belangrijk?',
      ],
    };

    return questions[chatMode];
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !persona) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI thinking delay (mode-dependent)
    const thinkingTime = chatMode === 'interview' ? 1500 : 800;
    
    setTimeout(() => {
      const response = generatePersonaResponse(userMessage.content);
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        mood: response.mood,
        category: response.category,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
      
      // Focus back on input
      inputRef.current?.focus();
    }, thinkingTime + Math.random() * 800);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReset = () => {
    setInsights([]);
    initializeConversation();
  };

  const exportConversation = () => {
    if (!persona) return;

    const content = messages.map(m => 
      `[${m.timestamp.toLocaleTimeString('nl-NL')}] ${m.role === 'user' ? 'You' : persona.name}: ${m.content}`
    ).join('\n\n');

    const insightsContent = insights.length > 0 
      ? '\n\n=== INSIGHTS ===\n\n' + insights.map(i => `[${i.category.toUpperCase()}] ${i.content}`).join('\n')
      : '';

    const blob = new Blob([`Conversation with ${persona.name}\n${'='.repeat(40)}\n\n${content}${insightsContent}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `persona-chat-${persona.name.toLowerCase().replace(/\s/g, '-')}-${Date.now()}.txt`;
    a.click();
  };

  if (!persona) return null;

  const MoodIcon = messages[messages.length - 1]?.mood ? MOOD_ICONS[messages[messages.length - 1].mood!].icon : Meh;
  const moodColor = messages[messages.length - 1]?.mood ? MOOD_ICONS[messages[messages.length - 1].mood!].color : 'text-gray-500';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 flex-shrink-0 ring-2 ring-primary/20">
              <AvatarImage src={persona.avatar} alt={persona.name} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                {persona.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <DialogTitle className="text-xl">Chat met {persona.name}</DialogTitle>
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Persona
                </Badge>
                <MoodIcon className={cn("h-4 w-4", moodColor)} />
              </div>
              <DialogDescription>
                {persona.demographics?.occupation || 'Professional'} • {persona.demographics?.age || 'N/A'}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={exportConversation}
                className="flex-shrink-0"
                title="Export conversatie"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="flex-shrink-0"
                title="Reset conversatie"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat Mode Selector */}
          <div className="mt-4 flex gap-2 flex-wrap">
            {(Object.keys(CHAT_MODES) as ChatMode[]).map((mode) => {
              const config = CHAT_MODES[mode];
              const Icon = config.icon;
              return (
                <button
                  key={mode}
                  onClick={() => setChatMode(mode)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm",
                    chatMode === mode
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border hover:border-primary/50 hover:bg-muted"
                  )}
                  title={config.description}
                >
                  <Icon className={cn("h-4 w-4", chatMode === mode && config.color)} />
                  {config.label}
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* Main Content */}
        <div className="flex-1 flex min-h-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
            <TabsList className="mx-6 mt-3">
              <TabsTrigger value="chat" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Conversation
                {messages.length > 1 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {messages.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                Insights
                {insights.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs bg-amber-100 text-amber-700">
                    {insights.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col mt-0 min-h-0">
              <ScrollArea className="flex-1 px-6 py-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                  {messages.map((message) => {
                    const MessageMoodIcon = message.mood ? MOOD_ICONS[message.mood].icon : null;
                    const messageMoodColor = message.mood ? MOOD_ICONS[message.mood].color : '';
                    
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                        )}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          {message.role === 'assistant' ? (
                            <>
                              <AvatarImage src={persona.avatar} alt={persona.name} />
                              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm">
                                {persona.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </>
                          ) : (
                            <AvatarFallback className="bg-muted text-muted-foreground">
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div
                          className={cn(
                            "flex-1 max-w-[80%]",
                            message.role === 'user' ? 'flex justify-end' : ''
                          )}
                        >
                          <div
                            className={cn(
                              "rounded-2xl px-4 py-2.5",
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            )}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {message.content}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-1 px-1">
                            <p className="text-xs text-muted-foreground">
                              {message.timestamp.toLocaleTimeString('nl-NL', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            {MessageMoodIcon && message.role === 'assistant' && (
                              <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <MessageMoodIcon className={cn("h-3 w-3", messageMoodColor)} />
                              </>
                            )}
                            {message.category && (
                              <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <Badge variant="secondary" className="text-xs py-0 h-4">
                                  {message.category}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={persona.avatar} alt={persona.name} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm">
                          {persona.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-2xl px-4 py-3">
                        <div className="flex gap-1">
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="px-6 pb-6 pt-4 border-t flex-shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    AI-gesimuleerd gesprek in <span className="font-medium">{CHAT_MODES[chatMode].label}</span> modus
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder={`Stel een vraag aan ${persona.name}...`}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    size="icon"
                    className="flex-shrink-0"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {/* Mode-specific Question Suggestions */}
                {messages.length <= 2 && !isLoading && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-2">Suggesties voor {CHAT_MODES[chatMode].label}:</p>
                    <div className="flex flex-wrap gap-2">
                      {getModeQuestions().map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => setInputValue(suggestion)}
                          className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="flex-1 px-6 py-4 overflow-auto">
              {insights.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nog geen insights</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Insights worden automatisch verzameld tijdens je gesprek met {persona.name}. 
                    Begin met chatten om belangrijke learnings te ontdekken!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">Conversation Insights</h3>
                      <p className="text-sm text-muted-foreground">
                        Key learnings uit je gesprek met {persona.name}
                      </p>
                    </div>
                    <Badge className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {insights.length} insights
                    </Badge>
                  </div>

                  <div className="grid gap-3">
                    {insights.map((insight) => {
                      const categoryConfig = {
                        goal: { icon: Target, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Goal' },
                        pain: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Pain Point' },
                        motivation: { icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Motivation' },
                        behavior: { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50', label: 'Behavior' },
                        decision: { icon: Brain, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Decision' },
                      }[insight.category];

                      const Icon = categoryConfig.icon;

                      return (
                        <div
                          key={insight.id}
                          className={cn(
                            "p-4 rounded-lg border-2 border-l-4",
                            categoryConfig.bg
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn("p-2 rounded-lg bg-white")}>
                              <Icon className={cn("h-4 w-4", categoryConfig.color)} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-xs">
                                  {categoryConfig.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {insight.timestamp.toLocaleTimeString('nl-NL', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <p className="text-sm leading-relaxed">
                                {insight.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
