// Provider-neutrale demo-boeking (Morgen/Calendly/Cal.com). Zonder booking-URL:
// val terug op de contactpagina i.p.v. een dood `#`. Gedeeld door de homepage
// en de guardrails-pagina (P2.2).

import Link from 'next/link';

/** Demo-boekingsknop: externe booking-URL als die er is, anders de contactpagina. */
export default function BookDemoButton({ className }: { className?: string }) {
  const bookingUrl =
    process.env.NEXT_PUBLIC_BOOKING_URL ?? process.env.NEXT_PUBLIC_CALENDLY_URL ?? null;
  const cls =
    className ??
    'inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50';
  if (bookingUrl) {
    return (
      <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className={cls}>
        Boek een demo
      </a>
    );
  }
  return (
    <Link href="/marketing/contact" className={cls}>
      Boek een demo
    </Link>
  );
}
