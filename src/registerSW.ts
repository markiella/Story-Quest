import { registerSW } from 'virtual:pwa-register';

registerSW({
  immediate: true,
  onNeedRefresh() {
    // Auto update behavior configured in vite.config.ts
  },
  onOfflineReady() {
    console.log('Story Quest PWA is ready to work offline.');
  },
});
