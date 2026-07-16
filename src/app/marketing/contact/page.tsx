// Contact-page met e-mail + LinkedIn + demo-boeking. NL-first (Fase 2).
//
// Boeking is provider-neutraal: NEXT_PUBLIC_BOOKING_URL (Morgen, Calendly,
// Cal.com — elke booking-URL). Bewust een LINK i.p.v. iframe-embed: de
// productie-CSP staat alleen `frame-src 'self' https://js.stripe.com` toe,
// dus een externe booking-iframe zou leeg renderen; bovendien weigeren veel
// booking-tools embedding (X-Frame-Options). Een link opent de geoptimaliseerde
// boekingspagina van de provider en werkt met elke provider zonder CSP-werk.

import type { Metadata } from 'next';
import { Mail, Linkedin, CalendarClock, ArrowUpRight } from 'lucide-react';
import SplitHeader from '../SplitHeader';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Vragen over Branddock of een demo boeken? We reageren binnen 1 werkdag.',
};

const CONTACT_EMAIL = 'hello@branddock.com';
const LINKEDIN_URL = 'https://www.linkedin.com/company/branddock'; // TODO: vervang
// Backwards-compat: oude env-naam blijft werken tot hij overal vervangen is.
const BOOKING_URL =
  process.env.NEXT_PUBLIC_BOOKING_URL ?? process.env.NEXT_PUBLIC_CALENDLY_URL ?? null;

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <SplitHeader
        id="contact"
        family="people"
        title="Neem contact op"
        lead="Vragen over Branddock? Op zoek naar een demo? We reageren binnen 1 werkdag."
        className="mb-12"
      />

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <div className="rounded-lg border border-gray-200 p-6">
          <Mail className="w-6 h-6 text-primary mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">E-mail</h3>
          <p className="text-sm text-gray-600 mb-3">Rechtstreeks in je inbox</p>
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
          <p className="text-sm text-gray-600 mb-3">Volg updates en onderzoek</p>
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

      {BOOKING_URL ? (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-5 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Boek een demo</h2>
            <p className="text-sm text-gray-600 mt-1">
              30 minuten, een live walkthrough van Branddock voor jouw use case.
            </p>
          </div>
          <div className="p-6">
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white font-medium hover:opacity-90"
            >
              <CalendarClock className="w-4 h-4" />
              Kies een tijd
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Demo-boeking wordt ingesteld. Mail ons in de tussentijd rechtstreeks op{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline font-medium">
            {CONTACT_EMAIL}
          </a>{' '}
          om een demo te boeken.
        </div>
      )}
    </div>
  );
}
