// =============================================================
// Meta Marketing API — type definitions.
//
// Only the subset we actually use in Fase B. Expanded with each
// feature (publish-pipeline, status-sync, metrics-fetch).
// =============================================================

export interface MetaShortLivedTokenResponse {
  access_token: string;
  token_type: 'bearer';
  expires_in?: number;
}

export interface MetaLongLivedTokenResponse {
  access_token: string;
  token_type: 'bearer';
  /** Seconds until expiry. Meta long-lived tokens ~60 days. */
  expires_in: number;
}

export interface MetaAdAccount {
  id: string; // "act_1234"
  account_id: string;
  name: string;
  currency: string;
  timezone_name: string;
  account_status: number;
  business?: { id: string; name: string };
}

export interface MetaAdAccountListResponse {
  data: MetaAdAccount[];
  paging?: { cursors: { before: string; after: string }; next?: string };
}

export interface MetaUserMe {
  id: string;
  name?: string;
  email?: string;
}

// ─── Insights / discovery (ads-watchdog Fase 1) ─────────────
// Veldmapping bewezen in Fase 0 (tasks/agent-ads-watchdog.md §Notes):
// alle drie de fatigue-signalen op ad-niveau.

export interface MetaActiveAd {
  id: string;
  name: string;
  effective_status: string;
  created_time: string; // ISO — signaal 3 (creative-leeftijd)
  creative?: { id: string; name?: string };
  campaign?: { id: string; name: string; objective?: string; created_time?: string };
  adset?: { id: string; name: string };
}

export interface MetaActiveAdListResponse {
  data: MetaActiveAd[];
  paging?: { cursors: { before: string; after: string }; next?: string };
}

export interface MetaAdInsightRow {
  ad_id: string;
  ad_name?: string;
  date_start: string; // "YYYY-MM-DD"
  date_stop: string;
  impressions?: string;
  reach?: string;
  frequency?: string; // signaal 1 — mee in `raw`; kolom-loos (impressions/reach)
  ctr?: string; // signaal 2
  clicks?: string;
  spend?: string;
  cpm?: string;
  cpc?: string;
}

export interface MetaAdInsightListResponse {
  data: MetaAdInsightRow[];
  paging?: { cursors: { before: string; after: string }; next?: string };
}

export interface MetaErrorBody {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export class MetaApiError extends Error {
  readonly code: number;
  readonly type: string;
  readonly fbtraceId?: string;
  readonly httpStatus: number;

  constructor(httpStatus: number, body: MetaErrorBody) {
    super(`[Meta API ${httpStatus}] ${body.error.message}`);
    this.name = 'MetaApiError';
    this.httpStatus = httpStatus;
    this.code = body.error.code;
    this.type = body.error.type;
    this.fbtraceId = body.error.fbtrace_id;
  }

  /** Returns true for 401/190 — token expired or invalidated. */
  isAuthError(): boolean {
    return this.httpStatus === 401 || this.code === 190;
  }
}

/** Internal config shape used by oauth + client wrappers. */
export interface MetaProviderConfig {
  appId: string;
  appSecret: string;
  apiVersion: string;
  /** Full callback URL, e.g. https://app.example.com/api/ad-accounts/meta/callback */
  redirectUri: string;
}
