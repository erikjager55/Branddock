"use client";

/**
 * Brandstyle UI — preview van scraped buttonProfile (v4 BrandTokens).
 *
 * Toont per primary/secondary/ghost/unknown rol de geaggregeerde button-
 * styling die de scraper heeft gevonden — inclusief radius=9999 pill,
 * uppercase text, padding, hover-state. Aanvulling op de bestaande
 * ComponentCard (die per StyleguideComponent rendert) — deze preview
 * laat zien wat de v4 token-mapper actually consumeert.
 *
 * Gebruikt unknown-cast omdat BrandStyleguide UI-type buttonProfile niet
 * specifiek typed heeft (Prisma Json).
 */

import { useTranslation } from "react-i18next";

interface ScrapedButtonStyle {
  selector?: string;
  role?: "primary" | "secondary" | "ghost" | "unknown";
  paddingY?: string | null;
  paddingX?: string | null;
  fontWeight?: string | null;
  fontSize?: string | null;
  textTransform?: string | null;
  letterSpacing?: string | null;
  borderRadius?: string | null;
  background?: string | null;
  color?: string | null;
  border?: string | null;
  transition?: string | null;
  hoverBackground?: string | null;
  hoverColor?: string | null;
  hoverTransform?: string | null;
}

const ROLE_ORDER = ["primary", "secondary", "ghost", "unknown"];

function mergeByRole(samples: ScrapedButtonStyle[]): Record<string, ScrapedButtonStyle> {
  const byRole: Record<string, ScrapedButtonStyle[]> = {};
  for (const s of samples) {
    const r = s.role ?? "unknown";
    (byRole[r] ??= []).push(s);
  }
  const merged: Record<string, ScrapedButtonStyle> = {};
  for (const [role, list] of Object.entries(byRole)) {
    const m: ScrapedButtonStyle = { role: role as ScrapedButtonStyle["role"] };
    for (const s of list) {
      if (!m.paddingY && s.paddingY) m.paddingY = s.paddingY;
      if (!m.paddingX && s.paddingX) m.paddingX = s.paddingX;
      if (!m.fontWeight && s.fontWeight) m.fontWeight = s.fontWeight;
      if (!m.fontSize && s.fontSize) m.fontSize = s.fontSize;
      if (!m.textTransform && s.textTransform) m.textTransform = s.textTransform;
      if (!m.letterSpacing && s.letterSpacing) m.letterSpacing = s.letterSpacing;
      if (!m.borderRadius && s.borderRadius) m.borderRadius = s.borderRadius;
      if (!m.background && s.background) m.background = s.background;
      if (!m.color && s.color) m.color = s.color;
      if (!m.border && s.border) m.border = s.border;
      if (!m.transition && s.transition) m.transition = s.transition;
      if (!m.hoverBackground && s.hoverBackground) m.hoverBackground = s.hoverBackground;
      if (!m.hoverColor && s.hoverColor) m.hoverColor = s.hoverColor;
      if (!m.hoverTransform && s.hoverTransform) m.hoverTransform = s.hoverTransform;
    }
    merged[role] = m;
  }
  return merged;
}

function buildButtonStyle(b: ScrapedButtonStyle): React.CSSProperties {
  const paddingValue = b.paddingY && b.paddingX
    ? `${b.paddingY} ${b.paddingX}`
    : b.paddingY ?? b.paddingX ?? "12px 24px";
  return {
    background: b.background ?? "transparent",
    color: b.color ?? "#000",
    padding: paddingValue,
    fontWeight: b.fontWeight as React.CSSProperties["fontWeight"] | undefined,
    fontSize: b.fontSize ?? "14px",
    textTransform: b.textTransform as React.CSSProperties["textTransform"] | undefined,
    letterSpacing: b.letterSpacing ?? undefined,
    borderRadius: b.borderRadius ?? undefined,
    border: b.border ?? "none",
    transition: b.transition ?? undefined,
    display: "inline-block",
    cursor: "default",
  };
}

function StyleProperties({ b }: { b: ScrapedButtonStyle }) {
  const props: Array<[string, string | null | undefined]> = [
    ["padding", b.paddingY && b.paddingX ? `${b.paddingY} ${b.paddingX}` : null],
    ["radius", b.borderRadius],
    ["font-weight", b.fontWeight],
    ["font-size", b.fontSize],
    ["transform", b.textTransform],
    ["tracking", b.letterSpacing],
    ["bg", b.background],
    ["color", b.color],
    ["hover-bg", b.hoverBackground],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-mono text-gray-600">
      {props
        .filter(([, v]) => v && v !== "transparent" && v !== "none")
        .map(([key, value]) => (
          <div key={key} className="flex gap-1">
            <dt className="text-gray-400">{key}:</dt>
            <dd className="text-gray-800 truncate" title={value ?? undefined}>
              {value}
            </dd>
          </div>
        ))}
    </dl>
  );
}

export function ScrapedButtonProfilePreview({ buttonProfile }: { buttonProfile: unknown }) {
  const { t } = useTranslation("brandstyle");
  if (!Array.isArray(buttonProfile) || buttonProfile.length === 0) {
    return null;
  }
  const samples = buttonProfile as ScrapedButtonStyle[];
  const merged = mergeByRole(samples);
  const visibleRoles = ROLE_ORDER.filter((r) => merged[r]);
  if (visibleRoles.length === 0) return null;

  const totalSamples = samples.length;
  const isPillRadius = (radius: string | null | undefined): boolean =>
    !!radius && /9999|50%|100%/i.test(radius);

  return (
    <div className="mb-6 rounded-lg border border-teal-200 bg-teal-50/30 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h4 className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
            {t("components.buttonProfile.title")}
          </h4>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {t("components.buttonProfile.subtitle", { count: totalSamples })}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleRoles.map((role) => {
          const b = merged[role];
          const pill = isPillRadius(b.borderRadius);
          return (
            <div
              key={role}
              className="rounded border border-gray-200 bg-white p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-teal-700 uppercase tracking-wider">
                  {t(`components.buttonProfile.roles.${role}`)}
                </span>
                {pill ? (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                    {t("components.buttonProfile.pillShape")}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-center bg-gray-50 rounded p-4 min-h-[60px]">
                <button type="button" style={buildButtonStyle(b)} className="cursor-default">
                  {/* Neutrale rol-placeholder: de scrape vangt géén button-tekst,
                      dus tonen we de STYLING zonder een verzonnen CTA te suggereren
                      (Fase 6 brand-fidelity — gefabriceerde tekst was misleidend). */}
                  {b.role === "primary"
                    ? t("components.buttonProfile.primaryButton")
                    : b.role === "secondary"
                      ? t("components.buttonProfile.secondaryButton")
                      : t("components.buttonProfile.button")}
                </button>
              </div>
              <StyleProperties b={b} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
