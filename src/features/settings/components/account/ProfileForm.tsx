'use client';

import { useState, useEffect } from 'react';
import { useProfile, useUpdateProfile, useUploadAvatar, useDeleteAvatar } from '@/hooks/use-settings';
import { Button, Input, Card, Skeleton } from '@/components/shared';
import { Badge } from '@/components/shared';
import { Save } from 'lucide-react';
import { AvatarUpload } from './AvatarUpload';
import type { UpdateProfileRequest } from '@/types/settings';

export function ProfileForm() {
  const { data, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phone, setPhone] = useState('');

  const profile = data?.profile;

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
      setEmail(profile.email ?? '');
      setJobTitle(profile.jobTitle ?? '');
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

  function handleSave() {
    const payload: UpdateProfileRequest = {
      firstName,
      lastName,
      email,
      jobTitle,
      phone,
    };
    updateProfile.mutate(payload);
  }

  function handleAvatarUpload(url: string) {
    uploadAvatar.mutate({ avatarUrl: url });
  }

  function handleAvatarRemove() {
    deleteAvatar.mutate();
  }

  if (isLoading) {
    return (
      <Card>
        <div className="space-y-4">
          <Skeleton className="rounded-full" width={64} height={64} />
          <Skeleton className="rounded" width="100%" height={40} />
          <Skeleton className="rounded" width="100%" height={40} />
          <Skeleton className="rounded" width="100%" height={40} />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 data-testid="profile-form" className="text-base font-semibold text-gray-900 mb-4">Profile Information</h3>

      <AvatarUpload
        avatarUrl={profile?.avatarUrl ?? null}
        onUpload={handleAvatarUpload}
        onRemove={handleAvatarRemove}
      />

      <div className="mt-5 grid grid-cols-2 gap-4">
        <Input
          label="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Your first name"
        />
        <Input
          label="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Your last name"
        />
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2 mb-1.5">
          <label className="block text-sm font-medium text-gray-700">Email</label>
          {profile?.emailVerified && (
            <Badge variant="success" size="sm">Verified</Badge>
          )}
        </div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-shadow"
          placeholder="your@email.com"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Input
          label="Job Title"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="e.g. Brand Strategist"
        />
        <Input
          label="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+31 6 1234 5678"
        />
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          data-testid="profile-save-button"
          icon={Save}
          isLoading={updateProfile.isPending}
          onClick={handleSave}
        >
          Save Changes
        </Button>
      </div>
    </Card>
  );
}
