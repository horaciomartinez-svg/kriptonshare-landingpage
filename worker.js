import contactHandler from './functions/api/contact.js';
import roomHandler from './functions/room/[id].js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact') {
      return contactHandler.onRequestPost
        ? contactHandler.onRequestPost({ request, env })
        : new Response('Method not allowed', { status: 405 });
    }

    if (url.pathname.startsWith('/room/')) {
      const id = url.pathname.replace('/room/', '').replace(/\/$/, '');
      return roomHandler.onRequestGet({ request, env, params: { id } });
    }

    // Todo lo demás: archivos estáticos
    return env.ASSETS.fetch(request);
  }
};