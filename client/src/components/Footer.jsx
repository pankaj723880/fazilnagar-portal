export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-10">
      <div className="max-w-6xl mx-auto px-4 py-6 text-sm flex flex-col sm:flex-row justify-between gap-2">
        <p>© {new Date().getFullYear()} Fazilnagar News. Local news for Fazilnagar & nearby areas, Kushinagar, UP.</p>
        <p>Made for the community, by the community.</p>
      </div>
    </footer>
  );
}
