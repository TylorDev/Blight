/// <reference types="vite/client" />

import type { AppApi } from "../electron/types";

declare global {
  interface Window {
    blight: AppApi;
  }
}
