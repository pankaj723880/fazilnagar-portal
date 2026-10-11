export default function CityHero() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-12">
      <img src="https://images.unsplash.com/photo-1548013146-72479768bada" className="absolute inset-0 w-full h-full object-cover opacity-20" alt="Background" />
      <div className="relative z-10 max-w-2xl">
        <h1 className="text-5xl font-extrabold mb-4">Welcome to Fazilnagar</h1>
        <p className="text-lg text-slate-300">An ancient land of historical reverence, known historically as Pawanagar, tied to the sacred legacy of Lord Buddha.</p>
      </div>
    </div>
  );
}