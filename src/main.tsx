import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { CatalogProvider } from './hooks/useCatalog';
import { loadCatalog } from './state/catalog';
import { session } from './state/session';
import { store } from './state/store';
import './index.css';

// Theo chế độ sáng/tối của hệ điều hành.
const dark = window.matchMedia('(prefers-color-scheme: dark)');
const applyTheme = () => document.documentElement.classList.toggle('dark', dark.matches);
applyTheme();
dark.addEventListener('change', applyTheme);

const root = createRoot(document.getElementById('root')!);
root.render(
  <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
    Đang tải danh mục linh kiện…
  </div>,
);

async function start() {
  // Thứ tự quan trọng: danh mục phải có trước khi đọc build đã lưu, vì id lạ sẽ bị bỏ.
  const catalog = await loadCatalog(session.client.configured ? () => session.client.listParts() : null);
  store.hydrate();
  void session.restore();

  root.render(
    <StrictMode>
      <CatalogProvider initial={catalog}>
        <App />
      </CatalogProvider>
    </StrictMode>,
  );
}

void start();
