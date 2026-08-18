import { IssueCard } from 'branddock-app';

export const Kritiek = () => (
  <IssueCard
    severity="critical"
    title="Merkstem botst met de gekozen kanaaltoon"
    subtitle="Brand Voice → LinkedIn"
    description="De merkstem is vastgelegd als formeel en beschouwend, terwijl de kanaaltoon voor LinkedIn op informeel staat. Gegenereerde posts wisselen daardoor per run van register."
    conflictsWith={['Brand Voice', 'Kanaal-tonen']}
    recommendation="Kies één leidende toon voor LinkedIn en leg die vast als kanaalregel, of laat de kanaaltoon leeg zodat de merkstem leidend blijft."
  />
);

export const Waarschuwing = () => (
  <IssueCard
    severity="warning"
    title="Persona zonder gevalideerde pijnpunten"
    subtitle="Persona's → Marketingmanager MKB"
    description="Deze persona wordt in drie campagnes gebruikt, maar de pijnpunten zijn nooit tegen onderzoek gehouden. Content erop gebaseerd is aanname, geen bevinding."
    conflictsWith={['Research']}
    recommendation="Koppel minimaal één onderzoeksbron aan deze persona voordat je hem in nieuwe campagnes inzet."
  />
);

export const Suggestie = () => (
  <IssueCard
    severity="suggestion"
    title="Concurrent al 90 dagen niet gescand"
    subtitle="Concurrenten → Napking"
    description="De laatste scan is van drie maanden geleden. Positioneringsverschuivingen bij deze concurrent worden nu niet opgemerkt."
    recommendation="Zet een wekelijkse scan aan, of verwijder de concurrent als hij niet langer relevant is."
  />
);
