import { createAccessControl } from "better-auth/plugins/access";

const statement = {
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  workspace: ["create", "read", "update", "delete"],
} as const;

const ac = createAccessControl(statement);

export const viewer = ac.newRole({ workspace: ["read"] });
export const member = ac.newRole({ workspace: ["read", "update"] });
export const admin = ac.newRole({
  workspace: ["create", "read", "update"],
  member: ["create", "update"],
  invitation: ["create", "cancel"],
});
export const owner = ac.newRole({
  organization: ["update", "delete"],
  workspace: ["create", "read", "update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
});

export { ac, statement };
