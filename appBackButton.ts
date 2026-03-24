import { useEffect } from 'react';

export const APP_BACK_BUTTON_EVENT = 'galata:app-back-button';

export const dispatchAppBackButton = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const event = new Event(APP_BACK_BUTTON_EVENT, { cancelable: true });
  return !window.dispatchEvent(event);
};

export const useAndroidBackHandler = (handler: () => boolean | void, enabled = true) => {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const listener = (event: Event) => {
      if (handler()) {
        event.preventDefault();
      }
    };

    window.addEventListener(APP_BACK_BUTTON_EVENT, listener);
    return () => window.removeEventListener(APP_BACK_BUTTON_EVENT, listener);
  }, [enabled, handler]);
};
