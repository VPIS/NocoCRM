import { readAppClientPublicConfig } from '@nocobase/app-client/runtime';

/** The deployment flag is available before routes and Settings tabs render. */
export function demoEnvironmentEnabled(): boolean {
  const config = readAppClientPublicConfig() as {
    demoMode?: { enabled?: boolean };
  };
  return config?.demoMode?.enabled === true;
}
