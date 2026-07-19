import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    async function routeUser() {
      if (!isSupabaseConfigured) {
        router.replace('/login');
        return;
      }
      const { data } = await getSupabaseClient().auth.getUser();
      if (!active) return;
      router.replace(data.user ? '/rooms' : '/login');
    }
    routeUser();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <ThemedView type="backgroundElement" style={styles.screen}>
      <ThemedText type="small" themeColor="textSecondary">
        読み込み中…
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
