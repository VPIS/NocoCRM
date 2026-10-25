// Use the deployment's existing administrator, independently of dataset accounts.
export const demoAdminUsername =
  process.env.DEMO_TEST_ADMIN_USERNAME ?? 'nocobase';
