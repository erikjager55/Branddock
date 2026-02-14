/**
 * COMPONENT: Chat Assistant (Laag 3)
 * 
 * AI chat voor custom verzoeken en edge cases
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Textarea } from '../../ui/textarea';
import {
  MessageSquare,
  Send,
  Sparkles,
  User,
  Bot,
  Download,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw
} from 'lucide-react';

interface ChatAssistantProps {
  campaignConfig: {
    name: string;
    objective: string;
    targetMarket: string;
    keyMessage: string;
    timeline: string;
    budget: string;
  };
  onClose?: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  hasActions?: boolean;
}

export function ChatAssistant({ campaignConfig, onClose }: ChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hoi! Ik heb je campagne strategie "${campaignConfig.name || 'Campaign Strategy'}" gelezen en kan je helpen met:

• Custom outputs maken (briefings, plannen, content)
• Je strategie aanpassen of uitbreiden  
• Vragen beantwoorden over je campagne
• Advies geven over specifieke situaties

Waar kan ik je mee helpen?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickActions = [
    'Maak een influencer brief voor 5 micro-influencers',
    'Geef me een budget breakdown per kanaal',
    'Schrijf een pitch email voor de CEO',
    'Maak een content calendar voor de eerste maand',
    'Geef me PR talking points voor persberichten'
  ];

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response (in real app, this would call an API)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateMockResponse(textToSend),
        timestamp: new Date(),
        hasActions: true
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const generateMockResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();

    if (lowerInput.includes('influencer') || lowerInput.includes('brief')) {
      return `Ik heb een influencer brief voor je gemaakt! 🎯

**INFLUENCER PARTNERSHIP BRIEF**

**Campaign:** ${campaignConfig.name}
**Objective:** ${campaignConfig.objective}
**Timeline:** ${campaignConfig.timeline}

**Target Influencer Profile:**
• Follower range: 10-50k (micro-influencers)
• Niche: Sustainability, lifestyle, eco-conscious living
• Engagement rate: >3%
• Audience overlap with target market

**Deliverables per Influencer:**
• 3 Instagram feed posts
• 5 Instagram stories
• 1 Reel (optional but encouraged)

**Key Messaging:**
"${campaignConfig.keyMessage}"

**Compensation:**
€500-750 per influencer (based on reach & engagement)

**Timeline:**
• Week 1-2: Outreach & contracting
• Week 3-4: Content creation
• Week 5-8: Content publishing

[Download Full Brief] [Email to Team] [Customize]

Wil je dat ik iets aanpas aan deze brief?`;
    }

    if (lowerInput.includes('budget') || lowerInput.includes('breakdown')) {
      return `Hier is een gedetailleerde budget breakdown voor je campagne:

**TOTAL BUDGET:** ${campaignConfig.budget}

**Media Spend (80%):**
• Paid Search: 35% - High intent lead generation
• Paid Social: 25% - Awareness + retargeting
• Display Ads: 15% - Brand building
• Content/SEO: 10% - Organic growth

**Production (15%):**
• Creative: 8% - All campaign assets
• Video: 4% - Hero video + cutdowns
• Photography: 3% - Product & lifestyle shots

**Tools & Other (5%):**
• Analytics: 2%
• Contingency: 3%

Wil je dat ik dit omzet naar een Excel spreadsheet of Google Sheets template?`;
    }

    if (lowerInput.includes('ceo') || lowerInput.includes('pitch') || lowerInput.includes('email')) {
      return `Hier is een pitch email voor je CEO:

**SUBJECT:** Campaign Approval Request: ${campaignConfig.name}

Hi [CEO Name],

I'd like to request your approval for our upcoming campaign: "${campaignConfig.name}".

**Quick Overview:**
• **Objective:** ${campaignConfig.objective}
• **Timeline:** ${campaignConfig.timeline}  
• **Investment:** ${campaignConfig.budget}
• **Expected Impact:** [Based on KPIs]

**Why Now:**
${campaignConfig.targetMarket ? `We've identified a strong opportunity with ${campaignConfig.targetMarket}` : 'Market conditions are favorable'}, and this campaign positions us to capitalize on current trends.

**Key Message:**
"${campaignConfig.keyMessage}"

**Next Steps:**
If approved, we'll kick off on [date] with full rollout in week 3.

I've attached the full strategy document. Happy to discuss in detail.

Best,
[Your Name]

[Copy to Clipboard] [Download as Draft]

Wil je dat ik dit aanpas?`;
    }

    // Default response
    return `Interessante vraag! Ik kan je daar zeker mee helpen.

Op basis van je campagne strategie zou ik aanraden om:

1. **Eerst** je stakeholders te alignen op de kernboodschap
2. **Dan** de creative brief af te ronden  
3. **Daarna** te starten met media planning

Wil je dat ik een van deze stappen verder voor je uitwerk? Of heb je een andere vraag over je campagne?`;
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    // In real app: show toast notification
    alert('Copied to clipboard!');
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Campaign Strategy Assistent</CardTitle>
              <CardDescription className="text-xs">
                Context-aware AI die je campagne kent
              </CardDescription>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}

              <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} max-w-[80%]`}>
                <div
                  className={`rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-muted border'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>

                {/* Message Actions */}
                {message.role === 'assistant' && message.hasActions && (
                  <div className="flex items-center gap-1 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleCopy(message.content)}
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </Button>
                    <div className="h-4 w-px bg-border mx-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-1">
                  {message.timestamp.toLocaleTimeString('nl-NL', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {message.role === 'user' && (
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="rounded-lg p-3 bg-muted border">
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length === 1 && (
          <div className="border-t p-4 bg-muted/30">
            <p className="text-xs text-muted-foreground mb-3">QUICK ACTIONS (1-click):</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleSend(action)}
                >
                  {action}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Typ je vraag of verzoek..."
              className="min-h-[60px] max-h-[120px] resize-none"
              disabled={isTyping}
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="gap-2 self-end"
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            De assistent kent je volledige campagne strategie. Press Enter to send, Shift+Enter for new line.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
