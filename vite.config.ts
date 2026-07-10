import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vitest/config';
import { onRequestGet } from './functions/api/ranking.js';

function localRankingApi(): Plugin {
  return {
    name: 'local-ranking-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://127.0.0.1');

        if (request.method !== 'GET' || url.pathname !== '/api/ranking') {
          next();
          return;
        }

        const apiResponse = await onRequestGet({
          request: new Request(url),
        });

        response.statusCode = apiResponse.status;
        apiResponse.headers.forEach((value, name) => {
          response.setHeader(name, value);
        });
        response.end(Buffer.from(await apiResponse.arrayBuffer()));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localRankingApi()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
