const toBool = (value: string | undefined, fallback = false) => {
  if (value == null) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export const appConfig = {
  appName: import.meta.env.VITE_APP_NAME || 'AvraxeAi',
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, ''),
  apiTimeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS || 10000),
  gatewayToken: import.meta.env.VITE_OPENCLAW_TOKEN || '',
  allowDemoAuth: toBool(import.meta.env.VITE_ALLOW_DEMO_AUTH, false),
  providerAuth: {
    openai: {
      connectUrl: import.meta.env.VITE_OPENAI_OAUTH_URL || '',
      manageUrl: import.meta.env.VITE_OPENAI_MANAGE_URL || '',
    },
    claude: {
      connectUrl: import.meta.env.VITE_ANTHROPIC_OAUTH_URL || '',
      manageUrl: import.meta.env.VITE_ANTHROPIC_MANAGE_URL || '',
    },
  },
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  },
};

export const hasFirebaseConfig = Object.values(appConfig.firebase).every(Boolean);
export const hasApiBaseUrl = Boolean(appConfig.apiBaseUrl);
