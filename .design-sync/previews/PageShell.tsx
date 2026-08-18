import { PageShell, PageHeader, StatGrid } from 'branddock-app';

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
  </div>
);

export const VolledigePagina = () => (
  <PageShell>
    <PageHeader
      moduleKey="dashboard"
      title="Dashboard"
      subtitle="De stand van je merk in één blik."
    />
    <StatGrid columns={3}>
      <Stat label="Merk-assets ingevuld" value="9 / 12" hint="3 wachten op review" />
      <Stat label="Brand Score" value="84" hint="+6 sinds vorige scan" />
      <Stat label="Content deze maand" value="27" hint="18 gepubliceerd" />
    </StatGrid>
  </PageShell>
);

export const SmalleVariant = () => (
  <PageShell maxWidth="3xl">
    <PageHeader
      compact
      moduleKey="personas"
      title="Nieuwe persona"
      subtitle="Vul de kern in; Branddock leidt de rest af uit je merk-DNA."
    />
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <p className="text-sm text-gray-600">
        Een smalle schil houdt formulieren leesbaar. Gebruik <code>maxWidth=&quot;3xl&quot;</code> voor
        instellingen en detailformulieren, en de standaardbreedte voor overzichten.
      </p>
    </div>
  </PageShell>
);
