'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Clock } from 'lucide-react';
import { api } from '@/lib/api-client';
import { getAge } from '@verified/shared';

export default function MessagesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/matches').then((d) => setMatches(d.matches)).finally(() => setLoading(false));
  }, []);

  const newMatches = matches.filter((m) => !m.last_message_content);
  const conversations = matches.filter((m) => m.last_message_content);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {newMatches.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                New Matches ({newMatches.length})
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {newMatches.map((m) => (
                  <Link key={m.id} href={`/messages/${m.id}`}
                    className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 ring-2 ring-brand-500">
                      {m.photos?.[0] ? (
                        <img src={m.photos[0].url} alt={m.display_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-gray-700 max-w-16 truncate">{m.display_name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Conversations
            </h2>
            {conversations.length === 0 && newMatches.length === 0 ? (
              <div className="card p-8 text-center">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-gray-600">No matches yet. Keep swiping!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((m) => {
                  const expiresAt = new Date(m.expires_at);
                  const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 3600000));
                  const isExpiringSoon = m.status === 'pending' && hoursLeft <= 24;

                  return (
                    <Link key={m.id} href={`/messages/${m.id}`}
                      className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                      <div className="relative flex-shrink-0 w-14 h-14 rounded-full overflow-hidden bg-gray-100">
                        {m.photos?.[0] ? (
                          <img src={m.photos[0].url} alt={m.display_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                        )}
                        {m.verification_level === 'full' && (
                          <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-0.5">
                            <Shield size={10} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <span className="font-semibold text-gray-900">{m.display_name}</span>
                          <span className="text-xs text-gray-400">
                            {m.last_message_at ? new Date(m.last_message_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                        {isExpiringSoon ? (
                          <p className="text-xs text-orange-500 flex items-center gap-1 mt-0.5">
                            <Clock size={12} /> Expires in {hoursLeft}h — say something!
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500 truncate">{m.last_message_content}</p>
                        )}
                      </div>
                      {m.unread_count > 0 && (
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center font-bold">
                          {m.unread_count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
