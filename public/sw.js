// Minimal service worker — enables "Install app" and instant shell load.
// NOT full offline: Supabase/data requests always go to the network.
const CACHE = 'budget-shell-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // Only handle our own app shell + assets. Let Supabase, Google Fonts, etc.
  // go straight to the network untouched.
  if (url.origin !== self.location.origin) return

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copy))
        return res
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || caches.match('./index.html')),
      ),
  )
})
