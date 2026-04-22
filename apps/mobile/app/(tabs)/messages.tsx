import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Shield, Clock } from 'lucide-react-native';
import { api } from '../lib/api-client';

export default function MessagesScreen() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api.get('/matches').then((d) => setMatches(d.matches)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#e11d48" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Messages</Text>
      <FlatList
        data={matches}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        renderItem={({ item: m }) => {
          const expiresAt = new Date(m.expires_at);
          const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 3600000));
          const isExpiringSoon = m.status === 'pending' && hoursLeft <= 48;

          return (
            <TouchableOpacity style={styles.row} onPress={() => router.push(`/messages/${m.id}` as any)}>
              <View style={styles.avatar}>
                {m.photos?.[0] ? (
                  <Image source={{ uri: m.photos[0].url }} style={styles.avatarImg} contentFit="cover" />
                ) : <Text style={{ fontSize: 24 }}>👤</Text>}
                {m.verification_level === 'full' && (
                  <View style={styles.verifiedBadge}>
                    <Shield size={10} color="#fff" />
                  </View>
                )}
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{m.display_name}</Text>
                {isExpiringSoon ? (
                  <View style={styles.expiryRow}>
                    <Clock size={12} color="#f97316" />
                    <Text style={styles.expiryText}>Expires in {hoursLeft}h</Text>
                  </View>
                ) : (
                  <Text style={styles.preview} numberOfLines={1}>
                    {m.last_message_content ?? 'Say hello!'}
                  </Text>
                )}
              </View>
              {m.unread_count > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{m.unread_count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>💬</Text>
            <Text style={{ color: '#6b7280' }}>No matches yet. Start swiping!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', paddingHorizontal: 20, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f3f4f6', overflow: 'hidden', position: 'relative', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: '100%', height: '100%' },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#22c55e', borderRadius: 8, padding: 2 },
  info: { flex: 1 },
  name: { fontWeight: '600', color: '#111827', fontSize: 16, marginBottom: 2 },
  preview: { color: '#6b7280', fontSize: 14 },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expiryText: { color: '#f97316', fontSize: 13 },
  badge: { backgroundColor: '#e11d48', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 80 },
});
