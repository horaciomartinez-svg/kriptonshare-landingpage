import { onRequestPost as contactPost, onRequestOptions as contactOptions } from './functions/api/contact.js';
import { onRequestGet as roomGet } from './functions/room/[id].js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API del formulario de contacto
    if (url.pathname === '/api/contact') {
      if (request.method === 'OPTIONS') return contactOptions({ request, env });
      if (request.method === 'POST') return contactPost({ request, env });
      return new Response('Method not allowed', { status: 405 });
    }

    // Deep links de data rooms
    if (url.pathname.startsWith('/room/')) {
      const id = url.pathname.replace('/room/', '').replace(/\/$/, '');
      return roomGet({ request, env, params: { id } });
    }

    // Todo lo demás: archivos estáticos
    return env.ASSETS.fetch(request);
  }
};