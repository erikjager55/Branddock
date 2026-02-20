"use client";

interface UseCasesSectionProps {
  useCases: string[];
}

export function UseCasesSection({ useCases }: UseCasesSectionProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Use Cases</h3>
      <div className="space-y-2">
        {useCases.map((useCase, idx) => (
          <p key={idx} className="text-sm text-gray-600">
            {idx + 1}. {useCase}
          </p>
        ))}
      </div>
    </div>
  );
}
