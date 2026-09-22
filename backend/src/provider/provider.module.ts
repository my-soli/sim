import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EsimProvider } from './esim-provider.js';
import { EsimAccessProvider } from './esimaccess.provider.js';
import { MockEsimProvider } from './mock.provider.js';

/** PROVIDER=mock (default) | esimaccess. Swap or add providers here only. */
@Global()
@Module({
  providers: [
    {
      provide: EsimProvider,
      inject: [ConfigService],
      useFactory: (config: ConfigService): EsimProvider =>
        config.get('PROVIDER', 'mock') === 'esimaccess' ? new EsimAccessProvider(config) : new MockEsimProvider(),
    },
  ],
  exports: [EsimProvider],
})
export class ProviderModule {}
