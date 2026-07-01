'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Check, User, Building2 } from 'lucide-react';
import { Button, Modal } from '@/components/shared';
import { useQueryClient } from '@tanstack/react-query';
import { channelKeys } from '../../hooks/use-publish-channels';

interface SocialProfile {
  profileId: string;
  profileName: string;
  profileType: 'personal' | 'page' | 'business';
  avatarUrl?: string;
}

interface SocialProfileSelectorProps {
  platform: string;
  sessionId: string;
  onClose: () => void;
}

/**
 * Modal shown after OAuth callback. Fetches available profiles/pages
 * and lets the user select which ones to connect. Each selected profile
 * becomes a separate PublishChannel record.
 */
export function SocialProfileSelector({ platform, sessionId, onClose }: SocialProfileSelectorProps) {
  const { t } = useTranslation('settings-misc');
  const qc = useQueryClient();
  const [profiles, setProfiles] = useState<SocialProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const res = await fetch(`/api/social-connect/${platform}/profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? t('socialProfiles.fetchFailed', { status: res.status }));
        }

        const data = await res.json();
        setProfiles(data.profiles ?? []);

        // Auto-select all profiles
        setSelectedIds(new Set((data.profiles ?? []).map((p: SocialProfile) => p.profileId)));
      } catch (err) {
        setError(err instanceof Error ? err.message : t('socialProfiles.loadError'));
      } finally {
        setLoading(false);
      }
    }

    fetchProfiles();
  }, [platform, sessionId, t]);

  const toggleProfile = (profileId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        next.delete(profileId);
      } else {
        next.add(profileId);
      }
      return next;
    });
  };

  const handleConnect = async () => {
    if (selectedIds.size === 0) return;

    setSaving(true);
    try {
      const selectedProfiles = profiles
        .filter((p) => selectedIds.has(p.profileId))
        .map((p) => ({
          profileId: p.profileId,
          profileName: p.profileName,
          profileType: p.profileType,
        }));

      const res = await fetch(`/api/social-connect/${platform}/select-profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, profiles: selectedProfiles }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t('socialProfiles.connectFailed'));
      }

      qc.invalidateQueries({ queryKey: channelKeys.all });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('socialProfiles.connectionFailed'));
    } finally {
      setSaving(false);
    }
  };

  const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);

  return (
    <Modal isOpen onClose={onClose} title={t('socialProfiles.connectModalTitle', { platform: platformLabel })} size="md">
      <div className="space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-gray-500">{t('socialProfiles.loadingProfiles')}</span>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 border border-red-100 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && profiles.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">{t('socialProfiles.noProfilesTitle')}</p>
            <p className="text-xs text-gray-400 mt-1">
              {t('socialProfiles.noProfilesHint')}
            </p>
          </div>
        )}

        {!loading && profiles.length > 0 && (
          <>
            <p className="text-sm text-gray-600">
              {t('socialProfiles.selectPrompt')}
            </p>

            <div className="space-y-2">
              {profiles.map((profile) => {
                const isSelected = selectedIds.has(profile.profileId);
                const isPage = profile.profileType === 'page' || profile.profileType === 'business';

                return (
                  <button
                    key={profile.profileId}
                    type="button"
                    onClick={() => toggleProfile(profile.profileId)}
                    className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? 'border-teal-300 bg-teal-50/50 ring-1 ring-teal-200'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    {/* Avatar / Icon */}
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isPage ? 'bg-blue-50' : 'bg-gray-100'
                    }`}>
                      {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : isPage ? (
                        <Building2 className="h-5 w-5 text-blue-600" />
                      ) : (
                        <User className="h-5 w-5 text-gray-500" />
                      )}
                    </div>

                    {/* Name + type */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {profile.profileName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {isPage ? t('socialProfiles.companyPage') : t('socialProfiles.personalProfile')}
                      </p>
                    </div>

                    {/* Checkbox */}
                    <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? 'border-teal-600 bg-teal-600'
                        : 'border-gray-300'
                    }`}>
                      {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>{t('socialProfiles.cancel')}</Button>
          <Button
            onClick={handleConnect}
            disabled={selectedIds.size === 0 || saving}
            isLoading={saving}
          >
            {t('socialProfiles.connect')} {selectedIds.size > 0 ? t('socialProfiles.profileCount', { count: selectedIds.size }) : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
