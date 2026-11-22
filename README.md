# @reachbell/react

React Provider + hooks for the [ReachBell](https://reachbell.com) SDK.

Full documentation: https://docs.reachbell.com

## Install

```bash
npm install @reachbell/react @reachbell/sdk
```

## Quickstart

```tsx
import { ReachBellProvider, useReachBell } from '@reachbell/react';

export default function App() {
  return (
    <ReachBellProvider apiKey="rb_live_yourkey" autoPrompt>
      <YourApp />
    </ReachBellProvider>
  );
}

function SubscribeButton() {
  const { prompt, isReady, permission } = useReachBell();
  if (!isReady) return <button disabled>Loading…</button>;
  if (permission === 'granted') return <span>You're subscribed</span>;
  return (
    <button onClick={async () => {
      const r = await prompt();
      if (!r.success) console.warn('Subscribe failed:', r.reason);
    }}>
      Enable notifications
    </button>
  );
}
```

## API

| Export | Notes |
| --- | --- |
| `<ReachBellProvider {...config}>` | Initialises the SDK once, on the client, as soon as `apiKey` is set (so config loaded asynchronously works). `prompt()`, `identify()` and `tag()` also initialise on first use, so a child component calling them on mount (React runs child effects before the provider's) doesn't get `sdk_not_initialized`. Accepts every `ReachBellConfig` field except `force`; later config changes (and remounting the provider) are ignored because the SDK keeps its first config — in development the provider logs a `console.warn` when its props change after init. Call `ReachBell.init({ ..., force: true })` to re-initialise — `isReady` goes back to `false` until the new boot settles. If your app already called `ReachBell.init()` itself (before the provider mounted, or with no `apiKey` prop), `isReady` still follows that SDK's boot. In that case the provider's own config props are ignored (the SDK keeps the app's config), and in development the provider warns once that its config was ignored instead of comparing later prop changes against a config that was never used. |
| `useReachBell()` | Returns `{ isReady, permission, prompt, identify, tag, showToast, showBanner, showNotificationCenter, refreshPermission, sdk }`. `permission` is `null` until mount, then follows the browser permission (including changes made by the SDK's auto-prompt or bell widget, where `navigator.permissions` is supported). |
| `useNotificationPermission()` | Returns `{ permission, refresh }` for components that only care about the permission state. `refresh()` updates the provider, so every consumer sees the new value. |

`prompt() / identify() / tag()` are thin wrappers around the same methods on `@reachbell/sdk`. See the SDK docs for return shapes. `identify(null)` unlinks the user on logout, and `identify(id, { hash })` passes an identity-verification hash through to the SDK.

Requires `@reachbell/sdk` 1.1.0 or newer.

The provider is StrictMode-safe: an internal `useRef` plus the SDK's idempotency guard make sure init runs exactly once, and `isReady` still becomes `true` after StrictMode's double effect run in development.

The built bundle starts with `"use client"`, so Next.js App Router Server Components can import it and render `<ReachBellProvider>` directly (pass serialisable props only). The hooks still need a client component.

## License

MIT © DotSpheres Technologies Pvt Ltd
