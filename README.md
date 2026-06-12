# @reachbell/react

React Provider + hooks for the [ReachBell](https://reachbell.com) SDK.

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
| `<ReachBellProvider {...config}>` | Initialises the SDK on mount. Accepts every `ReachBellConfig` field except `force` (the provider is single-shot). |
| `useReachBell()` | Returns `{ isReady, permission, prompt, identify, tag, sdk }`. |
| `useNotificationPermission()` | Returns `{ permission, refresh }` for components that only care about the permission state. |

`prompt() / identify() / tag()` are thin wrappers around the same methods on `@reachbell/sdk`. See the SDK docs for return shapes.

The provider is StrictMode-safe — the SDK's idempotency guard + an internal `useRef` make sure init runs exactly once.

## License

MIT © DotSpheres Technologies Pvt Ltd
