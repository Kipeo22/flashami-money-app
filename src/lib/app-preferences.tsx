import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type AppMode = 'admin' | 'participant';

type AppPreferencesContextValue = {
  appMode: AppMode;
  isLoadingPreferences: boolean;
  setAppMode: (mode: AppMode) => Promise<void>;
};

const APP_MODE_STORAGE_KEY = 'flashami-money-app:app-mode';
const DEFAULT_APP_MODE: AppMode = 'participant';

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(
  null,
);

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const [appMode, setAppModeState] = useState<AppMode>(DEFAULT_APP_MODE);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadAppMode() {
      await Promise.resolve();

      try {
        const storedMode = await AsyncStorage.getItem(APP_MODE_STORAGE_KEY);
        if (active && isAppMode(storedMode)) {
          setAppModeState(storedMode);
        }
      } finally {
        if (active) {
          setIsLoadingPreferences(false);
        }
      }
    }

    loadAppMode();

    return () => {
      active = false;
    };
  }, []);

  const setAppMode = async (mode: AppMode) => {
    setAppModeState(mode);
    await AsyncStorage.setItem(APP_MODE_STORAGE_KEY, mode);
  };

  const value = useMemo(
    () => ({
      appMode,
      isLoadingPreferences,
      setAppMode,
    }),
    [appMode, isLoadingPreferences],
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const value = useContext(AppPreferencesContext);

  if (!value) {
    throw new Error(
      'useAppPreferences must be used inside AppPreferencesProvider.',
    );
  }

  return value;
}

function isAppMode(value: string | null): value is AppMode {
  return value === 'admin' || value === 'participant';
}
