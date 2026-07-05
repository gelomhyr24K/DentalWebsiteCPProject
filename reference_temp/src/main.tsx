import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { clinicStorage } from './lib/indexedDBStorage.ts';

async function bootstrap() {
  try {
    // Wait for IndexedDB and in-memory cache to be fully primed and ready
    await clinicStorage.ensureReady();
  } catch (e) {
    console.error('Storage preloading failed, continuing to render...', e);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap();
