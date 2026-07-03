import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Crown,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../shared/PageHeader';
import { PageContainer } from '../shared/PageContainer';
import { useUIState } from '../../contexts/UIStateContext';
import { useWorkspace } from '../../hooks/use-workspace';

type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

interface ApiMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  isActive: boolean;
  joinedAt: string;
}

interface ApiInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export function TeamManagementPage() {
  const { t } = useTranslation('team');
  const { setActiveSection } = useUIState();
  const { organizationId } = useWorkspace();
  const [members, setMembers] = useState<ApiMember[]>([]);
  const [invitations, setInvitations] = useState<ApiInvitation[]>([]);
  const [myRole, setMyRole] = useState<string>('viewer');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('member');
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = ['owner', 'admin'].includes(myRole);

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/organization/members');
      if (!res.ok) throw new Error('Failed to load members');
      const data = await res.json();
      setMembers(data.members ?? []);
      setInvitations(data.invitations ?? []);
      setMyRole(data.myRole ?? 'viewer');
    } catch (err) {
      setError(t('errors.load'));
      console.error('[TeamManagement]', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roleCounts = {
    owner: members.filter((m) => m.role === 'owner').length,
    admin: members.filter((m) => m.role === 'admin').length,
    member: members.filter((m) => m.role === 'member').length,
    viewer: members.filter((m) => m.role === 'viewer').length,
  };

  const handleInvite = async () => {
    if (!inviteEmail || !organizationId) return;
    setIsInviting(true);

    try {
      const res = await fetch('/api/organization/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          organizationId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? t('errors.invite'));
        return;
      }

      setInviteEmail('');
      setInviteRole('member');
      setShowInviteForm(false);
      loadMembers(); // Refresh to show new invitation
    } catch (err) {
      console.error('Invite failed:', err);
      alert(t('errors.invite'));
    } finally {
      setIsInviting(false);
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    try {
      // Delete the invitation directly
      await fetch(`/api/organization/invite?id=${invitationId}`, {
        method: 'DELETE',
      });
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    } catch (err) {
      console.error('Cancel invite failed:', err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm(t('confirmRemove'))) return;
    // For now, just remove from local state — could add a DELETE endpoint later
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      case 'member':
        return <Edit2 className="h-4 w-4 text-green-500" />;
      case 'viewer':
        return <Users className="h-4 w-4 text-gray-500" />;
      default:
        return <Users className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'outline' => {
    switch (role) {
      case 'owner':
      case 'admin':
        return 'default';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-gray-500">{t('loading')}</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-32">
          <div className="text-center space-y-3">
            <p className="text-gray-500">{error}</p>
            <Button variant="outline" onClick={loadMembers} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {t('retry')}
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          icon={Users}
          iconBg="bg-gray-100"
          iconColor="text-gray-600"
          title={t('page.title')}
          subtitle={t('page.subtitle')}
          backLabel={t('page.back')}
          onBack={() => setActiveSection('settings-account')}
          primaryAction={canManage ? {
            label: t('page.invite'),
            icon: UserPlus,
            onClick: () => setShowInviteForm(!showInviteForm),
          } : undefined}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Crown className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('stats.owners')}</p>
                <p className="text-2xl font-bold">{roleCounts.owner}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('stats.admins')}</p>
                <p className="text-2xl font-bold">{roleCounts.admin}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Edit2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('stats.members')}</p>
                <p className="text-2xl font-bold">{roleCounts.member}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('stats.viewers')}</p>
                <p className="text-2xl font-bold">{roleCounts.viewer}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Invite Form */}
        {showInviteForm && canManage && (
          <Card className="p-6 border-2 border-primary/20">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">{t('inviteForm.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('inviteForm.subtitle')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">{t('inviteForm.emailLabel')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder={t('inviteForm.emailPlaceholder')}
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-role">{t('inviteForm.roleLabel')}</Label>
                  <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as TeamRole)}>
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{t('inviteForm.roleViewer')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="member">
                        <div className="flex items-center gap-2">
                          <Edit2 className="h-4 w-4" />
                          <span>{t('inviteForm.roleMember')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          <span>{t('inviteForm.roleAdmin')}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleInvite} disabled={isInviting || !inviteEmail} className="gap-2">
                  {isInviting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  {t('inviteForm.send')}
                </Button>
                <Button variant="outline" onClick={() => setShowInviteForm(false)}>
                  {t('inviteForm.cancel')}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Pending Invitations */}
        {invitations.length > 0 && canManage && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              {t('invitations.heading', { count: invitations.length })}
            </h3>
            <div className="space-y-3">
              {invitations.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-yellow-200 bg-yellow-50"
                >
                  <Mail className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('invitations.invitedAs', {
                        role: invite.role,
                        date: new Date(invite.expiresAt).toLocaleDateString(),
                      })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                    {t('invitations.pending')}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelInvite(invite.id)}
                    className="text-destructive hover:text-destructive"
                    title={t('invitations.cancelTitle')}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Team Members List */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t('membersList.heading', { count: filteredMembers.length })}
            </h3>

            <div className="space-y-4">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  {/* Avatar */}
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="h-12 w-12 rounded-full border-2 border-border"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full border-2 border-border bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold text-lg">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">{member.name}</h4>
                      <div className="flex items-center gap-1">
                        {member.isActive ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {member.isActive ? t('membersList.active') : t('membersList.inactive')}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {member.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('membersList.joined', {
                        date: new Date(member.joinedAt).toLocaleDateString(),
                      })}
                    </p>
                  </div>

                  {/* Role Badge */}
                  <div className="flex items-center gap-2">
                    {getRoleIcon(member.role)}
                    <Badge variant={getRoleBadgeVariant(member.role)} className="capitalize">
                      {member.role}
                    </Badge>
                  </div>

                  {/* Actions (only for non-owners, and only if current user can manage) */}
                  {member.role !== 'owner' && canManage && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {filteredMembers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-1">{t('membersList.emptyTitle')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? t('membersList.emptySearch')
                      : t('membersList.emptyDefault')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Role Permissions Info */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('permissions.heading')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Crown className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold">{t('permissions.owner.title')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('permissions.owner.description')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold">{t('permissions.admin.title')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('permissions.admin.description')}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Edit2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold">{t('permissions.member.title')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('permissions.member.description')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold">{t('permissions.viewer.title')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('permissions.viewer.description')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
