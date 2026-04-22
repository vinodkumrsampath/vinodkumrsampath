import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 bg-gradient-to-br from-brand-50 to-white">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-600 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-brand-500 rounded-full" />
            Every profile verified. Every person real.
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Dating with <span className="text-brand-500">real people</span>,<br />
            not bots or fake profiles.
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-lg mx-auto">
            Verified uses selfie face-matching to ensure everyone you meet is exactly who they say they are. All features free, forever.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register" className="btn-primary text-lg px-8 py-4">
              Join Free
            </Link>
            <Link href="/login" className="btn-outline text-lg px-8 py-4">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            { icon: '✅', title: 'Selfie Verified', desc: 'Every profile photo is face-matched against a live selfie' },
            { icon: '🆓', title: 'Always Free', desc: 'All features free. Premium just removes ads.' },
            { icon: '🛡', title: 'Safety First', desc: 'Safe meeting check-ins, trusted contacts, and AI moderation' },
          ].map((f) => (
            <div key={f.title} className="card p-8">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
