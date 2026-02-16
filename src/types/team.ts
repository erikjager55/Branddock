// =============================================================
// Team types — used by TeamManagementPage and mock-collaboration
// =============================================================

export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  avatar: string;
  status?: 'active' | 'pending' | 'inactive';
  joinedAt: string;
}
