import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { withAiRateLimit } from "@/lib/ai/middleware";
import { openaiClient } from "@/lib/ai/openai-client";
import {
  buildPersonaSystemPrompt,
  DEFAULT_PERSONA_CHAT_PROMPT,
} from "@/lib/ai/persona-prompt-builder";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const CHAT_MODE_INSTRUCTIONS: Record<string, string> = {
  free: "",
  interview: `\n\nCONVERSATION MODE: Interview
You are being interviewed. Give detailed, structured answers. Share specific examples from your experience. Be thorough and honest.`,
  empathy: `\n\nCONVERSATION MODE: Empathy Map
Focus on your feelings, thoughts, and emotions. When asked what you feel, think, say, or do — answer from deep personal experience. Be vulnerable and authentic.`,
  jtbd: `\n\nCONVERSATION MODE: Jobs-to-be-Done
Focus on the tasks you're trying to accomplish, the outcomes you seek, and the barriers you face. Think in terms of progress, not products.`,
};

const JSON_INSTRUCTION = `

IMPORTANT: You MUST respond in valid JSON format with exactly this structure:
{"content": "your response text here", "mood": "neutral"}
Possible moods: happy, neutral, frustrated, excited
Choose the mood that best reflects the emotional tone of your response.
Do NOT include any text outside the JSON object.`;

// L8 Zod-sweep (audit 2026-06-26, batch 4): message + conversationHistory
// gingen met alleen presence-checks de AI-call in (history-items ongeshaped).
const personaChatSchema = z.object({
  personaId: z.string().min(1).max(100),
  message: z.string().min(1).max(20000),
  chatMode: z.string().max(50).optional(),
  conversationHistory: z
    .array(
      z
        .object({
          role: z.string().max(20),
          content: z.string().max(20000),
        })
        .passthrough(),
    )
    .max(200)
    .optional(),
});

// POST /api/personas/chat
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    const parsed = await parseJsonBody(request, personaChatSchema);
    if (!parsed.ok) return parsed.response;
    const { personaId, message, chatMode, conversationHistory } = parsed.data;

    // Load persona from DB
    const persona = await prisma.persona.findFirst({
      where: { id: personaId, workspaceId },
    });

    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // Build system prompt from persona data
    const modeInstruction = CHAT_MODE_INSTRUCTIONS[chatMode || "free"] || "";
    const basePrompt = buildPersonaSystemPrompt(
      DEFAULT_PERSONA_CHAT_PROMPT,
      {
        name: persona.name,
        tagline: persona.tagline,
        age: persona.age,
        gender: persona.gender,
        occupation: persona.occupation,
        location: persona.location,
        education: persona.education,
        income: persona.income,
        familyStatus: persona.familyStatus,
        personalityType: persona.personalityType,
        coreValues: persona.coreValues ?? [],
        interests: persona.interests ?? [],
        goals: persona.goals ?? [],
        motivations: persona.motivations ?? [],
        frustrations: persona.frustrations ?? [],
        behaviors: persona.behaviors ?? [],
        preferredChannels: (persona.preferredChannels as string[]) ?? [],
        techStack: (persona.techStack as string[]) ?? [],
        quote: persona.quote,
        bio: persona.bio,
        buyingTriggers: (persona.buyingTriggers as string[]) ?? [],
        decisionCriteria: (persona.decisionCriteria as string[]) ?? [],
      },
    );

    const systemPrompt = basePrompt + modeInstruction + JSON_INSTRUCTION;

    // Build messages array
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history (last 10 messages for context window)
    const history = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-10)
      : [];
    for (const msg of history) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add the new user message
    messages.push({ role: "user", content: message });

    // Call AI
    const rawResponse = await openaiClient.createChatCompletion(messages, {
      useCase: "CHAT",
      temperature: 0.7,
    });

    // Parse JSON response
    let content: string;
    let mood: string = "neutral";

    try {
      const parsed = JSON.parse(rawResponse);
      content = parsed.content || rawResponse;
      mood = parsed.mood || "neutral";
    } catch {
      // If AI didn't return valid JSON, use raw response
      content = rawResponse;
    }

    return NextResponse.json({ content, mood });
  } catch (error) {
    console.error("[POST /api/personas/chat]", error);

    // Return a graceful fallback
    return NextResponse.json(
      {
        content: "Sorry, ik kan momenteel niet antwoorden. Probeer het later opnieuw.",
        mood: "neutral",
      },
      { status: 200 },
    );
  }
}
