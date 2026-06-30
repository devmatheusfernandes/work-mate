/// <reference lib="webworker" />
import { 
  type PrecacheEntry, 
  type RouteMatchCallbackOptions,
  type RuntimeCaching,
  Serwist,
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  RangeRequestsPlugin,
  StaleWhileRevalidate 
} from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const PAGES_CACHE_NAME = {
  rscPrefetch: "pages-rsc-prefetch",
  rsc: "pages-rsc",
  html: "pages",
} as const;

const customCache: RuntimeCaching[] = [
  // 1. Google Fonts Webfonts
  {
    matcher: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
    handler: new CacheFirst({
      cacheName: "google-fonts-webfonts",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  // 2. Google Fonts Stylesheets
  {
    matcher: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
    handler: new StaleWhileRevalidate({
      cacheName: "google-fonts-stylesheets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  // 3. Static Font Files
  {
    matcher: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
    handler: new CacheFirst({
      cacheName: "static-font-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  // 4. Static Images (Optimized to CacheFirst)
  {
    matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
    handler: new CacheFirst({
      cacheName: "static-image-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 120, // High limit to store learning assets
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  // 5. Next.js Optimized Images (Optimized to CacheFirst)
  {
    matcher: /\/_next\/image\?url=.+$/i,
    handler: new CacheFirst({
      cacheName: "next-image",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 120,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  // 6. Next.js Static JS (CacheFirst)
  {
    matcher: /\/_next\/static.+\.js$/i,
    handler: new CacheFirst({
      cacheName: "next-static-js-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 96,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  // 7. Practice Sound and Audio Files (CacheFirst with Range Requests, 30 days TTL)
  {
    matcher: /\.(?:mp3|wav|ogg)$/i,
    handler: new CacheFirst({
      cacheName: "static-audio-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 150, // Holds many pronunciation/listening bits
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          maxAgeFrom: "last-used",
        }),
        new RangeRequestsPlugin(),
      ],
    }),
  },
  // 8. Dynamic/Static Video Assets (CacheFirst with Range Requests, 15 days TTL)
  {
    matcher: /\.(?:mp4|webm)$/i,
    handler: new CacheFirst({
      cacheName: "static-video-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 15 * 24 * 60 * 60, // 15 days
          maxAgeFrom: "last-used",
        }),
        new RangeRequestsPlugin(),
      ],
    }),
  },
  // 9. Standard Static Javascript Assets (StaleWhileRevalidate)
  {
    matcher: /\.(?:js)$/i,
    handler: new StaleWhileRevalidate({
      cacheName: "static-js-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 48,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  // 10. Static CSS/Styles (StaleWhileRevalidate)
  {
    matcher: /\.(?:css|less)$/i,
    handler: new StaleWhileRevalidate({
      cacheName: "static-style-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  // 11. Next.js Data requests (NetworkFirst)
  {
    matcher: /\/_next\/data\/.+\/.+\.json$/i,
    handler: new NetworkFirst({
      cacheName: "next-data",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  // 12. Generic static JSON/XML/CSV (NetworkFirst)
  {
    matcher: /\.(?:json|xml|csv)$/i,
    handler: new NetworkFirst({
      cacheName: "static-data-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  // 13. Exclude /api/auth/* from PWA caching entirely
  {
    matcher: /\/api\/auth\/.*/,
    handler: new NetworkOnly({
      networkTimeoutSeconds: 10,
    }),
  },
  // 14. API requests (NetworkFirst with short network timeout)
  {
    matcher: ({ sameOrigin, url: { pathname } }: RouteMatchCallbackOptions) => sameOrigin && pathname.startsWith("/api/"),
    method: "GET",
    handler: new NetworkFirst({
      cacheName: "apis",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
          maxAgeFrom: "last-used",
        }),
      ],
      networkTimeoutSeconds: 10,
    }),
  },
  // 15. Next.js RSC Prefetch requests (NetworkFirst)
  {
    matcher: ({ request, url: { pathname }, sameOrigin }: RouteMatchCallbackOptions) =>
      request.headers.get("RSC") === "1" && request.headers.get("Next-Router-Prefetch") === "1" && sameOrigin && !pathname.startsWith("/api/"),
    handler: new NetworkFirst({
      cacheName: PAGES_CACHE_NAME.rscPrefetch,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        }),
      ],
    }),
  },
  // 16. Next.js RSC standard requests (NetworkFirst)
  {
    matcher: ({ request, url: { pathname }, sameOrigin }: RouteMatchCallbackOptions) => request.headers.get("RSC") === "1" && sameOrigin && !pathname.startsWith("/api/"),
    handler: new NetworkFirst({
      cacheName: PAGES_CACHE_NAME.rsc,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        }),
      ],
    }),
  },
  // 17. HTML Document Requests (NetworkFirst)
  {
    matcher: ({ request, url: { pathname }, sameOrigin }: RouteMatchCallbackOptions) =>
      request.mode === "navigate" && sameOrigin && !pathname.startsWith("/api/"),
    handler: new NetworkFirst({
      cacheName: PAGES_CACHE_NAME.html,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        }),
      ],
    }),
  },
  // 18. Other local GETs (NetworkFirst)
  {
    matcher: ({ url: { pathname }, sameOrigin }: RouteMatchCallbackOptions) => sameOrigin && !pathname.startsWith("/api/"),
    handler: new NetworkFirst({
      cacheName: "others",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        }),
      ],
    }),
  },
  // 19. External GETs (NetworkFirst with short life)
  {
    matcher: ({ sameOrigin }: RouteMatchCallbackOptions) => !sameOrigin,
    handler: new NetworkFirst({
      cacheName: "cross-origin",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 60 * 60, // 1 hour
        }),
      ],
      networkTimeoutSeconds: 10,
    }),
  },
  // 20. Default catch-all (NetworkOnly)
  {
    matcher: /.*/i,
    method: "GET",
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: customCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.mode === "navigate";
        },
      },
    ],
  },
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("push", (event: PushEvent) => {
  const data = event.data?.json();
  if (data) {
    const title = data.title || "Notificação";
    const body = data.body || "";
    const icon = data.icon || "/icons/notification/notification-192.png";
    const badge = data.badge || "/icons/notification/notification-96.png";
    const url = data.url || "/hub";
    const type = data.type || "info";

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon,
        badge,
        data: { url, type },
      })
    );
  }
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data.url || "/")
  );
});

interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}

// Background Sync support
self.addEventListener("sync", (event: SyncEvent) => {
  if (event.tag === "sync-practice-queue") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "SYNC_QUEUE" });
        });
      })
    );
  }
});

// Web Share Target: intercept POST from OS share sheet
// When user shares audio to the PWA, this handler:
// 1. Reads the file from multipart form data
// 2. Stores it in IndexedDB under "pendingSharedAudio"
// 3. Redirects user to /hub/chat?incoming-audio=1
self.addEventListener("fetch", (event: FetchEvent) => {
  const url = new URL(event.request.url);

  if (
    event.request.method === "POST" &&
    url.pathname === "/hub/chat" &&
    url.searchParams.has("share-target") === false &&
    event.request.headers.get("content-type")?.includes("multipart/form-data")
  ) {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const audioFile = formData.get("audio") as File | null;

          if (audioFile) {
            // Store file data in a well-known IndexedDB key so the page can retrieve it
            const arrayBuffer = await audioFile.arrayBuffer();
            const db = await openShareTargetDB();
            const tx = db.transaction("pendingAudio", "readwrite");
            const store = tx.objectStore("pendingAudio");
            // Clear old pending item before storing new
            store.clear();
            store.add({
              id: "latest",
              name: audioFile.name,
              type: audioFile.type || "audio/ogg",
              size: audioFile.size,
              data: arrayBuffer,
              timestamp: Date.now(),
            });
            await new Promise<void>((resolve, reject) => {
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject(tx.error);
            });
          }
        } catch (err) {
          console.error("[SW Share Target] Error storing audio:", err);
        }

        // Always redirect to chat page with incoming-audio flag
        return Response.redirect("/hub/chat?incoming-audio=1", 303);
      })()
    );
  }
});

function openShareTargetDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("share-target-db", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("pendingAudio")) {
        db.createObjectStore("pendingAudio", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

serwist.addEventListeners();
