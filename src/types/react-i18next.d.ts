// i18next typing for the UI-i18n runtime.
//
// Loose (namespace -> string) typing: chrome (common/navigation) + all lazy
// feature namespaces (campaigns, brandstyle, …) resolve through one index type,
// so `useTranslation('<any-namespace>')` + `t('<any.key>')` return `string`
// without per-namespace codegen. Per-key compile-time validation is traded for
// scale; the regression safety net is the ESLint no-hardcoded-string guard +
// the runtime en-fallback (a missing key renders the English source, never a
// raw key).
import 'react-i18next';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    returnNull: false;
    resources: Record<string, Record<string, string>>;
  }
}
