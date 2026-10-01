/**
 * Centralized Event Tracking Utility for L-English
 * Provides standardized event tracking hooks for analytics (GA4, Meta Pixel, PostHog, Supabase audit)
 */

export interface TrackingProperties {
  [key: string]: string | number | boolean | undefined | null;
}

export const trackEvent = (eventName: string, properties?: TrackingProperties) => {
  try {
    if (import.meta.env.DEV) {
      console.log(`📊 [Analytics] ${eventName}`, properties || {});
    }

    if (typeof window !== "undefined") {
      // Dispatch browser custom event for decoupling
      window.dispatchEvent(
        new CustomEvent("le_track_event", {
          detail: {
            eventName,
            properties,
            timestamp: new Date().toISOString(),
          },
        })
      );

      // Support gtag if configured in host HTML
      if (typeof (window as any).gtag === "function") {
        (window as any).gtag("event", eventName, properties);
      }

      // Support dataLayer if present
      if (Array.isArray((window as any).dataLayer)) {
        (window as any).dataLayer.push({
          event: eventName,
          ...properties,
        });
      }
    }
  } catch (err) {
    console.error("Error in trackEvent:", err);
  }
};
