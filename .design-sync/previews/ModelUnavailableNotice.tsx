import { ModelUnavailableNotice } from 'branddock-app';

export const Overbelast = () => (
  <ModelUnavailableNotice errorType="overloaded" onRetry={() => {}} />
);

export const Ratelimiet = () => (
  <ModelUnavailableNotice errorType="rate_limit" onRetry={() => {}} />
);

export const Authenticatie = () => (
  <ModelUnavailableNotice errorType="authentication" retryable={false} />
);

export const BezigMetOpnieuw = () => (
  <ModelUnavailableNotice errorType="network" onRetry={() => {}} isRetrying />
);
