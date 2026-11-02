import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[480px] px-4 py-20 text-center">
      <h1 className="text-2xl font-black">Page not found</h1>
      <p className="mt-2 text-muted">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" className="mt-5 inline-block rounded-full bg-primary px-6 py-3 font-bold text-primary-ink">
        Back to home
      </Link>
    </div>
  );
}
