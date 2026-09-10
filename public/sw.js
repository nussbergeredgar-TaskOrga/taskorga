const CACHE_NAME = "taskorga-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Push-Benachrichtigungen (siehe lib/push.ts, components/push-notification-toggle.tsx).
// Payload ist immer JSON {title, body, url}, siehe PushPayload in lib/push.ts.
self.addEventListener("push", (event) => {
  let data = { title: "TaskOrga", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Payload nicht wie erwartet -- Standardtext verwenden statt abzustuerzen
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url },
    })
  );
});

// Klick auf die Benachrichtigung: bereits offenen Tab fokussieren statt einen
// neuen zu oeffnen, falls die App schon in einem Tab laeuft.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// Network-first: immer aktuelle Daten holen, nur bei Offline auf Cache zurückfallen
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        return cached || Response.error();
      })
  );
});
