// =============================================================
// Emailit audiences / subscribers service (4.2)
//
// Thin wrappers around the raw client for the audience + subscriber
// CRUD the invite and campaign flows need. Content Canvas "Send
// campaign" (step 4) will consume these.
// =============================================================

import { emailitClient, isEmailitConfigured } from './emailit-client';

export interface AddSubscriberInput {
  email: string;
  firstName?: string;
  lastName?: string;
  attributes?: Record<string, string | number | boolean>;
  tags?: string[];
}

/**
 * Add or upsert a subscriber to an Emailit audience.
 * Returns null when Emailit is not configured (dev).
 */
export async function addSubscriber(
  audienceId: string,
  input: AddSubscriberInput,
): Promise<Record<string, unknown> | null> {
  if (!isEmailitConfigured()) return null;

  const body: Record<string, unknown> = { email: input.email };
  if (input.firstName) body.first_name = input.firstName;
  if (input.lastName) body.last_name = input.lastName;
  if (input.attributes) body.attributes = input.attributes;
  if (input.tags) body.tags = input.tags;

  return emailitClient.addSubscriber(audienceId, body);
}

export async function removeSubscriber(
  audienceId: string,
  subscriberId: string,
): Promise<void> {
  if (!isEmailitConfigured()) return;
  await emailitClient.removeSubscriber(audienceId, subscriberId);
}
