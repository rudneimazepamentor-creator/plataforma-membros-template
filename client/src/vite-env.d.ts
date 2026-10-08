/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPPORT_WHATSAPP?: string;
  readonly VITE_APP_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
