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
      interview: `Hallo! Bedankt dat je tijd neemt voor dit interview. Ik ben ${persona.name}, ${persona.occupation?.toLowerCase() || 'professional'}. Stel me gerust je vragen - ik zal eerlijk antwoorden!`,
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

  const fetchAIResponse = async (userMessageContent: string): Promise<{ content: string; mood: Message['mood'] }> => {
    if (!persona) return { content: 'Sorry, ik kan nu niet antwoorden.', mood: 'neutral' };

    try {
      const response = await fetch('/api/personas/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: persona.id,
          message: userMessageContent,
          chatMode,
          conversationHistory: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();
      const mood = (['happy', 'neutral', 'frustrated', 'excited'] as const).includes(data.mood)
        ? data.mood as Message['mood']
        : 'neutral';

      return { content: data.content, mood };
    } catch {
      return {
        content: 'Sorry, ik kan momenteel niet antwoorden. Probeer het later opnieuw.',
        mood: 'neutral',
      };
    }
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

    const userMessageContent = inputValue.trim();
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessageContent,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    const response = await fetchAIResponse(userMessageContent);

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      mood: response.mood,
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);

    // Focus back on input
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReset = () => {
    if (!window.confirm('Weet je zeker dat je deze conversatie wilt resetten?')) return;
    setMessages([]);
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
      <DialogContent className="max-w-2xl h-[92vh] min-h-[600px] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 flex-shrink-0 ring-2 ring-primary/20">
              <AvatarImage src={persona.avatarUrl || undefined} alt={persona.name} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                {persona.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <DialogTitle className="text-xl">Chat met {persona.name}</DialogTitle>
              </div>
              <DialogDescription>
                {persona.occupation || 'Professional'} • {persona.age || 'N/A'}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                title="AI Persona"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                title={messages[messages.length - 1]?.mood ? MOOD_ICONS[messages[messages.length - 1].mood!].label : 'Mood'}
              >
                <MoodIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={exportConversation}
                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                title="Download conversatie"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
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
            <TabsList className="mx-6 mt-4 mb-0 self-start bg-transparent p-0 h-auto gap-4">
              <TabsTrigger value="chat" className="gap-2 px-0 py-2 rounded-none bg-transparent shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-600 text-gray-500 hover:text-gray-700">
                <MessageCircle className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-2 px-0 py-2 rounded-none bg-transparent shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-600 text-gray-500 hover:text-gray-700">
                <Lightbulb className="h-4 w-4" />
                Insights
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
                              <AvatarImage src={persona.avatarUrl || undefined} alt={persona.name} />
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
                        <AvatarImage src={persona.avatarUrl || undefined} alt={persona.name} />
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
