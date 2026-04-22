'use client';

import { SwipeCard } from './SwipeCard';

interface Props {
  profiles: any[];
  onSwipe: (id: string, dir: 'like' | 'pass') => void;
}

export function SwipeStack({ profiles, onSwipe }: Props) {
  const visible = profiles.slice(0, 3);

  return (
    <div className="relative" style={{ height: 520 }}>
      {visible.map((profile, i) => (
        <SwipeCard
          key={profile.user_id ?? profile.id}
          profile={profile}
          onSwipe={onSwipe}
          isTop={i === 0}
        />
      ))}
    </div>
  );
}
