// Global event-based helper to open Upgrade VIP modal from any component

export const openUpgradeProModal = (initialStep: 'details' | 'checkout' = 'details') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-upgrade-pro', { detail: { step: initialStep } }));
  }
};
