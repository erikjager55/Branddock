import type { LucideIcon } from "lucide-react";
import { Bug, MessageSquarePlus } from "lucide-react";

/**
 * Registry of slash commands usable in the Brand Assistant input.
 *
 * Single source of truth for both the auto-suggest menu (shown when the
 * user types "/") and the dispatch switch in `InputBar.handleSend`.
 * Keep command ids lowercase and start with a single "/".
 */
export interface SlashCommand {
  id: `/${string}`;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const SLASH_COMMANDS: readonly SlashCommand[] = [
  {
    id: "/feedback",
    label: "Feedback",
    description: "Rate the last AI response",
    icon: MessageSquarePlus,
  },
  {
    id: "/bug",
    label: "Report a bug",
    description: "Report a problem on this page",
    icon: Bug,
  },
];

/**
 * Returns commands whose id starts with the given query.
 * Query should be the text AFTER the leading "/", lowercased by caller
 * (e.g. user types "/Fe" → query = "fe" → matches /feedback).
 */
export function filterSlashCommands(query: string): SlashCommand[] {
  if (query.length === 0) return [...SLASH_COMMANDS];
  return SLASH_COMMANDS.filter((c) => c.id.slice(1).startsWith(query));
}

/**
 * Detects whether the current textarea value is a slash-command context
 * (starts with "/", has no space or newline — still a single-token prefix).
 * Returns the query (text after "/") or null.
 */
export function readSlashQuery(inputText: string): string | null {
  if (!inputText.startsWith("/")) return null;
  if (/[\s]/.test(inputText)) return null;
  return inputText.slice(1).toLowerCase();
}
