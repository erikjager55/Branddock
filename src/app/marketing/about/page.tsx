// About-page met founder-story + missie.
// COPY-TODO: vervang met definitieve content vóór go-live.

import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-gray-900 mb-6">Why Branddock exists</h1>

      {/* COPY-TODO: vervang founder-story met user's eigen versie */}
      <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
        <p>
          AI content tools promise speed. What they deliver is generic output that
          doesn&apos;t represent your brand. The result: marketing teams spending hours
          &quot;humanizing&quot; AI text.
        </p>
        <p>
          Branddock takes a different approach. We build from a rigorous brand strategy
          foundation — your brand voice, audience, brand style, dos and don&apos;ts — and
          validate every output against that baseline. Not just &quot;does it sound
          good?&quot; but &quot;does it fit this specific brand?&quot;
        </p>
        <p>
          We&apos;re small (Erik + AI assistants), focused on B2B SaaS marketing teams,
          and building in the open during the pilot. Feedback from the first 5 customers
          directly shapes the roadmap.
        </p>

        <h2 className="text-gray-900 mt-12">Our mission</h2>
        <p>
          Give marketing teams back 10 hours a week they now spend on reporting, content
          editing and briefings, without sacrificing quality.
        </p>

        <h2 className="text-gray-900 mt-12">Team</h2>
        <p>
          Erik Jager — founder, previously at BetterBrands. Branddock spun off from
          internal tooling we built for clients.
        </p>
        <p className="text-sm text-gray-500">
          Branddock is a product of BetterBrands B.V.
        </p>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200">
        <Link
          href="/?utm_source=marketing-site&utm_medium=about-cta"
          className="inline-flex items-center px-6 py-3 rounded-lg bg-primary text-white font-medium hover:opacity-90"
        >
          Try Branddock
        </Link>
      </div>
    </div>
  );
}
