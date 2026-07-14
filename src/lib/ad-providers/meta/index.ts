// Public barrel for the Meta provider module.
export {
  buildAuthorizeUrl,
  exchangeCodeForShortLivedToken,
  convertToLongLivedToken,
  refreshLongLivedToken,
  appSecretProof,
} from './oauth';
export { fetchUserMe, fetchAdAccounts } from './client';
export { fetchActiveAds, fetchAdInsightsDaily } from './insights';
export {
  publishFacebookAd,
  validateFacebookCreative,
  fetchAdStatus,
  mapMetaStatusToInternal,
  META_CTA_TYPES,
} from './publish';
export type {
  FacebookAdCreativeSpec,
  CampaignObjective,
  PublishPlan,
  PublishResult,
  MetaCtaType,
  MetaAdEffectiveStatus,
  CreativeValidationResult,
  CreativeValidationIssue,
} from './publish';
export { getMetaConfig, isMetaConfigured, META_OAUTH_SCOPES, MetaConfigError } from './config';
export type {
  MetaShortLivedTokenResponse,
  MetaLongLivedTokenResponse,
  MetaAdAccount,
  MetaAdAccountListResponse,
  MetaUserMe,
  MetaProviderConfig,
  MetaErrorBody,
  MetaActiveAd,
  MetaAdInsightRow,
} from './types';
export { MetaApiError } from './types';
