import { useCallback, useState } from 'react';

const findRootNavigation = (navigation) => {
  let current = navigation;
  let parent = current?.getParent?.();

  while (parent) {
    current = parent;
    parent = current?.getParent?.();
  }

  return current || navigation;
};

export const goToLandingForAuth = (navigation) => {
  const rootNavigation = findRootNavigation(navigation);
  if (rootNavigation?.reset) {
    rootNavigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
    return;
  }
  navigation?.navigate?.('Landing');
};

export const useGuestAuthPrompt = (navigation) => {
  const [authPromptVisible, setAuthPromptVisible] = useState(false);
  const [promptNavigation, setPromptNavigation] = useState(navigation);

  const showAuthPrompt = useCallback((nextNavigation) => {
    if (nextNavigation) setPromptNavigation(nextNavigation);
    setAuthPromptVisible(true);
  }, []);

  const closeAuthPrompt = useCallback(() => {
    setAuthPromptVisible(false);
  }, []);

  const confirmAuthPrompt = useCallback(() => {
    setAuthPromptVisible(false);
    goToLandingForAuth(promptNavigation || navigation);
  }, [navigation, promptNavigation]);

  const requireAuth = useCallback((isAuthenticated, nextNavigation) => {
    if (isAuthenticated) return true;
    if (nextNavigation) setPromptNavigation(nextNavigation);
    setAuthPromptVisible(true);
    return false;
  }, []);

  return {
    authPromptVisible,
    showAuthPrompt,
    closeAuthPrompt,
    confirmAuthPrompt,
    requireAuth,
  };
};
