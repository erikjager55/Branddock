'use client';

export function AuthDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-3 bg-white text-gray-500">of login met e-mail</span>
      </div>
    </div>
  );
}
