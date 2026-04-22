import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, runOnJS, interpolate,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Shield, X, Heart, Info } from 'lucide-react-native';
import { api } from '../lib/api-client';
import { getAge } from '@verified/shared';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100;

function SwipeCard({ profile, onSwipe, isTop }: { profile: any; onSwipe: (id: string, dir: 'like' | 'pass') => void; isTop: boolean }) {
  const translateX = useSharedValue(0);
  const age = profile.birth_date ? getAge(profile.birth_date) : '?';
  const primaryPhoto = profile.photos?.find((p: any) => p.is_primary) ?? profile.photos?.[0];

  const gesture = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((e) => { translateX.value = e.translationX; })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_W * 1.5);
        runOnJS(onSwipe)(profile.user_id, 'like');
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_W * 1.5);
        runOnJS(onSwipe)(profile.user_id, 'pass');
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${interpolate(translateX.value, [-200, 200], [-20, 20])}deg` },
    ],
  }));

  if (!isTop) {
    return <View style={[styles.card, { transform: [{ scale: 0.95 }, { translateY: 16 }] }]} />;
  }

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, animatedStyle]}>
        {primaryPhoto ? (
          <Image source={{ uri: primaryPhoto.url }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photo, styles.placeholder]}>
            <Text style={{ fontSize: 64 }}>👤</Text>
          </View>
        )}
        <View style={styles.gradient}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.display_name}, {age}</Text>
            {profile.verification_level === 'full' && <Shield size={18} color="#4ade80" fill="#4ade80" />}
          </View>
          {profile.city_display && <Text style={styles.city}>{profile.city_display}</Text>}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export default function DiscoverScreen() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/discovery/feed')
      .then((d) => setProfiles(d.profiles.filter((p: any) => p.type !== 'ad')))
      .finally(() => setLoading(false));
  }, []);

  const handleSwipe = useCallback((id: string, dir: 'like' | 'pass') => {
    api.post('/discovery/swipe', { targetId: id, direction: dir }).catch(() => {});
    setProfiles((prev) => prev.filter((p) => p.user_id !== id));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Verified</Text>
      </View>

      <View style={styles.stackContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#e11d48" />
        ) : profiles.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No more profiles</Text>
            <Text style={styles.emptyText}>Check back later or expand your filters.</Text>
          </View>
        ) : (
          profiles.slice(0, 2).map((p, i) => (
            <SwipeCard key={p.user_id} profile={p} onSwipe={handleSwipe} isTop={i === 0} />
          ))
        )}
      </View>

      {profiles.length > 0 && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => handleSwipe(profiles[0].user_id, 'pass')} style={[styles.actionBtn, styles.passBtn]}>
            <X size={28} color="#ef4444" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSwipe(profiles[0].user_id, 'like')} style={[styles.actionBtn, styles.likeBtn]}>
            <Heart size={28} color="#e11d48" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#e11d48' },
  stackContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 20 },
  card: { position: 'absolute', width: '100%', height: 500, borderRadius: 24, overflow: 'hidden', backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  photo: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fce7f3' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 24, backgroundColor: 'rgba(0,0,0,0.5)' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 22, fontWeight: '700', color: '#fff' },
  city: { color: 'rgba(255,255,255,0.8)', marginTop: 2, fontSize: 14 },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 32, paddingVertical: 20 },
  actionBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 4, borderWidth: 2 },
  passBtn: { borderColor: '#fecaca' },
  likeBtn: { borderColor: '#fecdd3' },
  emptyCard: { alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyText: { color: '#6b7280', textAlign: 'center' },
});
