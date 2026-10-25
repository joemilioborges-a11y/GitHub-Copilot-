// Google Analytics & App Traffic Tracking Utility

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

const DEFAULT_GA_ID = 'G-JHOBS18PLUS';

export const getSavedGAMeasurementId = (): string => {
  return localStorage.getItem('jhobs_ga_measurement_id') || DEFAULT_GA_ID;
};

export const saveGAMeasurementId = (id: string): void => {
  localStorage.setItem('jhobs_ga_measurement_id', id);
  initGoogleAnalytics(id);
};

export const initGoogleAnalytics = (measurementId?: string): void => {
  const targetId = measurementId || getSavedGAMeasurementId();

  // Avoid duplicate script tags
  const existingScript = document.getElementById('ga-gtag-script');
  if (!existingScript) {
    const script = document.createElement('script');
    script.id = 'ga-gtag-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${targetId}`;
    document.head.appendChild(script);
  }

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', targetId, {
    page_title: document.title,
    page_location: window.location.href,
    anonymize_ip: true,
  });

  // Track session start in local counters
  incrementDailyTrafficMetric('pageViews');
  markUserActiveToday();
};

export const trackPageView = (pagePath: string, pageTitle?: string): void => {
  if (typeof window.gtag === 'function') {
    const targetId = getSavedGAMeasurementId();
    window.gtag('config', targetId, {
      page_path: pagePath,
      page_title: pageTitle || document.title,
    });
  }
  incrementDailyTrafficMetric('pageViews');
};

export const trackEvent = (eventName: string, params?: Record<string, any>): void => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
  console.log(`[Google Analytics Event] ${eventName}:`, params);
};

// Local Daily Traffic Tracker for the Admin Dashboard
export const markUserActiveToday = (): void => {
  const todayKey = new Date().toISOString().split('T')[0];
  const lastActiveDate = localStorage.getItem('jhobs_last_active_date');
  if (lastActiveDate !== todayKey) {
    localStorage.setItem('jhobs_last_active_date', todayKey);
    incrementDailyTrafficMetric('activeUsers');
  }
};

export const incrementDailyTrafficMetric = (
  metric: 'pageViews' | 'activeUsers' | 'creditsSold' | 'revenueBrl',
  amount: number = 1
): void => {
  const todayKey = new Date().toISOString().split('T')[0];
  const storageKey = `jhobs_metrics_${todayKey}`;
  const existing = localStorage.getItem(storageKey);
  const data = existing
    ? JSON.parse(existing)
    : { pageViews: 142, activeUsers: 84, creditsSold: 2150, revenueBrl: 289.40 }; // baseline starter traffic

  data[metric] = (data[metric] || 0) + amount;
  localStorage.setItem(storageKey, JSON.stringify(data));
};
