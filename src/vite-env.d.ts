/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL nhóm API Xano chứa /build (và /auth nếu cùng nhóm). */
  readonly VITE_XANO_API_URL?: string;
  /** Base URL nhóm API đăng nhập của Xano, chỉ cần khi khác nhóm trên. */
  readonly VITE_XANO_AUTH_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
