-- CreateEnum
CREATE TYPE "PersonaAvatarSource" AS ENUM ('NONE', 'AI_GENERATED', 'MANUAL_URL');

-- CreateEnum
CREATE TYPE "PersonaResearchMethodType" AS ENUM ('AI_EXPLORATION', 'INTERVIEWS', 'QUESTIONNAIRE', 'USER_TESTING');

-- CreateEnum
CREATE TYPE "AIPersonaAnalysisStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ERROR');

-- CreateEnum
CREATE TYPE "PersonaChatMode" AS ENUM ('FREE_CHAT', 'GUIDED');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "avatarUrl" TEXT,
    "avatarSource" "PersonaAvatarSource" NOT NULL DEFAULT 'NONE',
    "age" TEXT,
    "gender" TEXT,
    "location" TEXT,
    "occupation" TEXT,
    "education" TEXT,
    "income" TEXT,
    "familyStatus" TEXT,
    "personalityType" TEXT,
    "coreValues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "motivations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "frustrations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "behaviors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "strategicImplications" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedById" TEXT,
    "lockedAt" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaResearchMethod" (
    "id" TEXT NOT NULL,
    "method" "PersonaResearchMethodType" NOT NULL,
    "status" "ResearchMethodStatus" NOT NULL DEFAULT 'AVAILABLE',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "artifactsCount" INTEGER NOT NULL DEFAULT 0,
    "personaId" TEXT NOT NULL,

    CONSTRAINT "PersonaResearchMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIPersonaAnalysisSession" (
    "id" TEXT NOT NULL,
    "status" "AIPersonaAnalysisStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDimensions" INTEGER NOT NULL DEFAULT 4,
    "answeredDimensions" INTEGER NOT NULL DEFAULT 0,
    "insightsData" JSONB,
    "completedAt" TIMESTAMP(3),
    "personaId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIPersonaAnalysisSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIPersonaAnalysisMessage" (
    "id" TEXT NOT NULL,
    "type" "AIMessageType" NOT NULL,
    "content" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "metadata" JSONB,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIPersonaAnalysisMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaChatSession" (
    "id" TEXT NOT NULL,
    "mode" "PersonaChatMode" NOT NULL DEFAULT 'FREE_CHAT',
    "personaId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonaChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaChatMessage" (
    "id" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonaChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaChatInsight" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonaChatInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Persona_workspaceId_idx" ON "Persona"("workspaceId");

-- CreateIndex
CREATE INDEX "PersonaResearchMethod_personaId_idx" ON "PersonaResearchMethod"("personaId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonaResearchMethod_personaId_method_key" ON "PersonaResearchMethod"("personaId", "method");

-- CreateIndex
CREATE INDEX "AIPersonaAnalysisSession_personaId_idx" ON "AIPersonaAnalysisSession"("personaId");

-- CreateIndex
CREATE INDEX "AIPersonaAnalysisSession_workspaceId_idx" ON "AIPersonaAnalysisSession"("workspaceId");

-- CreateIndex
CREATE INDEX "AIPersonaAnalysisMessage_sessionId_orderIndex_idx" ON "AIPersonaAnalysisMessage"("sessionId", "orderIndex");

-- CreateIndex
CREATE INDEX "PersonaChatSession_personaId_idx" ON "PersonaChatSession"("personaId");

-- CreateIndex
CREATE INDEX "PersonaChatMessage_sessionId_idx" ON "PersonaChatMessage"("sessionId");

-- CreateIndex
CREATE INDEX "PersonaChatInsight_sessionId_idx" ON "PersonaChatInsight"("sessionId");

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaResearchMethod" ADD CONSTRAINT "PersonaResearchMethod_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIPersonaAnalysisSession" ADD CONSTRAINT "AIPersonaAnalysisSession_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIPersonaAnalysisSession" ADD CONSTRAINT "AIPersonaAnalysisSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIPersonaAnalysisSession" ADD CONSTRAINT "AIPersonaAnalysisSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIPersonaAnalysisMessage" ADD CONSTRAINT "AIPersonaAnalysisMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AIPersonaAnalysisSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaChatSession" ADD CONSTRAINT "PersonaChatSession_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaChatSession" ADD CONSTRAINT "PersonaChatSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaChatSession" ADD CONSTRAINT "PersonaChatSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaChatMessage" ADD CONSTRAINT "PersonaChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PersonaChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaChatInsight" ADD CONSTRAINT "PersonaChatInsight_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PersonaChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
