# CivicSetu WebView camera bridge

Website mode remains the default application UI. The website requests a temporary native camera overlay through `window.ReactNativeWebView`:

```ts
window.ReactNativeWebView?.postMessage(JSON.stringify({
  type: 'CIVICSETU_OPEN_CAMERA',
  requestId: `camera_${Date.now()}`,
  facing: 'back' // or 'front'
}));
```

The native shell accepts requests only from the configured CivicSetu origin and ignores malformed or duplicate requests. It returns events to the same WebView route:

- `civicsetu:native-camera-result` — `{ type, requestId, dataUrl, filename, mimeType }`
- `civicsetu:native-camera-cancelled` — `{ type, requestId }`
- `civicsetu:native-camera-error` — `{ type, requestId, message }`

`ImagePicker` listens for the result event, validates the 8 MB limit, and stores the returned JPEG data URL in the existing `imageUrl` form state. The existing complaint submission path remains responsible for sending that state to the configured backend; no upload is reported as successful by the camera bridge itself.
