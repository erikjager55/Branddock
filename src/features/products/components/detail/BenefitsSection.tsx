"use client";

interface BenefitsSectionProps {
  benefits: string[];
}

export function BenefitsSection({ benefits }: BenefitsSectionProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Benefits</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {benefits.map((benefit, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
              {idx + 1}
            </div>
            <span className="text-sm text-gray-700">{benefit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
