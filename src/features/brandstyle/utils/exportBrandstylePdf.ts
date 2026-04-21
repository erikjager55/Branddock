import { jsPDF } from 'jspdf';
import type { BrandStyleguide, StyleguideColor, TypeScaleLevel } from '../types/brandstyle.types';

/** Parse hex color to [r, g, b], with fallback for malformed values */
function parseHex(hexStr: string | null | undefined): [number, number, number] {
  if (!hexStr) return [200, 200, 200];
  let hex = hexStr.replace('#', '').trim();
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return [200, 200, 200];
  return [parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16)];
}

/** Export a brand styleguide as a professionally formatted PDF */
export function exportBrandstylePdf(styleguide: BrandStyleguide) {
  try {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const checkPageBreak = (needed: number) => {
    if (y + needed > 270) {
      doc.addPage();
      y = 20;
    }
  };

  // ── Header bar ──
  doc.setFillColor(147, 51, 234); // purple-600 (brandstyle module color)
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BRANDDOCK', margin, 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Brand Styleguide', pageWidth - margin, 9, { align: 'right' });
  y = 24;

  // ── Title ──
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Brand Styleguide', margin, y);
  y += 8;

  // ── Meta ──
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const parts: string[] = [];
  if (styleguide.createdBy?.name) parts.push(`Created by ${styleguide.createdBy.name}`);
  parts.push(new Date(styleguide.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  if (styleguide.sourceUrl) parts.push(`Source: ${styleguide.sourceUrl}`);
  doc.text(parts.join('  |  '), margin, y);
  y += 8;

  // Fase 2: Published stamp on cover
  if (styleguide.published) {
    const stamp = `PUBLISHED${styleguide.publishedAt ? ` — ${new Date(styleguide.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}` : ''}`;
    doc.setFillColor(16, 185, 129); // emerald-500
    const stampWidth = doc.getTextWidth(stamp) + 6;
    doc.roundedRect(margin, y - 4, stampWidth, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(stamp, margin + 3, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    y += 6;
  }

  // ── Divider ──
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Helpers ──
  const addSectionHeader = (title: string) => {
    checkPageBreak(14);
    doc.setTextColor(147, 51, 234); // purple-600
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
  };

  const addSubHeader = (title: string) => {
    checkPageBreak(10);
    doc.setTextColor(75, 85, 99); // gray-600
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
  };

  const addField = (label: string, value: string | undefined | null) => {
    if (!value) return;
    checkPageBreak(12);
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(label.toUpperCase(), margin, y);
    y += 4;
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(value, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 3;
  };

  const addList = (title: string, items: string[] | undefined | null) => {
    if (!items || items.length === 0) return;
    addSubHeader(title);
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(10);
    items.forEach(item => {
      checkPageBreak(8);
      const lines = doc.splitTextToSize(`•  ${item}`, contentWidth - 5);
      doc.text(lines, margin + 2, y);
      y += lines.length * 5 + 2;
    });
    y += 2;
  };

  // ═══════════════════════════════════════════════════════════════
  // 1. LOGO
  // ═══════════════════════════════════════════════════════════════
  addSectionHeader('1. Logo');

  if (styleguide.logos && styleguide.logos.length > 0) {
    addSubHeader('Logo Variations');
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(10);
    styleguide.logos.forEach(l => {
      checkPageBreak(8);
      const label = l.description ?? l.fileName;
      doc.text(`•  ${label} (${l.variant})`, margin + 2, y);
      y += 6;
    });
    y += 2;
  }

  if (styleguide.fonts && styleguide.fonts.length > 0) {
    addSubHeader('Fonts');
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(10);
    styleguide.fonts.forEach(f => {
      checkPageBreak(8);
      const status = f.source === 'UPLOADED' ? 'uploaded' : 'detected — file missing';
      doc.text(`•  ${f.name} · ${f.role} · ${status}`, margin + 2, y);
      y += 6;
    });
    y += 2;
  }

  addList('Logo Guidelines', styleguide.logoGuidelines);
  addList("Logo Don'ts", styleguide.logoDonts);

  // ═══════════════════════════════════════════════════════════════
  // 2. COLORS
  // ═══════════════════════════════════════════════════════════════
  addSectionHeader('2. Colors');

  if (styleguide.colors.length > 0) {
    const categories = ['PRIMARY', 'SECONDARY', 'ACCENT', 'NEUTRAL', 'SEMANTIC'] as const;
    categories.forEach(cat => {
      const catColors = styleguide.colors.filter((c: StyleguideColor) => c.category === cat);
      if (catColors.length === 0) return;
      addSubHeader(cat.charAt(0) + cat.slice(1).toLowerCase() + ' Colors');
      catColors.forEach((c: StyleguideColor) => {
        checkPageBreak(12);

        // Color swatch (small rectangle)
        const rgb = parseHex(c.hex);
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.rect(margin, y - 3, 8, 8, 'F');
        doc.setDrawColor(209, 213, 219);
        doc.rect(margin, y - 3, 8, 8, 'S');

        // Color info
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(c.name, margin + 11, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(9);
        const colorValues = [c.hex, c.rgb, c.hsl, c.cmyk].filter(Boolean).join('  |  ');
        doc.text(colorValues, margin + 11, y + 4);
        y += 12;
      });
      y += 2;
    });
  }

  addList("Color Don'ts", styleguide.colorDonts);

  // Fase 3: Semantic tints
  type SemanticTint = { light?: string; base?: string; dark?: string };
  const semantic = (styleguide as unknown as {
    semanticColors?: { info?: SemanticTint; success?: SemanticTint; warning?: SemanticTint; danger?: SemanticTint };
  }).semanticColors;
  if (semantic) {
    const labels: { key: keyof typeof semantic; label: string }[] = [
      { key: "info", label: "Info" },
      { key: "success", label: "Success" },
      { key: "warning", label: "Warning" },
      { key: "danger", label: "Danger" },
    ];
    const present = labels
      .map(({ key, label }) => {
        const tint = semantic[key];
        if (!tint || (!tint.light && !tint.base && !tint.dark)) return null;
        const values = [tint.light, tint.base, tint.dark].filter(Boolean).join(" / ");
        return `${label}: ${values}`;
      })
      .filter((s): s is string => s !== null);
    if (present.length > 0) {
      addSubHeader("Semantic Tints");
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(10);
      present.forEach((line) => {
        checkPageBreak(8);
        doc.text(`•  ${line}`, margin + 2, y);
        y += 6;
      });
      y += 2;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. TYPOGRAPHY
  // ═══════════════════════════════════════════════════════════════
  addSectionHeader('3. Typography');

  addField('Primary Font', styleguide.primaryFontName);

  if (styleguide.typeScale && styleguide.typeScale.length > 0) {
    addSubHeader('Type Scale');
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(9);
    styleguide.typeScale.forEach((level: TypeScaleLevel) => {
      checkPageBreak(8);
      const details = [`${level.size}/${level.lineHeight}`, level.weight];
      if (level.letterSpacing) details.push(`ls: ${level.letterSpacing}`);
      doc.setFont('helvetica', 'bold');
      doc.text(`${level.level} — ${level.name}`, margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(details.join('  |  '), margin + 2, y + 4);
      doc.setTextColor(55, 65, 81);
      if (level.usage) {
        doc.text(`Usage: ${level.usage}`, margin + 2, y + 8);
        y += 12;
      } else {
        y += 8;
      }
    });
    y += 2;
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. TONE OF VOICE
  // ═══════════════════════════════════════════════════════════════
  addSectionHeader('4. Tone of Voice');

  addList('Content Guidelines', styleguide.contentGuidelines);
  addList('Writing Guidelines', styleguide.writingGuidelines);

  if (styleguide.examplePhrases && styleguide.examplePhrases.length > 0) {
    const dos = styleguide.examplePhrases.filter(p => p.type === 'do');
    const donts = styleguide.examplePhrases.filter(p => p.type === 'dont');
    if (dos.length > 0) addList('Do Say', dos.map(p => p.text));
    if (donts.length > 0) addList("Don't Say", donts.map(p => p.text));
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. IMAGERY
  // ═══════════════════════════════════════════════════════════════
  addSectionHeader('5. Imagery');

  if (styleguide.photographyStyle) {
    const ps = styleguide.photographyStyle;
    addSubHeader('Photography Style');
    addField('Mood', ps.mood);
    addField('Subjects', ps.subjects);
    addField('Composition', ps.composition);
    addField('Style', ps.style);
  }

  addList('Photography Guidelines', styleguide.photographyGuidelines);
  addList('Illustration Guidelines', styleguide.illustrationGuidelines);
  addList("Imagery Don'ts", styleguide.imageryDonts);

  // ═══════════════════════════════════════════════════════════════
  // 5b. BRAND IMAGES
  // ═══════════════════════════════════════════════════════════════
  if (styleguide.brandImages && styleguide.brandImages.length > 0) {
    addSubHeader('Brand Images');
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(10);
    for (const img of styleguide.brandImages) {
      checkPageBreak(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${img.context.charAt(0).toUpperCase() + img.context.slice(1)}`, margin + 2, y);
      doc.setFont('helvetica', 'normal');
      if (img.alt) {
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(9);
        doc.text(img.alt, margin + 30, y);
      }
      y += 5;
      doc.setTextColor(79, 70, 229); // indigo-600
      doc.setFontSize(8);
      const displayUrl = img.url.length > 90 ? img.url.slice(0, 87) + '...' : img.url;
      doc.text(displayUrl, margin + 4, y);
      y += 6;
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(10);
    }
    y += 2;
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. VISUAL SYSTEM (merged Design Language + Visual Language)
  // ═══════════════════════════════════════════════════════════════
  const vl = styleguide.visualLanguage as { summary?: string; promptFragment?: string; cornerRadius?: { dominant?: string; radiusPx?: number }; shadow?: { style?: string; elevation?: string }; space?: { density?: string; whitespaceRatio?: number }; shape?: { primary?: string; angularity?: number } } | null;
  const hasDesignLanguage = styleguide.graphicElements || styleguide.patternsTextures
    || styleguide.iconographyStyle || styleguide.gradientsEffects
    || styleguide.layoutPrinciples || vl;

  if (hasDesignLanguage) {
    addSectionHeader('6. Visual System');

    // Visual Language foundations
    if (vl) {
      addSubHeader('Foundations (detected from CSS)');
      if (vl.summary) addField('Summary', vl.summary);
      if (vl.cornerRadius) addField('Corners', `${vl.cornerRadius.dominant ?? 'unknown'} (${vl.cornerRadius.radiusPx ?? 0}px)`);
      if (vl.shadow) addField('Shadows', `${vl.shadow.style ?? 'unknown'} — ${vl.shadow.elevation ?? 'unknown'} elevation`);
      if (vl.shape) addField('Shapes', `${vl.shape.primary ?? 'unknown'} (angularity ${vl.shape.angularity ?? 0}/10)`);
      if (vl.space) addField('Spacing', `${vl.space.density ?? 'unknown'} density, ${Math.round((vl.space.whitespaceRatio ?? 0) * 100)}% whitespace`);
    }

    if (styleguide.graphicElements) {
      const ge = styleguide.graphicElements;
      addList('Brand Shapes', ge.brandShapes);
      addList('Decorative Elements', ge.decorativeElements);
      addList('Visual Devices', ge.visualDevices);
      addField('Usage Notes', ge.usageNotes);
    }
    addList("Graphic Elements Don'ts", styleguide.graphicElementsDonts);

    if (styleguide.patternsTextures) {
      const pt = styleguide.patternsTextures;
      addList('Patterns', pt.patterns);
      addList('Textures', pt.textures);
      addList('Backgrounds', pt.backgrounds);
      addField('Usage Notes', pt.usageNotes);
    }

    if (styleguide.iconographyStyle) {
      const ico = styleguide.iconographyStyle;
      addSubHeader('Iconography');
      addField('Style', ico.style);
      addField('Stroke Weight', ico.strokeWeight);
      addField('Corner Radius', ico.cornerRadius);
      addField('Sizing', ico.sizing);
      addField('Color Usage', ico.colorUsage);
      addField('Usage Notes', ico.usageNotes);
    }
    addList("Iconography Don'ts", styleguide.iconographyDonts);

    if (styleguide.gradientsEffects && styleguide.gradientsEffects.length > 0) {
      addSubHeader('Gradients & Effects');
      styleguide.gradientsEffects.forEach(g => {
        checkPageBreak(10);
        const colorStr = Array.isArray(g.colors) && g.colors.length > 0 ? g.colors.join(' → ') : '—';
        const info = [`${g.type}`, `colors: ${colorStr}`];
        if (g.angle) info.push(`angle: ${g.angle}`);
        addField(g.name, info.join('  |  '));
        if (g.usage) addField('Usage', g.usage);
      });
    }

    if (styleguide.layoutPrinciples) {
      const lp = styleguide.layoutPrinciples;
      addSubHeader('Layout Principles');
      addField('Grid System', lp.gridSystem);
      addField('Spacing Scale', lp.spacingScale);
      addField('Whitespace Philosophy', lp.whitespacePhilosophy);
      addList('Composition Rules', lp.compositionRules);
      addField('Usage Notes', lp.usageNotes);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. SPACING TOKENS (Fase 4)
  // ═══════════════════════════════════════════════════════════════
  type ScaleToken = { name: string; value: number };
  type ShadowToken = { name: string; value: string; intensity: string };
  const spacingScaleData = (styleguide as unknown as {
    spacingScale?: { gridBase: number | null; tokens: ScaleToken[] };
  }).spacingScale;
  const cornerRadiiData = (styleguide as unknown as {
    cornerRadii?: { tokens: ScaleToken[] };
  }).cornerRadii;
  const shadowSystemData = (styleguide as unknown as {
    shadowSystem?: { tokens: ShadowToken[] };
  }).shadowSystem;

  const hasSpacing =
    (spacingScaleData?.tokens?.length ?? 0) > 0 ||
    (cornerRadiiData?.tokens?.length ?? 0) > 0 ||
    (shadowSystemData?.tokens?.length ?? 0) > 0;

  if (hasSpacing) {
    addSectionHeader('7. Spacing & Tokens');

    if (spacingScaleData?.tokens?.length) {
      const label = spacingScaleData.gridBase ? `Spacing Scale (${spacingScaleData.gridBase}px grid)` : 'Spacing Scale';
      addSubHeader(label);
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(10);
      spacingScaleData.tokens.forEach((t) => {
        checkPageBreak(8);
        doc.text(`•  ${t.name} — ${t.value}px`, margin + 2, y);
        y += 6;
      });
      y += 2;
    }

    if (cornerRadiiData?.tokens?.length) {
      addSubHeader('Corner Radii');
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(10);
      cornerRadiiData.tokens.forEach((t) => {
        checkPageBreak(8);
        doc.text(`•  ${t.name} — ${t.value}px`, margin + 2, y);
        y += 6;
      });
      y += 2;
    }

    if (shadowSystemData?.tokens?.length) {
      addSubHeader('Shadow System');
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(9);
      shadowSystemData.tokens.forEach((t) => {
        checkPageBreak(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${t.name}`, margin + 2, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        const value = t.value.length > 80 ? t.value.slice(0, 80) + '…' : t.value;
        doc.text(`${t.intensity} — ${value}`, margin + 2, y + 4);
        doc.setTextColor(55, 65, 81);
        y += 9;
      });
      y += 2;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. COMPONENTS (Fase 5)
  // ═══════════════════════════════════════════════════════════════
  if (Array.isArray(styleguide.components) && styleguide.components.length > 0) {
    addSectionHeader('8. Components');
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(10);

    const grouped = new Map<string, { label: string; tokens: Record<string, unknown> }[]>();
    for (const c of styleguide.components) {
      const arr = grouped.get(c.type) ?? [];
      arr.push({
        label: c.label,
        tokens: (c.extractedStyles ?? {}) as Record<string, unknown>,
      });
      grouped.set(c.type, arr);
    }

    for (const [type, items] of grouped) {
      addSubHeader(`${type.replace(/_/g, ' ')} (${items.length})`);
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(9);
      items.forEach((item) => {
        checkPageBreak(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`•  ${item.label}`, margin + 2, y);
        doc.setFont('helvetica', 'normal');
        y += 5;
        const tokenEntries = Object.entries(item.tokens)
          .filter(([, v]) => typeof v === 'string' && v)
          .slice(0, 6);
        if (tokenEntries.length > 0) {
          doc.setTextColor(107, 114, 128);
          const line = tokenEntries.map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`).join(' · ');
          const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2 - 4);
          wrapped.forEach((w: string) => {
            checkPageBreak(5);
            doc.text(w, margin + 6, y);
            y += 4;
          });
          doc.setTextColor(55, 65, 81);
        }
        y += 2;
      });
    }
  }

  // ── Footer on all pages ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(209, 213, 219);
    doc.line(margin, 280, pageWidth - margin, 280);
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(8);
    doc.text(`Generated by Branddock  |  Confidential  |  Page ${i} of ${totalPages}`, pageWidth / 2, 284, { align: 'center' });
  }

  doc.save('brand-styleguide.pdf');
  } catch (error) {
    console.error('[exportBrandstylePdf] Failed to generate PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
}
