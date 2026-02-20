import { HelpCircle } from 'lucide-react';

export function HelpHeader() {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">
        <HelpCircle className="w-12 h-12 text-primary" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900">How can we help you?</h1>
      <p className="mt-2 text-gray-500">
        Search our help center or browse topics below
      </p>
    </div>
  );
}
