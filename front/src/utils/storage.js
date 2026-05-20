const isWeb = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

let SecureStoreModule = null;
// On web, prefer localStorage fallback and avoid requiring expo-secure-store
if (!isWeb) {
  try {
    SecureStoreModule = require('expo-secure-store');
    if (SecureStoreModule && SecureStoreModule.default) SecureStoreModule = SecureStoreModule.default;
  } catch (e) {
    SecureStoreModule = null;
  }
} else {
  SecureStoreModule = null;
}

const storage = {
  async setItemAsync(key, value) {
    if (SecureStoreModule) {
      if (SecureStoreModule.setItemAsync) return SecureStoreModule.setItemAsync(key, value);
      if (SecureStoreModule.setValueWithKeyAsync) return SecureStoreModule.setValueWithKeyAsync(key, value);
    }
    if (isWeb) {
      window.localStorage.setItem(key, value);
      return;
    }
    throw new Error('No storage available');
  },

  async getItemAsync(key) {
    if (SecureStoreModule) {
      if (SecureStoreModule.getItemAsync) return SecureStoreModule.getItemAsync(key);
      if (SecureStoreModule.getValueWithKeyAsync) return SecureStoreModule.getValueWithKeyAsync(key);
    }
    if (isWeb) {
      return window.localStorage.getItem(key);
    }
    return null;
  },

  async deleteItemAsync(key) {
    if (SecureStoreModule) {
      if (SecureStoreModule.deleteItemAsync) return SecureStoreModule.deleteItemAsync(key);
      if (SecureStoreModule.deleteValueWithKeyAsync) return SecureStoreModule.deleteValueWithKeyAsync(key);
    }
    if (isWeb) {
      window.localStorage.removeItem(key);
      return;
    }
    return;
  },
};

export default storage;
