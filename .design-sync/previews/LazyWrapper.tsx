import { LazyWrapper } from 'branddock-app';

export const MetInhoud = () => (
  <LazyWrapper>
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="text-base font-semibold text-gray-900">Geladen inhoud</h3>
      <p className="mt-1 text-sm text-gray-600">
        Zolang de lazy-import loopt toont LazyWrapper een pagina-skelet; daarna dit blok.
      </p>
    </div>
  </LazyWrapper>
);
