import { ComponentType, lazy, LazyExoticComponent } from 'react';

/**
 * lazyWithRetry
 * Tự động phục hồi và reload trang khi gặp lỗi stale chunk sau khi deploy bản mới:
 * "Failed to fetch dynamically imported module: .../assets/Page-xxx.js"
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    const pageHasBeenForceRefreshed = window.sessionStorage.getItem('chunk_force_refreshed');

    try {
      const component = await componentImport();
      // Dọn cờ sau khi nạp module thành công
      window.sessionStorage.removeItem('chunk_force_refreshed');
      return component;
    } catch (error: any) {
      const errorMessage = error?.message || '';
      const isChunkLoadFailed =
        errorMessage.includes('Failed to fetch dynamically imported module') ||
        errorMessage.includes('Importing a module script failed') ||
        errorMessage.includes('dynamically imported module') ||
        errorMessage.includes('Loading chunk') ||
        error?.name === 'ChunkLoadError';

      if (isChunkLoadFailed) {
        console.warn('Phát hiện bản cập nhật mới trên server (stale chunk), tự động nạp lại...', error);
        if (!pageHasBeenForceRefreshed) {
          window.sessionStorage.setItem('chunk_force_refreshed', 'true');
          window.location.reload();
          // Giữ promise treo trong lúc trình duyệt reload
          return new Promise<{ default: T }>(() => {});
        }
      }

      throw error;
    }
  });
}
