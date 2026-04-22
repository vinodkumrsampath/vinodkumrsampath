import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shield, Settings, ChevronRight } from 'lucide-react-native';
import { api } from '../lib/api-client';
import { useAuthStore } from '../store/authStore';
import { getAge } from '@verified/shared';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  useEffect(() => {
    api.get('/profiles/me').then(setProfile).catch(() => {});
  }, []);

  const age = profile?.birth_date ? getAge(profile.birth_date) : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity style={styles.settingsBtn}>
          <Settings size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.photoPlaceholder}>
            <Text style={{ fontSize: 48 }}>👤</Text>
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile?.display_name ?? 'Your Name'}{age ? `, ${age}` : ''}</Text>
            {user?.verificationLevel === 'full' && <Shield size={18} color="#22c55e" fill="#22c55e" />}
          </View>
          {profile?.city_display && <Text style={styles.city}>{profile.city_display}</Text>}
          {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        </View>

        {/* Menu items */}
        {[
          { label: 'Edit Profile', onPress: () => {} },
          { label: 'Verification Status', onPress: () => router.push('/auth/verify' as any) },
          { label: 'Safety Center', onPress: () => {} },
          { label: 'Preferences', onPress: () => {} },
          { label: 'Notifications', onPress: () => {} },
        ].map((item) => (
          <TouchableOpacity key={item.label} style={styles.menuRow} onPress={item.onPress}>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <ChevronRight size={18} color="#9ca3af" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  settingsBtn: { padding: 4 },
  profileCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  photoPlaceholder: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#fce7f3', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  city: { color: '#6b7280', marginBottom: 8 },
  bio: { color: '#374151', textAlign: 'center', lineHeight: 20 },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8 },
  menuLabel: { fontSize: 16, color: '#111827' },
  logoutBtn: { marginTop: 24, padding: 16, alignItems: 'center' },
  logoutText: { color: '#e11d48', fontWeight: '600', fontSize: 16 },
});
