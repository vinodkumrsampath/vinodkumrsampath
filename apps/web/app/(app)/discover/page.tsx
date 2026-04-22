'use client';

import { useEffect, useState } from 'react';
import { SwipeStack } from '@/components/discover/SwipeStack';
import { FiltersDrawer } from '@/components/discover/FiltersDrawer';
import { api } from '@/lib/api-client';
import { SlidersHorizontal } from 'lucide-react';

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    api.get('/discovery/feed').then((data) => {
      setProfiles(data.profiles);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function handleSwipe(profileId: string, direction: 'like' | 'pass') {
    api.post('/discovery/swipe', { targetId: profileId, direction }).catch(() => {});
    setProfiles((prev) => prev.filter((p) => p.user_id !== profileId));
  }

  return (
    <div className="flex flex-col h-full items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-gray-900">Discover</h1>
          <button onClick={() => setShowFilters(true)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <SlidersHorizontal size={20} className="text-gray-600" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="font-bold text-lg mb-2">No more profiles</h3>
            <p className="text-gray-600">Check back later or expand your distance and age preferences.</p>
          </div>
        ) : (
          <SwipeStack profiles={profiles} onSwipe={handleSwipe} />
        )}

        {showFilters && <FiltersDrawer onClose={() => setShowFilters(false)} />}
      </div>
    </div>
  );
}
