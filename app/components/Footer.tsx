export default function Footer() {
  return (
    <footer className="border-t bg-white/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
        <span>© {new Date().getFullYear()} Inventar-Verwaltung · IT-Abteilung</span>
        <span className="flex items-center gap-2">
          <span>Next.js · Prisma · SQLite</span>
        </span>
      </div>
    </footer>
  );
}
