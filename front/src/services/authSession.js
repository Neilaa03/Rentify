import storage from '../utils/storage';

export const getAuthToken = async () => {
  return storage.getItemAsync('userToken');
};

export const getCurrentUserProfile = async () => {
  const raw = await storage.getItemAsync('userProfile');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_err) {
    return null;
  }
};

