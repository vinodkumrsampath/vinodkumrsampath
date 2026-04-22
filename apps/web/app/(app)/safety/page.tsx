'use client';

import { useEffect, useState } from 'react';
import { Shield, UserPlus, MapPin, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api-client';

export default function SafetyPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [newContact, setNewContact] = useState({ name: '', email: '' });
  const [sosHolding, setSosHolding] = useState(false);
  const [checkInCreating, setCheckInCreating] = useState(false);
  const [checkInUrl, setCheckInUrl] = useState('');
  let sosTimer: ReturnType<typeof setTimeout>;

  useEffect(() => {
    api.get('/safety/trusted-contacts').then((d) => setContacts(d.contacts));
  }, []);

  async function addContact() {
    if (!newContact.name || !newContact.email) return;
    try {
      const { contact } = await api.post('/safety/trusted-contacts', newContact);
      setContacts((prev) => [...prev, contact]);
      setNewContact({ name: '', email: '' });
      toast.success('Contact added');
    } catch {
      toast.error('Failed to add contact');
    }
  }

  async function removeContact(id: string) {
    await api.delete(`/safety/trusted-contacts/${id}`);
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  async function createCheckIn() {
    setCheckInCreating(true);
    try {
      const { checkInUrl: url } = await api.post('/safety/check-ins', {});
      setCheckInUrl(url);
      toast.success('Check-in created! Trusted contacts notified by email.');
    } catch {
      toast.error('Failed to create check-in');
    } finally {
      setCheckInCreating(false);
    }
  }

  function handleSosStart() {
    setSosHolding(true);
    sosTimer = setTimeout(async () => {
      toast.error('SOS triggered! Trusted contacts and moderators alerted.', { duration: 8000 });
    }, 3000);
  }

  function handleSosEnd() {
    setSosHolding(false);
    clearTimeout(sosTimer);
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Shield className="text-brand-500" size={24} />
        Safety Center
      </h1>

      {/* SOS */}
      <div className="card p-6 text-center border-red-100">
        <h2 className="font-bold text-lg mb-2 text-red-600">Emergency SOS</h2>
        <p className="text-gray-600 text-sm mb-4">Hold for 3 seconds to alert your trusted contacts and moderators</p>
        <button
          onMouseDown={handleSosStart}
          onMouseUp={handleSosEnd}
          onTouchStart={handleSosStart}
          onTouchEnd={handleSosEnd}
          className={`w-40 h-40 rounded-full font-bold text-white text-xl transition-all select-none mx-auto flex items-center justify-center ${
            sosHolding
              ? 'bg-red-700 scale-95 shadow-lg'
              : 'bg-red-500 hover:bg-red-600 shadow-xl'
          }`}
        >
          <div className="flex flex-col items-center gap-1">
            <AlertTriangle size={32} />
            <span>{sosHolding ? 'Hold...' : 'SOS'}</span>
          </div>
        </button>
      </div>

      {/* Safe Meeting Check-In */}
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
          <MapPin size={18} className="text-brand-500" />
          Safe Meeting Check-In
        </h2>
        <p className="text-gray-600 text-sm mb-4">
          Going on a date? Create a check-in link. Your trusted contacts will be notified and can monitor your status.
        </p>
        {checkInUrl ? (
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-green-700 font-medium text-sm mb-2">Check-in created and shared with your contacts!</p>
            <div className="flex gap-2">
              <input value={checkInUrl} readOnly className="input text-xs flex-1" />
              <button onClick={() => { navigator.clipboard.writeText(checkInUrl); toast.success('Copied!'); }}
                className="btn-outline text-sm px-3 py-2">Copy</button>
            </div>
          </div>
        ) : (
          <button onClick={createCheckIn} disabled={checkInCreating} className="btn-primary w-full">
            {checkInCreating ? 'Creating...' : 'Create Check-In for Tonight'}
          </button>
        )}
      </div>

      {/* Trusted Contacts */}
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <UserPlus size={18} className="text-brand-500" />
          Trusted Contacts
        </h2>

        <div className="space-y-2 mb-4">
          {contacts.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs text-gray-500">{c.email}</p>
              </div>
              <button onClick={() => removeContact(c.id)}
                className="text-xs text-red-500 hover:text-red-700">Remove</button>
            </div>
          ))}
        </div>

        {contacts.length < 3 && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input placeholder="Name" value={newContact.name}
                onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))}
                className="input flex-1" />
              <input placeholder="Email" type="email" value={newContact.email}
                onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                className="input flex-1" />
            </div>
            <button onClick={addContact} className="btn-outline w-full">Add Trusted Contact</button>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-3">Max 3 trusted contacts. They will be emailed when you create a check-in.</p>
      </div>
    </div>
  );
}
