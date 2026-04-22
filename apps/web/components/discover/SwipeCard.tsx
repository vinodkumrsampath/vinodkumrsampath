'use client';

import { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Shield, X, Heart, Info } from 'lucide-react';
import { getAge } from '@verified/shared';

interface Props {
  profile: any;
  onSwipe: (id: string, dir: 'like' | 'pass') => void;
  isTop: boolean;
}

export function SwipeCard({ profile, onSwipe, isTop }: Props) {
  const [expanded, setExpanded] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-20, 20]);
  const likeOpacity = useTransform(x, [50, 150], [0, 1]);
  const passOpacity = useTransform(x, [-150, -50], [1, 0]);

  const primaryPhoto = profile.photos?.find((p: any) => p.isPrimary) ?? profile.photos?.[0];
  const age = profile.birth_date ? getAge(profile.birth_date) : '?';

  function handleDragEnd(_: any, info: { offset: { x: number } }) {
    if (info.offset.x > 100) onSwipe(profile.user_id, 'like');
    else if (info.offset.x < -100) onSwipe(profile.user_id, 'pass');
  }

  if (!isTop) {
    return (
      <div className="absolute inset-0 rounded-3xl bg-white border border-gray-100 shadow-sm scale-95 translate-y-4" />
    );
  }

  return (
    <>
      <motion.div
        style={{ x, rotate }}
        drag={isTop ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        className="absolute inset-0 rounded-3xl overflow-hidden shadow-xl cursor-grab active:cursor-grabbing select-none"
      >
        {/* Background photo */}
        {primaryPhoto ? (
          <img src={primaryPhoto.url} alt={profile.display_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center text-6xl">
            👤
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Like / Pass indicators */}
        <motion.div style={{ opacity: likeOpacity }}
          className="absolute top-8 left-8 bg-green-500 text-white text-2xl font-bold px-4 py-2 rounded-xl border-4 border-green-400 rotate-[-20deg]">
          LIKE
        </motion.div>
        <motion.div style={{ opacity: passOpacity }}
          className="absolute top-8 right-8 bg-red-500 text-white text-2xl font-bold px-4 py-2 rounded-xl border-4 border-red-400 rotate-[20deg]">
          PASS
        </motion.div>

        {/* Profile info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-2xl font-bold">{profile.display_name}, {age}</h3>
            {profile.verification_level === 'full' && (
              <Shield size={20} className="text-green-400 fill-green-400" />
            )}
          </div>
          {profile.city_display && (
            <p className="text-white/80 text-sm mb-2">{profile.city_display}</p>
          )}
          {profile.match_score && (
            <span className="inline-block bg-white/20 backdrop-blur text-white text-xs px-3 py-1 rounded-full">
              🎯 {Math.round(profile.match_score * 100)}% match
            </span>
          )}
        </div>
      </motion.div>

      {/* Action buttons */}
      <div className="absolute -bottom-16 left-0 right-0 flex justify-center gap-6">
        <button onClick={() => onSwipe(profile.user_id, 'pass')}
          className="w-14 h-14 rounded-full bg-white shadow-lg border-2 border-red-200 flex items-center justify-center hover:border-red-400 transition-colors">
          <X size={24} className="text-red-400" />
        </button>
        <button onClick={() => setExpanded(true)}
          className="w-12 h-12 rounded-full bg-white shadow-lg border-2 border-gray-200 flex items-center justify-center hover:border-gray-400 transition-colors">
          <Info size={18} className="text-gray-500" />
        </button>
        <button onClick={() => onSwipe(profile.user_id, 'like')}
          className="w-14 h-14 rounded-full bg-white shadow-lg border-2 border-brand-200 flex items-center justify-center hover:border-brand-400 transition-colors">
          <Heart size={24} className="text-brand-500" />
        </button>
      </div>
    </>
  );
}
