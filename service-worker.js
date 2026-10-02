const CACHE_NAME = 'study-tracker-cache-v11';
const RUNTIME_CACHE = 'study-tracker-runtime-v11';

// أصول التطبيق نفسه (نفس المصدر)
const APP_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './study-partner.js',
  './icon-192.png',
  './icon-512.png'
];

// مكتبات خارجية لازمة لتشغيل التطبيق (فايربيس، الخطوط، html2canvas)
// لازم تتخزن بالكاش وإلا التطبيق ينكسر إذا فتحته من جديد وبدون نت
const CDN_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=Cairo:wght@600;800&display=swap',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// نطاقات يُسمح بتخزينها وقت التشغيل (خطوط gstatic الفعلية اللي تُطلب من داخل ملف الـ CSS)
const CACHEABLE_CROSS_ORIGIN_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'www.gstatic.com',
  'cdnjs.cloudflare.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_ASSETS);
      // نخزن ملفات الـ CDN وحدة وحدة عشان لو وحدة فشلت (مثلاً مؤقتًا) ما توقف الباقي
      await Promise.all(CDN_ASSETS.map(async (url) => {
        try {
          const res = await fetch(url, { mode: 'cors' });
          if (res && (res.ok || res.type === 'opaque')) {
            await cache.put(url, res);
          }
        } catch (e) { /* بدون نت وقت التثبيت الأول - رح تتخزن لاحقًا وقت الاستخدام */ }
      }));
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== RUNTIME_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isCacheableCrossOrigin = CACHEABLE_CROSS_ORIGIN_HOSTS.includes(url.hostname);

  // نترك أي طلب لسيرفرات فايربيس الحقيقية (المصادقة والبيانات الحية Firestore/Auth API)
  // يمر مباشرة بدون تدخل، حتى لا نكسر التزامن أو نخزّنه بالخطأ
  if (!isSameOrigin && !isCacheableCrossOrigin) return;

  const cacheName = isSameOrigin ? CACHE_NAME : RUNTIME_CACHE;

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      // كاش أولاً (أسرع + يشتغل بدون نت)، ثم نحدّثه بصمت من الشبكة إذا متوفرة
      const networkFetch = fetch(req).then(async (response) => {
        if (response && (response.status === 200 || response.type === 'opaque')) {
          const clone = response.clone();
          const cache = await caches.open(cacheName);
          cache.put(req, clone);
        }
        return response;
      }).catch(() => null);

      if (cached) {
        networkFetch; // تحديث بالخلفية دون انتظار
        return cached;
      }
      const networkResponse = await networkFetch;
      return networkResponse || new Response('', { status: 504, statusText: 'Offline' });
    })()
  );
});
