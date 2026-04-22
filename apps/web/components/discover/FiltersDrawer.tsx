'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api-client';

export function FiltersDrawer({ onClose }: { onClose: () => void }) {
  const [distance, setDistance] = useState(50);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(45);

  async function handleSave() {
    try {
      await api.patch('/profiles/me', {
        matchDistanceKm: distance,
        agePrefMin: ageMin,
        agePrefMax: ageMax,
      });
      toast.success('Filters saved');
      onClose();
    } catch {
      toast.error('Failed to save filters');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Filters</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="font-medium text-gray-700 block mb-2">Distance: {distance} km</label>
            <input type="range" min={5} max={200} value={distance} onChange={(e) => setDistance(+e.target.value)}
              className="w-full accent-brand-500" />
          </div>

          <div>
            <label className="font-medium text-gray-700 block mb-2">Age range: {ageMin}–{ageMax}</label>
            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Min</p>
                <input type="number" min={18} max={ageMax - 1} value={ageMin}
                  onChange={(e) => setAgeMin(+e.target.value)} className="input" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Max</p>
                <input type="number" min={ageMin + 1} max={99} value={ageMax}
                  onChange={(e) => setAgeMax(+e.target.value)} className="input" />
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleSave} className="btn-primary w-full mt-8">Save Filters</button>
      </div>
    </div>
  );
}
