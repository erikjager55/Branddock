'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Mail, Phone } from 'lucide-react';
import { useHelpStore } from '@/stores/useHelpStore';

const contactMethods = [
  {
    id: 'live-chat',
    icon: MessageCircle,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    hasBadge: true,
    action: 'chat' as const,
  },
  {
    id: 'email',
    icon: Mail,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    hasBadge: false,
    action: null,
  },
  {
    id: 'call',
    icon: Phone,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    hasBadge: false,
    action: null,
  },
] as const;

export function ContactOptions() {
  const { t } = useTranslation('help');
  const openChat = useHelpStore((s) => s.openChat);

  return (
    <div className="space-y-4">
      {contactMethods.map((method) => (
        <button
          key={method.id}
          type="button"
          onClick={method.action === 'chat' ? openChat : undefined}
          className="flex items-center gap-4 w-full text-left p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${method.iconBg}`}
          >
            <method.icon className={`w-5 h-5 ${method.iconColor}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                {t(`contact.methods.${method.id}.title`)}
              </span>
              {method.hasBadge && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white bg-emerald-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {t('contact.methods.live-chat.badge')}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {t(`contact.methods.${method.id}.responseTime`)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
