// Canonical (source-of-truth) English UI strings — `entitlement-errors`
// namespace. Translated versions of the stable `code` field some API routes
// return alongside the (log-only) English `error` string — see
// src/lib/api/api-error.ts. Covers workspace/seat plan-limit and
// authorization failures (workspace creation, team invites).
const ns = {
  code: {
    WORKSPACE_LIMIT_REACHED: 'Workspace limit reached ({{limit}}) on the {{tier}} plan. Upgrade to add more.',
    SEAT_LIMIT_REACHED: 'Seat limit reached ({{limit}}) on the {{tier}} plan. Upgrade to invite more people.',
    PLAN_LIMIT_REACHED: 'Plan limit reached on the {{tier}} plan. Upgrade to continue.',
    NOT_MEMBER: 'You are not a member of this organization.',
    NOT_OWNER_OR_ADMIN: 'Only owners and admins can do this.',
    ONLY_OWNER_CAN_INVITE_OWNER: 'Only an owner can invite another owner.',
    ALREADY_MEMBER: 'This person is already a member of your organization.',
    INVITE_ALREADY_PENDING: 'This email has already been invited.',
    WORKSPACE_NAME_TAKEN: 'A workspace with this name already exists.',
    WORKSPACE_NAME_RESERVED: 'This workspace name is reserved — please choose another.',
    NO_ACTIVE_ORG: 'No active organization found.',
  },
  upgradeCta: 'Upgrade plan',
} as const;

export default ns;
