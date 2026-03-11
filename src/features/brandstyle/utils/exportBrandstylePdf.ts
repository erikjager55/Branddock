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
  if (styleguide.createdBy.name) parts.push(`Created by ${styleguide.createdBy.name}`);
  parts.push(new Date(styleguide.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  if (styleguide.sourceUrl) parts.push(`Source: ${styleguide.sourceUrl}`);
  doc.text(parts.join('  |  '), margin, y);
  y += 8;

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

  if (styleguide.logoVariations && styleguide.logoVariations.length > 0) {
    addSubHeader('Logo Variations');
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(10);
    styleguide.logoVariations.forEach(v => {
      checkPageBreak(8);
      doc.text(`•  ${v.name} (${v.type})`, margin + 2, y);
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
  // 6. DESIGN LANGUAGE
  // ═══════════════════════════════════════════════════════════════
  const hasDesignLanguage = styleguide.graphicElements || styleguide.patternsTextures
    || styleguide.iconographyStyle || styleguide.gradientsEffects
    || styleguide.layoutPrinciples;

  if (hasDesignLanguage) {
    addSectionHeader('6. Design Language');

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
}
