import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getAuthToken } from '../services/authSession';
import { addFavorite, getFavorites, removeFavorite } from '../services/favorites';

const FavoritesContext = createContext(null);

export const FavoritesProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [isReady, setIsReady] = useState(false);

  const loadToken = useCallback(async () => {
    const t = await getAuthToken();
    setToken(t || null);
    return t || null;
  }, []);

  const refresh = useCallback(
    async (forcedToken) => {
      const t = forcedToken ?? token ?? (await loadToken());
      if (!t) {
        setFavoriteIds(new Set());
        setIsReady(true);
        return { ids: [], items: [] };
      }
      const result = await getFavorites({ token: t });
      setFavoriteIds(new Set(result?.ids || []));
      setIsReady(true);
      return result;
    },
    [loadToken, token]
  );

  useEffect(() => {
    refresh().catch(() => setIsReady(true));
  }, [refresh]);

  const isFavorite = useCallback((listingId) => favoriteIds.has(listingId), [favoriteIds]);

  const toggle = useCallback(
    async (listingId) => {
      const t = token ?? (await loadToken());
      if (!t || !listingId) return false;

      const currently = favoriteIds.has(listingId);
      const next = new Set(favoriteIds);

      // Optimistic update
      if (currently) next.delete(listingId);
      else next.add(listingId);
      setFavoriteIds(next);

      try {
        if (currently) await removeFavorite({ token: t, listingId });
        else await addFavorite({ token: t, listingId });
        return !currently;
      } catch (_err) {
        // Rollback
        setFavoriteIds(new Set(favoriteIds));
        return currently;
      }
    },
    [favoriteIds, loadToken, token]
  );

  const value = useMemo(
    () => ({
      isReady,
      favoriteIds,
      isFavorite,
      refreshFavorites: refresh,
      toggleFavorite: toggle,
    }),
    [favoriteIds, isFavorite, isReady, refresh, toggle]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  return (
    ctx || {
      isReady: true,
      favoriteIds: new Set(),
      isFavorite: () => false,
      refreshFavorites: async () => ({ ids: [], items: [] }),
      toggleFavorite: async () => false,
    }
  );
};
