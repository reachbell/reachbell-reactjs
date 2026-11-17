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
| `<ReachBellProvider {...config}>` | Initialises the SDK once, on the first render where `apiKey` is set (so config loaded asynchronously works). Accepts every `ReachBellConfig` field except `force`; later config changes are ignored, remount the provider or call `ReachBell.init({ ..., force: true })` to re-initialise. |
| `useReachBell()` | Returns `{ isReady, permission, prompt, identify, tag, showToast, showBanner, showNotificationCenter, sdk }`. `permission` is `null` until mount, then follows the browser permission (including changes made by the SDK's auto-prompt or bell widget, where `navigator.permissions` is supported). |
| `useNotificationPermission()` | Returns `{ permission, refresh }` for components that only care about the permission state. |

`prompt() / identify() / tag()` are thin wrappers around the same methods on `@reachbell/sdk`. See the SDK docs for return shapes.

The provider is StrictMode-safe: an internal `useRef` plus the SDK's idempotency guard make sure init runs exactly once, and `isReady` still becomes `true` after StrictMode's double effect run in development.

The built bundle starts with `"use client"`, so Next.js App Router Server Components can import it and render `<ReachBellProvider>` directly (pass serialisable props only). The hooks still need a client component.

## License

MIT © DotSpheres Technologies Pvt Ltd
