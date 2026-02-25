# Prompt: Persona Chat UI Fixes — 10 issues

## Overzicht

Alle issues zitten in de chat-gerelateerde componenten onder `src/features/personas/components/chat/`.

| # | Component | Issue | Fix |
|---|-----------|-------|-----|
| 1 | KnowledgeContextSelector | Modal plakt aan bovenzijde | Voeg `mt-8` padding toe |
| 2 | KnowledgeContextSelector | Brand Assets + Brand Style + Personas moeten weg uit filter chips | Filter op API groups of hardcode exclusion |
| 3 | KnowledgeContextSelector | Checkbox vinkje niet zichtbaar bij selectie | Inline style fix op checkbox div |
| 4 | KnowledgeContextSelector | "Apply Selection" knop wit/onzichtbaar | Inline style fix |
| 5 | PersonaChatInterface | Eigen ingetypte tekst onzichtbaar (wit op wit) | Fix text color in input/bubble |
| 6 | ChatWithPersonaModal | Iconen rechtsboven verwijderen (behalve ×) | Verwijder Sparkles, Smile, Download, RefreshCw |
| 7 | ChatWithPersonaModal | Chat en Insights tabs te krap | Meer gap toevoegen |
| 8 | PersonaChatInterface | Input zakt weg bij lange chat, kan niet scrollen | Fix flex layout: messages scrollable, input sticky |
| 9 | PersonaChatInsightsTab | Insights niet genummerd | Voeg nummering toe |
| 10 | PersonaChatInsightsTab | Uitlijning niet fraai | Verbeter layout |

---

## Fix 1: KnowledgeContextSelector — Modal marge bovenzijde

In `src/features/personas/components/chat/KnowledgeContextSelector.tsx`, zoek waar de `<Modal` component gerenderd wordt. Voeg een wrapper met top-margin toe, of pas de Modal props aan.

Zoek de `<Modal` opening tag en voeg `className` toe als die ontbreekt:

```tsx
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Select Knowledge Context"
  subtitle={`${flatItems.length} items available`}
  size="xl"
  className="mt-8"  // ← toevoegen als Modal className ondersteunt
```

Als de Modal component geen `className` prop accepteert, pas dan de `<Modal>` wrapper styling aan. Zoek het Modal component in `src/components/shared/Modal.tsx` of `src/components/ui/modal.tsx` en voeg margin-top toe aan de content container:

```tsx
// In de Modal component, zoek de content wrapper (vaak een div met max-w-...)
// Voeg toe: mt-8 of pt-8
<div className="... mt-8">
```

---

## Fix 2: KnowledgeContextSelector — Filter chips beperken

Zoek het `filterChips` useMemo block en filter de ongewenste groepen uit:

```typescript
const EXCLUDED_GROUPS = ['brand_asset', 'brandAsset', 'brand_style', 'brandStyle', 'persona'];

const filterChips = useMemo(() => {
  if (!data?.groups) return [{ key: 'all' as SourceType, label: 'All', icon: Search }];
  
  const allowedGroups = data.groups.filter(
    (g) => !EXCLUDED_GROUPS.includes(g.key)
  );
  
  return [
    { key: 'all' as SourceType, label: 'All', icon: Search },
    ...allowedGroups.map((g) => ({
      key: g.key as SourceType,
      label: g.label,
      icon: ICON_MAP[g.icon] || FileText,
    })),
  ];
}, [data]);
```

Filter ook de items in de list:
```typescript
const flatItems = useMemo<FlatItem[]>(() => {
  if (!data?.groups) return [];
  const items: FlatItem[] = [];
  for (const group of data.groups) {
    // Skip excluded groups
    if (EXCLUDED_GROUPS.includes(group.key)) continue;
    for (const item of group.items) {
      items.push({ ...item, groupLabel: group.label });
    }
  }
  return items;
}, [data]);
```

**Controleer welke group keys de API daadwerkelijk teruggeeft.** Open de Network tab en zoek naar de request die de available context ophaalt. Kijk naar de `groups[].key` waarden en gebruik die exacte strings in `EXCLUDED_GROUPS`. De keys kunnen ook `brand-assets`, `brand-style`, `personas` zijn (met streepje).

---

## Fix 3: KnowledgeContextSelector — Checkbox zichtbaar maken

Zoek het checkbox-element in de item renderer. Het is nu:

```tsx
<div
  className={`flex items-center justify-center w-5 h-5 rounded border flex-shrink-0 transition-colors ${
    isSelected
      ? 'bg-teal-600 border-teal-600'
      : 'border-gray-300 bg-white'
  }`}
>
  {isSelected && <Check className="w-3 h-3 text-white" />}
</div>
```

Vervang door (met inline styles voor zekerheid):

```tsx
<div
  className="flex items-center justify-center w-5 h-5 rounded border flex-shrink-0 transition-colors"
  style={
    isSelected
      ? { backgroundColor: '#0d9488', borderColor: '#0d9488' }
      : { backgroundColor: '#ffffff', borderColor: '#d1d5db' }
  }
>
  {isSelected && <Check className="w-3 h-3 text-white" />}
</div>
```

---

## Fix 4: KnowledgeContextSelector — Apply Selection knop zichtbaar maken

Zoek de "Apply Selection" button in de footer:

```tsx
<button
  onClick={handleApply}
  disabled={selected.size === 0 || saveContext.isPending}
  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
```

Vervang door (inline style):

```tsx
<button
  onClick={handleApply}
  disabled={selected.size === 0 || saveContext.isPending}
  style={{
    backgroundColor: selected.size > 0 ? '#0d9488' : '#e5e7eb',
    color: selected.size > 0 ? '#ffffff' : '#9ca3af',
  }}
  className="px-4 py-2 text-sm font-medium rounded-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed"
>
  {saveContext.isPending ? 'Applying...' : 'Apply Selection'}
</button>
```

---

## Fix 5: PersonaChatBubble — Eigen tekst onzichtbaar

In `src/features/personas/components/chat/PersonaChatBubble.tsx`, zoek de styling voor user messages. Het probleem is dat user berichten witte tekst op een witte/lichte achtergrond hebben.

Zoek de className die user messages stylt. Er is waarschijnlijk iets als:

```tsx
isUser ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-900'
```

Als de user message `text-white` heeft maar de achtergrond niet zichtbaar is (zelfde Tailwind purge probleem), voeg inline styles toe:

```tsx
{isUser ? (
  <div
    className="inline-block px-4 py-2.5 rounded-2xl max-w-[85%]"
    style={{ backgroundColor: '#0d9488', color: '#ffffff' }}
  >
    ...
  </div>
) : (
  <div className="inline-block px-4 py-2.5 rounded-2xl max-w-[85%] bg-gray-100 text-gray-900">
    ...
  </div>
)}
```

**Check ook** `PersonaChatInput.tsx` — als het input veld zelf witte tekst heeft:

```tsx
// Zoek het input/textarea element en zorg dat text-gray-900 er staat:
<textarea
  className="... text-gray-900 placeholder:text-gray-400"
  style={{ color: '#111827' }}  // ← fallback
  ...
/>
```

---

## Fix 6: ChatWithPersonaModal — Verwijder iconen rechtsboven

In `src/features/personas/components/chat/ChatWithPersonaModal.tsx`, zoek de header met iconen. Er staan waarschijnlijk iconen als Sparkles (✨), Smile (😊), Download (↓), RefreshCw (🔄) naast de X (sluiten).

Zoek het blok met die iconen en verwijder alle behalve de X:

**Zoek iets als:**
```tsx
<div className="flex items-center gap-...">
  <button>...<Sparkles /></button>
  <button>...<Smile /></button>
  <button>...<Download /></button>
  <button>...<RefreshCw /></button>
  <button onClick={onClose}>...<X /></button>
</div>
```

**Vervang door alleen de close button:**
```tsx
<div className="flex items-center">
  <button
    onClick={onClose}
    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
  >
    <X className="w-5 h-5" />
  </button>
</div>
```

Verwijder ook de imports van de niet meer gebruikte iconen als ze nergens anders worden gebruikt.

---

## Fix 7: ChatWithPersonaModal — Chat en Insights tabs meer ruimte

Zoek de tab buttons. Er staan nu "Chat" en "Insights" met een badge ertussen. Voeg meer spacing toe:

Zoek:
```tsx
<div className="flex items-center gap-... border-b ...">
```

Pas de gap aan naar minstens `gap-6`:
```tsx
<div className="flex items-center gap-6 border-b border-gray-200 px-6">
```

En zorg dat elke tab voldoende padding heeft:
```tsx
<button className="... px-1 pb-3 ...">  →  <button className="... px-3 pb-3 ...">
```

---

## Fix 8: PersonaChatInterface — Input sticky aan onderkant + scrollbaar

Dit is het belangrijkste layout issue. De huidige structuur moet zijn:

```
┌─────────────────────────┐
│  Warnings (optional)    │ ← fixed height
├─────────────────────────┤
│                         │
│  Messages (scrollable)  │ ← flex-1 overflow-y-auto
│                         │
├─────────────────────────┤
│  Context + Input        │ ← fixed at bottom (flex-shrink-0)
└─────────────────────────┘
```

In `src/features/personas/components/chat/PersonaChatInterface.tsx`, controleer dat de structuur precies zo is:

```tsx
return (
  <div className="flex flex-col h-full overflow-hidden">
    {/* Warnings — fixed height */}
    {isNearLimit && !isAtLimit && (
      <div className="flex items-center gap-2 px-6 py-1.5 bg-amber-50 border-b border-amber-200 flex-shrink-0">
        ...
      </div>
    )}

    {/* Error — fixed height */}
    {error && (
      <div className="px-6 flex-shrink-0">
        <AIErrorCard ... />
      </div>
    )}

    {/* Messages — scrollable, takes remaining space */}
    <div ref={listRef} className="flex-1 overflow-y-auto min-h-0 space-y-3 px-6 py-4">
      {/* Welcome + messages + typing indicator */}
      ...
    </div>

    {/* Footer: context + disclaimer + input — FIXED at bottom */}
    <div className="border-t border-gray-100 px-6 py-4 space-y-3 flex-shrink-0">
      {/* Context chips */}
      ...
      {/* Disclaimer + Add Context */}
      ...
      {/* Input */}
      <PersonaChatInput ... />
    </div>
  </div>
);
```

**Cruciale CSS classes:**
- Buitenste container: `flex flex-col h-full overflow-hidden`
- Messages div: `flex-1 overflow-y-auto min-h-0`
- Footer div: `flex-shrink-0`

De `min-h-0` op de messages div is ESSENTIEEL — zonder dit kan een flex child niet kleiner worden dan zijn content, waardoor overflow niet werkt.

**Check ook ChatWithPersonaModal** — de wrapper die PersonaChatInterface rendert moet ook de correcte hoogte doorgeven:

```tsx
{/* Content */}
<div className="flex-1 overflow-hidden min-h-0">
  {activeTab === 'chat' ? (
    <PersonaChatInterface ... />
  ) : (
    <PersonaChatInsightsTab ... />
  )}
</div>
```

En de modal/dialoog zelf moet een vaste hoogte hebben:
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center">
  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden">
    {/* Header — flex-shrink-0 */}
    {/* Tabs — flex-shrink-0 */}
    {/* Content — flex-1 overflow-hidden min-h-0 */}
  </div>
</div>
```

---

## Fix 9 & 10: PersonaChatInsightsTab — Nummering + uitlijning

In `src/features/personas/components/chat/PersonaChatInsightsTab.tsx`, voeg nummering toe en verbeter de layout.

Zoek de map loop waar insights gerenderd worden en voeg een index toe:

```tsx
{insightList.map((insight, index) => {
  const typeConfig = TYPE_CONFIG[insight.type] || TYPE_CONFIG.behavior;
  const severityConfig = SEVERITY_CONFIG[insight.severity || 'medium'];

  return (
    <div
      key={insight.id}
      className="rounded-xl border border-gray-100 bg-white overflow-hidden"
    >
      {/* Header bar with number, type, severity */}
      <div
        className="flex items-center gap-2 px-4 py-2"
        style={{ backgroundColor: typeConfig.bgLight || '#fef2f2' }}
      >
        <span className="text-xs font-bold text-gray-500 min-w-[20px]">
          #{index + 1}
        </span>
        <span className="text-xs font-semibold" style={{ color: typeConfig.textColor || '#dc2626' }}>
          •
        </span>
        <span className="text-xs font-semibold" style={{ color: typeConfig.textColor || '#dc2626' }}>
          {typeConfig.label}
        </span>
        <span className="text-xs font-semibold" style={{ color: severityConfig.variant === 'danger' ? '#dc2626' : '#d97706' }}>
          {severityConfig.label}
        </span>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <h4 className="text-sm font-semibold text-gray-900 mb-1">{insight.title}</h4>
        <p className="text-sm text-gray-600 leading-relaxed">{insight.content}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-50">
        {insight.messageId && (
          <button
            onClick={() => handleViewInChat(insight.messageId)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-teal-600 transition-colors"
          >
            <MessageCircle className="w-3 h-3" />
            View in chat
          </button>
        )}
        <button
          onClick={() => handleDelete(insight.id)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    </div>
  );
})}
```

Voeg de `MessageCircle` en `Trash2` imports toe als die er nog niet staan:
```tsx
import { MessageCircle, Trash2 } from 'lucide-react';
```

### Insights header verbeteren:

```tsx
<div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
  <div className="flex items-center gap-2">
    <Lightbulb className="w-4 h-4 text-amber-500" />
    <h3 className="text-sm font-semibold text-gray-900">Insights ({insightList.length})</h3>
  </div>
  {insightList.length > 0 && (
    <button
      onClick={handleExport}
      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
    >
      <Download className="w-3 h-3" />
      Export
    </button>
  )}
</div>
```

---

## Verificatie

- [ ] Knowledge Context modal heeft top-margin (niet plakkend aan bovenzijde)
- [ ] Alleen Business Strategy, Products & Services, Market Insights, Knowledge Library en Campaigns in filter chips
- [ ] Checkbox toont teal vinkje bij selectie
- [ ] "Apply Selection" knop is teal (niet wit)
- [ ] Eigen getypte berichten zijn zichtbaar (donkere tekst of witte tekst op teal achtergrond)
- [ ] Alleen × icoon rechtsboven in chatvenster
- [ ] "Chat" en "Insights" tabs hebben voldoende ruimte
- [ ] Input blijft vast aan onderkant, berichten zijn scrollbaar
- [ ] Insights zijn genummerd (#1, #2, etc.)
- [ ] Insights layout is netjes met type badge, severity, acties

## Git
```bash
git add -A && git commit -m "fix(personas/chat): 10 UI fixes — context modal, buttons, scroll, insights numbering" && git push origin main
```
