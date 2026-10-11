export default function CityOverview() {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-xl mb-2">Historical Heritage</h3>
        <p className="text-slate-600">Known as Pawanagar, this site holds deep significance in Buddhist and Jain traditions.</p>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-xl mb-2">Economy</h3>
        <p className="text-slate-600">A thriving hub for sugarcane farming and regional trade along the NH-27 corridor.</p>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-xl mb-2">Education</h3>
        <p className="text-slate-600">Rapidly developing as an educational landmark for students in eastern Uttar Pradesh.</p>
      </div>
    </div>
  );
}