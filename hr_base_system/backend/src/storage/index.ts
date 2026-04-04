import config from '../config';
import { LocalStorageProvider } from './localStorageProvider';
import { StorageProvider } from './StorageProvider';

let provider: StorageProvider | null = null;

export const getStorageProvider = (): StorageProvider => {
  if (provider) {
    return provider;
  }

  switch (config.STORAGE_DRIVER) {
    case 'local':
      provider = new LocalStorageProvider();
      break;
    case 's3':
      throw new Error('S3 storage driver is not implemented yet');
    default:
      throw new Error(`Unsupported storage driver: ${config.STORAGE_DRIVER}`);
  }

  return provider;
};

export const resetStorageProvider = () => {
  provider = null;
};
