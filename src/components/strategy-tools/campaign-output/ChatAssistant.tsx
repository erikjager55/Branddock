/**
 * COMPONENT: Chat Assistant (Layer 3)
 *
 * AI chat for custom requests and edge cases
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
      content: `Hi! I've reviewed your campaign strategy "${campaignConfig.name || 'Campaign Strategy'}" and can help you with:

• Creating custom outputs (briefings, plans, content)
• Adjusting or expanding your strategy
• Answering questions about your campaign
• Providing advice on specific situations

How can I help you?`,
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
    'Create an influencer brief for 5 micro-influencers',
    'Give me a budget breakdown per channel',
    'Write a pitch email for the CEO',
    'Create a content calendar for the first month',
    'Give me PR talking points for press releases'
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
      return `I've created an influencer brief for you!

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

Would you like me to adjust anything in this brief?`;
    }

    if (lowerInput.includes('budget') || lowerInput.includes('breakdown')) {
      return `Here is a detailed budget breakdown for your campaign:

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

Would you like me to convert this to an Excel spreadsheet or Google Sheets template?`;
    }

    if (lowerInput.includes('ceo') || lowerInput.includes('pitch') || lowerInput.includes('email')) {
      return `Here is a pitch email for your CEO:

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

Would you like me to adjust this?`;
    }

    // Default response
    return `Interesting question! I can definitely help you with that.

Based on your campaign strategy, I would recommend:

1. **First** align your stakeholders on the core message
2. **Then** finalize the creative brief
3. **After that** start with media planning

Would you like me to elaborate on any of these steps? Or do you have another question about your campaign?`;
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
              <CardTitle className="text-lg">Campaign Strategy Assistant</CardTitle>
              <CardDescription className="text-xs">
                Context-aware AI that knows your campaign
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
                  {message.timestamp.toLocaleTimeString('en-US', {
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
              placeholder="Type your question or request..."
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
            The assistant knows your complete campaign strategy. Press Enter to send, Shift+Enter for new line.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
