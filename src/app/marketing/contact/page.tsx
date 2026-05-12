// Contact-page met e-mail + LinkedIn + Calendly-embed.
// USER-INPUT-TODO: vervang e-mail + LinkedIn + Calendly-URL met definitieve.

import { Mail, Linkedin } from 'lucide-react';

const CONTACT_EMAIL = 'hello@branddock.com';
const LINKEDIN_URL = 'https://www.linkedin.com/company/branddock'; // TODO: vervang
const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL ?? null;

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-gray-900 mb-6">Neem contact op</h1>
      <p className="text-gray-600 text-lg mb-12">
        Vragen over Branddock? Demo gevraagd? We reageren binnen 1 werkdag.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <div className="rounded-lg border border-gray-200 p-6">
          <Mail className="w-6 h-6 text-primary mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">E-mail</h3>
          <p className="text-sm text-gray-600 mb-3">Direct in je inbox</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary text-sm font-medium hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </div>

        <div className="rounded-lg border border-gray-200 p-6">
          <Linkedin className="w-6 h-6 text-primary mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">LinkedIn</h3>
          <p className="text-sm text-gray-600 mb-3">Volg updates en research</p>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-sm font-medium hover:underline"
          >
            Bekijk Branddock op LinkedIn
          </a>
        </div>
      </div>

      {CALENDLY_URL ? (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Boek een demo</h2>
            <p className="text-sm text-gray-600 mt-1">
              30 minuten, live walkthrough van Branddock op jouw use-case.
            </p>
          </div>
          {/* Calendly iframe-embed — config via NEXT_PUBLIC_CALENDLY_URL env */}
          <iframe
            src={CALENDLY_URL}
            className="w-full"
            style={{ height: 650, border: 0 }}
            title="Boek een Branddock demo"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Demo-embed wordt geconfigureerd. E-mail in de tussentijd direct via{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline font-medium">
            {CONTACT_EMAIL}
          </a>{' '}
          voor een demo-afspraak.
        </div>
      )}
    </div>
  );
}
