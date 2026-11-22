/**
 * @reachbell/react — React bindings for the ReachBell SDK.
 *
 *   import { ReachBellProvider, useReachBell } from '@reachbell/react';
 *
 *   <ReachBellProvider apiKey="rb_live_…" autoPrompt>
 *     <App />
 *   </ReachBellProvider>
 *
 *   const { prompt, identify, tag, ready, permission } = useReachBell();
 *
 * The provider initialises the underlying SDK exactly once, even under
 * React StrictMode (which double-invokes effects in dev). React runs child
 * effects before the provider's, so prompt/identify/tag also initialise
 * lazily from the latest props: a child calling identify() on mount works.
 * The hooks are thin wrappers around the SDK's methods plus reactive state
 * for the current permission + ready signal.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ReachBell,
  type ReachBellConfig,
  type SubscribeResult,
  type ApiResult,
  type IdentifyOptions,
  type ToastOptions,
  type BannerOptions,
  type NotificationCenterOptions,
  type NotificationHistoryItem,
} from '@reachbell/sdk';

interface ReachBellContextValue {
  /** Has the SDK's bootstrap settled (success OR failure)? */
  isReady:    boolean;
  /** Current Notification permission state — null on the server / first render. */
  permission: NotificationPermission | null;
  prompt:     () => Promise<SubscribeResult>;
  /** Link the subscription to your user id; `null` unlinks it (logout). */
  identify:   (externalId: string | null, opts?: IdentifyOptions) => Promise<ApiResult>;
  tag:        (tags: string[]) => Promise<ApiResult>;
  /** In-page corner toast notification */
  showToast:  (opts: ToastOptions) => () => void;
  /** In-page sticky banner */
  showBanner: (opts: BannerOptions) => () => void;
  /** Floating notification center widget */
  showNotificationCenter: (opts?: NotificationCenterOptions) => () => void;
  /** Re-read the browser permission into the provider state (and every consumer). */
  refreshPermission: () => NotificationPermission | null;
  /** Direct access to the underlying SDK if you need it. */
  sdk:        typeof ReachBell;
}

const ReachBellContext = createContext<ReachBellContextValue | null>(null);

export interface ReachBellProviderProps extends Omit<ReachBellConfig, 'force'> {
  children: ReactNode;
}

export function ReachBellProvider({ children, ...config }: ReachBellProviderProps): ReactNode {
  // Latest props, read lazily by ensureInit() so a child's identify()/tag()/
  // prompt() on mount (which runs before this provider's effects) can init.
  const configRef = useRef(config);
  configRef.current = config;
  const initialized = useRef(false);
  const trackedReady = useRef<Promise<void> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const { apiKey } = config;

  /** Follow the SDK's current boot promise; a (force) re-init swaps it. */
  const trackReady = useCallback(() => {
    if (!initialized.current) return;
    const ready = ReachBell.ready;
    if (ready === trackedReady.current) return;
    trackedReady.current = ready;
    setIsReady(false);
    ready
      .catch(() => { /* the SDK warned-once already */ })
      .finally(() => {
        if (trackedReady.current !== ready) return;
        setIsReady(true);
        if (typeof Notification !== 'undefined') setPermission(Notification.permission);
      });
  }, []);

  /** Init once, on the client, once an apiKey is known. Safe to call often. */
  const ensureInit = useCallback((): void => {
    if (initialized.current || typeof window === 'undefined') return;
    const latest = configRef.current;
    if (!latest.apiKey) return;
    initialized.current = true;
    ReachBell.init({ ...latest });
  }, []);

  useEffect(() => {
    ensureInit();
    trackReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  useEffect(() => {
    // Someone called ReachBell.init({ force: true }): wait for the new boot.
    if (typeof window === 'undefined') return;
    window.addEventListener('reachbell:init', trackReady);
    return () => window.removeEventListener('reachbell:init', trackReady);
  }, [trackReady]);

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    const sync = () => setPermission(Notification.permission);
    sync();

    let disposed = false;
    let status: PermissionStatus | null = null;
    if (typeof navigator !== 'undefined' && navigator.permissions && typeof navigator.permissions.query === 'function') {
      try {
        navigator.permissions
          .query({ name: 'notifications' })
          .then((s) => {
            if (disposed || typeof s.addEventListener !== 'function') return;
            status = s;
            s.addEventListener('change', sync);
          })
          .catch(() => {});
      } catch {}
    }
    return () => {
      disposed = true;
      status?.removeEventListener('change', sync);
    };
  }, []);

  const refreshPermission = useCallback((): NotificationPermission | null => {
    if (typeof Notification === 'undefined') return null;
    setPermission(Notification.permission);
    return Notification.permission;
  }, []);

  const prompt = useCallback(async (): Promise<SubscribeResult> => {
    ensureInit();
    const r = await ReachBell.prompt();
    refreshPermission();
    return r;
  }, [ensureInit, refreshPermission]);

  const identify = useCallback((externalId: string | null, opts?: IdentifyOptions) => {
    ensureInit();
    return ReachBell.identify(externalId, opts);
  }, [ensureInit]);
  const tag = useCallback((tags: string[]) => {
    ensureInit();
    return ReachBell.tag(tags);
  }, [ensureInit]);
  const showToast = useCallback((opts: ToastOptions) => ReachBell.showToast(opts), []);
  const showBanner = useCallback((opts: BannerOptions) => ReachBell.showBanner(opts), []);
  const showNotificationCenter = useCallback((opts?: NotificationCenterOptions) => ReachBell.showNotificationCenter(opts), []);

  const value = useMemo<ReachBellContextValue>(
    () => ({
      isReady,
      permission,
      prompt,
      identify,
      tag,
      showToast,
      showBanner,
      showNotificationCenter,
      refreshPermission,
      sdk: ReachBell,
    }),
    [isReady, permission, prompt, identify, tag, showToast, showBanner, showNotificationCenter, refreshPermission],
  );

  return <ReachBellContext.Provider value={value}>{children}</ReachBellContext.Provider>;
}

/**
 * Access the ReachBell client + reactive state from any component
 * underneath <ReachBellProvider />.
 */
export function useReachBell(): ReachBellContextValue {
  const ctx = useContext(ReachBellContext);
  if (!ctx) {
    throw new Error('useReachBell() called outside of <ReachBellProvider>. Wrap your app root.');
  }
  return ctx;
}

/**
 * Convenience hook that returns just the current Notification permission
 * state and a re-check function.
 */
export function useNotificationPermission(): {
  permission: NotificationPermission | null;
  refresh:    () => NotificationPermission | null;
} {
  // Read straight from the provider so refresh() updates every consumer.
  const { permission, refreshPermission } = useReachBell();
  return { permission, refresh: refreshPermission };
}

export type {
  ReachBellConfig,
  SubscribeResult,
  ApiResult,
  IdentifyOptions,
  ToastOptions,
  BannerOptions,
  NotificationCenterOptions,
  NotificationHistoryItem,
} from '@reachbell/sdk';
