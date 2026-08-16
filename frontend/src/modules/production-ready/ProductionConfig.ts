export interface AppEnvironmentConfig {
  envName: 'DEV' | 'TEST' | 'STAGING' | 'PRODUCTION';
  loggingLevel: 'DEBUG' | 'INFO' | 'WARN';
  storagePath: string;
  datasetPath: string;
  enableDebugEndpoints: boolean;
  securityEnforced: boolean;
}

export class ProductionConfig {
  private activeConfig: AppEnvironmentConfig;

  constructor(env: 'DEV' | 'TEST' | 'STAGING' | 'PRODUCTION') {
    this.activeConfig = this.resolveConfig(env);
  }

  private resolveConfig(env: 'DEV' | 'TEST' | 'STAGING' | 'PRODUCTION'): AppEnvironmentConfig {
    switch (env) {
      case 'PRODUCTION':
        return {
          envName: 'PRODUCTION',
          loggingLevel: 'INFO',
          storagePath: '/var/lib/drivelegal/storage',
          datasetPath: '/var/lib/drivelegal/datasets',
          enableDebugEndpoints: false,
          securityEnforced: true,
        };
      case 'STAGING':
        return {
          envName: 'STAGING',
          loggingLevel: 'INFO',
          storagePath: '/var/lib/drivelegal-staging/storage',
          datasetPath: '/var/lib/drivelegal-staging/datasets',
          enableDebugEndpoints: false,
          securityEnforced: true,
        };
      case 'TEST':
        return {
          envName: 'TEST',
          loggingLevel: 'WARN',
          storagePath: '/tmp/drivelegal-test/storage',
          datasetPath: '/tmp/drivelegal-test/datasets',
          enableDebugEndpoints: true,
          securityEnforced: false,
        };
      default:
        return {
          envName: 'DEV',
          loggingLevel: 'DEBUG',
          storagePath: './storage-dev',
          datasetPath: './datasets-dev',
          enableDebugEndpoints: true,
          securityEnforced: false,
        };
    }
  }

  getActiveConfig(): AppEnvironmentConfig {
    return this.activeConfig;
  }

  validateStartupConfig(): boolean {
    if (!this.activeConfig.storagePath || !this.activeConfig.datasetPath) {
      console.error('[ProductionConfig] Startup check failed: Config paths cannot be empty.');
      return false;
    }
    if (this.activeConfig.envName === 'PRODUCTION' && this.activeConfig.enableDebugEndpoints) {
      console.error('[ProductionConfig] Startup check failed: Debug endpoints must be disabled in Production.');
      return false;
    }
    console.log(`[ProductionConfig] Startup check passed. Running in ${this.activeConfig.envName} mode.`);
    return true;
  }
}
export default ProductionConfig;
