import { Tabs } from 'expo-router';
import { Search, Heart, MessageCircle, User } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#e11d48',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopColor: '#f3f4f6', paddingBottom: 4 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{ title: 'Discover', tabBarIcon: ({ color, size }) => <Search size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="matches"
        options={{ title: 'Matches', tabBarIcon: ({ color, size }) => <Heart size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User size={size} color={color} /> }}
      />
    </Tabs>
  );
}
