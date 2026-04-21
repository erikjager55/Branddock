'use client';

import { useMemo, useState } from 'react';
import { Mail, Send, AlertCircle, Users } from 'lucide-react';
import { Modal, Button } from '@/components/shared';
import { useSendCampaign } from '../../hooks/campaign-send.hooks';

interface SendCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  deliverableId: string;
  defaultSubject: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 500;

/** Parse textarea content into a de-duped list of email addresses. */
function parseRecipients(raw: string): { valid: string[]; invalid: string[] } {
  const tokens = raw
    .split(/[\s,;]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const token of tokens) {
    if (seen.has(token)) continue;
    seen.add(token);
    if (EMAIL_REGEX.test(token)) {
      valid.push(token);
    } else {
      invalid.push(token);
    }
  }
  return { valid, invalid };
}

export function SendCampaignModal({
  isOpen,
  onClose,
  campaignId,
  deliverableId,
  defaultSubject,
}: SendCampaignModalProps) {
  const [recipientsRaw, setRecipientsRaw] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [confirm, setConfirm] = useState(false);

  const sendMutation = useSendCampaign(campaignId, deliverableId);

  const { valid, invalid } = useMemo(() => parseRecipients(recipientsRaw), [recipientsRaw]);
  const overLimit = valid.length > MAX_RECIPIENTS;
  const canSend = valid.length > 0 && !overLimit && subject.trim().length > 0 && !sendMutation.isPending;

  const handleSend = () => {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    sendMutation.mutate(
      { recipientEmails: valid, subject: subject.trim() },
      {
        onSuccess: () => {
          setRecipientsRaw('');
          setConfirm(false);
          onClose();
        },
      },
    );
  };

  const handleClose = () => {
    if (sendMutation.isPending) return;
    setConfirm(false);
    sendMutation.reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" title="Send Email Campaign">
      <div className="space-y-5">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            Recipients receive the approved email via Emailit. Each send goes to the
            sending domain configured in the environment; tracking + bounces flow
            back through the webhook.
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={300}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Recipients
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Paste addresses separated by commas, spaces, or newlines. Max {MAX_RECIPIENTS} per send.
          </p>
          <textarea
            value={recipientsRaw}
            onChange={(e) => {
              setRecipientsRaw(e.target.value);
              setConfirm(false);
            }}
            rows={6}
            placeholder="alice@example.com, bob@example.com&#10;carol@example.com"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
          />
          <div className="mt-2 flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1 text-gray-600">
              <Users className="h-3.5 w-3.5" />
              {valid.length} valid
            </span>
            {invalid.length > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" />
                {invalid.length} invalid (skipped)
              </span>
            )}
            {overLimit && (
              <span className="inline-flex items-center gap-1 text-red-600">
                <AlertCircle className="h-3.5 w-3.5" />
                Over {MAX_RECIPIENTS} limit
              </span>
            )}
          </div>
        </div>

        {sendMutation.error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>{(sendMutation.error as Error).message}</div>
          </div>
        )}

        {confirm && canSend && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-sm text-amber-900">
            You are about to send this email to <strong>{valid.length}</strong> recipient{valid.length === 1 ? '' : 's'}. Click Send again to confirm.
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
          <Button variant="secondary" onClick={handleClose} disabled={sendMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={!canSend}
            icon={Send}
            isLoading={sendMutation.isPending}
          >
            {sendMutation.isPending
              ? 'Sending…'
              : confirm
                ? `Confirm send to ${valid.length}`
                : `Send to ${valid.length}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
