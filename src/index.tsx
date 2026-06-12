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
 * React StrictMode (which double-invokes effects in dev). The hooks
 * are thin wrappers around the SDK's methods plus reactive state for
 * the current permission + ready signal.
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
import { ReachBell, type ReachBellConfig, type SubscribeResult, type ApiResult } from '@reachbell/sdk';

interface ReachBellContextValue {
  /** Has the SDK's bootstrap settled (success OR failure)? */
  isReady:    boolean;
  /** Current Notification permission state — null on the server / first render. */
  permission: NotificationPermission | null;
  prompt:     () => Promise<SubscribeResult>;
  identify:   (externalId: string) => Promise<ApiResult>;
  tag:        (tags: string[]) => Promise<ApiResult>;
  /** Direct access to the underlying SDK if you need it. */
  sdk:        typeof ReachBell;
}

const ReachBellContext = createContext<ReachBellContextValue | null>(null);

export interface ReachBellProviderProps extends Omit<ReachBellConfig, 'force'> {
  children: ReactNode;
}

export function ReachBellProvider({ children, ...config }: ReachBellProviderProps): ReactNode {
  const initialized = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  // Bootstrap exactly once. StrictMode runs effects twice in dev; the
  // SDK's own idempotency guard makes the second init a no-op, but
  // tracking it here also stops the local state from re-firing.
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    ReachBell.init(config);

    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }

    let cancelled = false;
    ReachBell.ready
      .catch(() => { /* the SDK warned-once already */ })
      .finally(() => { if (!cancelled) setIsReady(true); });
    return () => { cancelled = true; };
    // The config is captured on first mount intentionally. To re-init
    // with new config, unmount + remount the provider (or use
    // ReachBell.init({ …, force: true }) directly).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prompt = useCallback(async (): Promise<SubscribeResult> => {
    const r = await ReachBell.prompt();
    if (typeof Notification !== 'undefined') setPermission(Notification.permission);
    return r;
  }, []);

  const identify = useCallback((externalId: string) => ReachBell.identify(externalId), []);
  const tag      = useCallback((tags: string[]) => ReachBell.tag(tags), []);

  const value = useMemo<ReachBellContextValue>(
    () => ({ isReady, permission, prompt, identify, tag, sdk: ReachBell }),
    [isReady, permission, prompt, identify, tag],
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
  const { permission } = useReachBell();
  const [local, setLocal] = useState<NotificationPermission | null>(permission);

  // Keep `local` in sync if the provider updates after a prompt() call.
  useEffect(() => { setLocal(permission); }, [permission]);

  const refresh = useCallback(() => {
    if (typeof Notification !== 'undefined') {
      setLocal(Notification.permission);
      return Notification.permission;
    }
    return null;
  }, []);

  return { permission: local, refresh };
}

export type { ReachBellConfig, SubscribeResult, ApiResult } from '@reachbell/sdk';
