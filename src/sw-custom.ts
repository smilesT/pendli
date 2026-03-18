import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{url: string, revision: string | null}> };

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.endsWith('/import') && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request: Request): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get('calendar') as File | null;
  const text = formData.get('text') as string | null;
  const title = formData.get('title') as string | null;

  const cache = await caches.open('share-target');

  if (file) {
    const content = await file.text();
    await cache.put('/shared-data', new Response(JSON.stringify({
      type: 'ics',
      content,
      filename: file.name
    })));
  } else if (text) {
    await cache.put('/shared-data', new Response(JSON.stringify({
      type: 'text',
      content: text,
      title: title || ''
    })));
  }

  return Response.redirect('/pendli/import?source=share', 303);
}
