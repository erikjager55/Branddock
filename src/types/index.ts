export type UserRole = "owner" | "admin" | "editor" | "viewer";

export type WorkspacePlan = "free" | "starter" | "professional" | "enterprise";

export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: WorkspacePlan;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  role: UserRole;
  userId: string;
  workspaceId: string;
  createdAt: Date;
}
