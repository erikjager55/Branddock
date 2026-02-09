import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background-dark flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-8xl font-bold text-primary mb-4">404</p>
        <h1 className="text-2xl font-semibold text-text-dark mb-2">
          Page not found
        </h1>
        <p className="text-sm text-text-dark/60 max-w-md mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center h-10 px-6 rounded-md bg-primary text-white font-medium text-sm hover:bg-primary-600 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
