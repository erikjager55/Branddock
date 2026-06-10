/**
 * Helpers om bewerkbare TEKST-velden uit een Puck-tree (`puckData`) te halen en
 * te lezen. Gebruikt door de Brand Assistant LP-edit-tools (`read_landing_page_content`
 * + `update_landing_page_content`) zodat het model exacte paden + huidige waarden
 * kent vóór het gerichte tekstwijzigingen voorstelt.
 *
 * Bewust componenten-agnostisch: i.p.v. per-Puck-component een schema te
 * hardcoden, verzamelen we string-leaf-props met een denylist voor niet-tekst
 * keys (URLs, hrefs, ids, kleur/font-tokens). Schrijven gebeurt elders via
 * `deepSet` (`@/lib/utils/deep-set`) met dezelfde bracket-notatie-paden.
 */

/** Minimale structurele vorm — vermijdt import van de client-only Puck-types. */
export interface PuckTreeLike {
  content?: Array<{ type?: string; props?: Record<string, unknown> } | null>;
}

export interface EditableTextField {
  /** Bracket-notatie pad vanaf de tree-root, bv. `content[2].props.headline`. */
  path: string;
  /** Puck-componenttype waar dit veld toe behoort, bv. `BrandHero`. */
  component: string;
  /** Prop-key (of geneste key zoals `metrics[0].label`) binnen het component. */
  key: string;
  /** Huidige tekstwaarde. */
  value: string;
}

/**
 * ALLOWLIST van bewerkbare copy-keys. Bewust een allowlist i.p.v. denylist: de
 * Puck-componenten hebben veel structurele/enum-props (`bandTone`, `columns`,
 * `align`, `variant`) en asset-props (`icon` = Lucide-naam, `href`/`imageUrl`/
 * `heroVisualUrl` = URLs) die er als `type:'text'` uitzien maar GEEN vrije tekst
 * zijn — die wijzigen breekt de layout/iconen. Alleen leaf-keys die hier staan
 * worden als bewerkbare tekst aangeboden. Afgeleid uit de text/textarea-velden
 * in `puck-config.tsx`, minus de URL/icon-velden. Bron-keys: zie spec §4b.
 */
const COPY_KEYS: ReadonlySet<string> = new Set([
  'headline',
  'sub',
  'subhead',
  'eyebrow',
  'ctalabel',
  'label',
  'title',
  'description',
  'heading',
  'riskreducer',
  'quote',
  'author',
  'content',
  'tagline',
  'companyname',
  'brandname',
  'name',
  'question',
  'answer',
  'features',
  'value',
  'price',
  'text',
  'body',
]);

/** True wanneer een leaf-prop-key vrije, bewerkbare copy bevat. */
function isCopyKey(key: string): boolean {
  return COPY_KEYS.has(key.toLowerCase());
}

/**
 * Heuristiek: lijkt deze string op een URL/asset-pad i.p.v. leesbare copy?
 * Bewust strikt — dit draait alleen op al-allowlisted copy-keys, dus een bare
 * `#`/`/`-prefix (legitieme copy als "#1" of "24/7") mag NIET worden uitgesloten.
 * Alleen echte protocol-URLs en absolute media-paden (`/uploads/...`) filteren.
 */
function looksLikeUrl(v: string): boolean {
  const t = v.trim();
  return (
    t.startsWith('http://') ||
    t.startsWith('https://') ||
    t.startsWith('data:') ||
    /^\/[\w-]+\/.*\.(png|jpe?g|webp|gif|svg|avif)$/i.test(t)
  );
}

/**
 * Recursief string-leaves verzamelen binnen één component-prop-object. Houdt het
 * bracket-notatie pad bij (`headline`, `metrics[0].label`).
 */
function walkProps(
  node: unknown,
  keyPath: string,
  leafKey: string,
  out: Array<{ key: string; leafKey: string; value: string }>,
): void {
  if (typeof node === 'string') {
    if (!isCopyKey(leafKey) || looksLikeUrl(node)) return;
    out.push({ key: keyPath, leafKey, value: node });
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => walkProps(item, `${keyPath}[${i}]`, leafKey, out));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      walkProps(v, keyPath ? `${keyPath}.${k}` : k, k, out);
    }
  }
}

/**
 * Verzamel alle bewerkbare tekstvelden uit een Puck-tree. Lege strings worden
 * meegenomen (zo kan het model een leeg veld vullen); URLs/hrefs/ids/tokens niet.
 */
export function collectEditableTextFields(puckData: unknown): EditableTextField[] {
  const tree = puckData as PuckTreeLike | null | undefined;
  if (!tree || !Array.isArray(tree.content)) return [];

  const fields: EditableTextField[] = [];
  tree.content.forEach((comp, idx) => {
    if (!comp || typeof comp !== 'object') return;
    const component = comp.type ?? 'Unknown';
    const props = comp.props;
    if (!props || typeof props !== 'object') return;

    const leaves: Array<{ key: string; leafKey: string; value: string }> = [];
    for (const [k, v] of Object.entries(props)) {
      walkProps(v, k, k, leaves);
    }
    for (const leaf of leaves) {
      fields.push({
        path: `content[${idx}].props.${leaf.key}`,
        component,
        key: leaf.key,
        value: leaf.value,
      });
    }
  });
  return fields;
}

/**
 * Lees een geneste waarde via bracket-notatie (`content[2].props.headline`).
 * Geëxtraheerd uit write-tools.ts zodat lees + schrijf (`deepSet`) dezelfde
 * pad-syntax delen. Retourneert undefined als een segment ontbreekt.
 */
export function readPath(obj: unknown, path: string): unknown {
  const segments = path.split('.');
  let cur: unknown = obj;
  for (const seg of segments) {
    if (cur === null || typeof cur !== 'object') return undefined;
    const arrMatch = seg.match(/^(.+)\[(\d+)\]$/);
    if (arrMatch) {
      const arrName = arrMatch[1];
      const idx = parseInt(arrMatch[2], 10);
      const container = (cur as Record<string, unknown>)[arrName];
      cur = Array.isArray(container) ? container[idx] : undefined;
    } else {
      cur = (cur as Record<string, unknown>)[seg];
    }
  }
  return cur;
}
