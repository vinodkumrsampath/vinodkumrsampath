'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Send, Image, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api-client';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/authStore';

export default function MessageThreadPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const [match, setMatch] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [starters, setStarters] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socket = useSocket();

  useEffect(() => {
    Promise.all([
      api.get(`/matches/${matchId}`),
      api.get(`/messages/${matchId}`),
      api.get(`/messages/${matchId}/starters`),
    ]).then(([m, msgs, s]) => {
      setMatch(m);
      setMessages(msgs.messages);
      setStarters(s.starters);
    }).catch(() => router.push('/messages'));
  }, [matchId]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join_match_room', { matchId });
    socket.on('new_message', ({ message }: any) => {
      if (message.match_id === matchId) {
        setMessages((prev) => [...prev, message]);
        setStarters([]);
      }
    });
    return () => { socket.off('new_message'); };
  }, [socket, matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    setSending(true);
    try {
      const { message } = await api.post(`/messages/${matchId}`, { content: text, contentType: 'text' });
      setMessages((prev) => [...prev, message]);
      setInput('');
      setStarters([]);
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  const expiresAt = match ? new Date(match.expires_at) : null;
  const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 3600000)) : null;

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
        <button onClick={() => router.push('/messages')} className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={20} />
        </button>
        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
          {match?.photos?.[0] ? (
            <img src={match.photos[0].url} alt="" className="w-full h-full object-cover" />
          ) : <div className="w-full h-full flex items-center justify-center">👤</div>}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <span className="font-semibold">{match?.display_name}</span>
            {match?.verification_level === 'full' && <Shield size={14} className="text-green-500 fill-green-500" />}
          </div>
        </div>
      </div>

      {/* Expiry banner */}
      {match?.status === 'pending' && hoursLeft !== null && hoursLeft <= 48 && (
        <div className="bg-orange-50 border-b border-orange-100 px-4 py-2 flex items-center gap-2 text-orange-600 text-sm">
          <Clock size={14} />
          <span>Match expires in {hoursLeft}h — send a message to keep it alive</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Conversation starters */}
        {starters.length > 0 && messages.length === 0 && (
          <div className="bg-brand-50 rounded-2xl p-4 mb-2">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-3">Conversation starters</p>
            <div className="space-y-2">
              {starters.map((s: any) => (
                <button key={s.id} onClick={() => sendMessage(s.text)}
                  className="w-full text-left text-sm text-gray-700 bg-white rounded-xl px-3 py-2 border border-brand-100 hover:border-brand-300 transition-colors">
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg: any) => {
          const isMine = msg.sender_id === userId;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                isMine ? 'bg-brand-500 text-white' : 'bg-white border border-gray-100 text-gray-900'
              }`}>
                {msg.content}
                {isMine && msg.read_at && (
                  <span className="text-xs text-brand-200 ml-2">✓✓</span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-gray-100 bg-white px-4 py-3 flex items-end gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder="Type a message..."
          className="flex-1 border border-gray-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          maxLength={2000}
        />
        <button onClick={() => sendMessage(input)} disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-full bg-brand-500 hover:bg-brand-600 disabled:opacity-40 flex items-center justify-center transition-colors flex-shrink-0">
          <Send size={16} className="text-white" />
        </button>
      </div>
    </div>
  );
}
