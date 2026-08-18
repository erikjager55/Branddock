import { Select } from 'branddock-app';

const Kolom = ({ children }: { children: React.ReactNode }) => (
  <div className="max-w-sm space-y-4">{children}</div>
);

const types = [
  { value: 'blog', label: 'Blogartikel' },
  { value: 'linkedin', label: 'LinkedIn-post' },
  { value: 'newsletter', label: 'Nieuwsbrief' },
];

export const MetLabel = () => (
  <Kolom>
    <Select label="Content-type" value="blog" onChange={() => {}} options={types} />
  </Kolom>
);

export const MetPlaceholder = () => (
  <Kolom>
    <Select
      label="Persona"
      value={null}
      onChange={() => {}}
      placeholder="Kies een persona"
      options={[
        { value: 'mkb', label: 'Marketingmanager MKB' },
        { value: 'bureau', label: 'Bureau-eigenaar' },
      ]}
      allowClear
    />
  </Kolom>
);

export const Gegroepeerd = () => (
  <Kolom>
    <Select
      label="Kanaal"
      value="li"
      onChange={() => {}}
      groups={[
        { label: 'Sociaal', options: [{ value: 'li', label: 'LinkedIn' }, { value: 'ig', label: 'Instagram' }] },
        { label: 'Eigen kanalen', options: [{ value: 'blog', label: 'Blog' }, { value: 'mail', label: 'Nieuwsbrief' }] },
      ]}
    />
  </Kolom>
);

export const MetFout = () => (
  <Kolom>
    <Select label="Content-type" value={null} onChange={() => {}} options={types} error="Kies een type om verder te gaan." />
  </Kolom>
);
