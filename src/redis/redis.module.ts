import { Global, Logger, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { CacheService } from './cache.service';
import { PubSubService } from './pubsub.service';

// Módulo Redis global para cache e Pub/Sub
@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        const logger = new Logger('RedisClient');
        // Cria e configura o cliente Redis
        const client = new Redis({
          host: process.env.REDIS_HOST || 'redis',
          port: parseInt(process.env.REDIS_PORT ?? '6379', 10), // Porta padrão do Redis
        });

        client.on('connect', () => {
          logger.log('Conectado ao Redis com sucesso!');
        });

        client.on('error', (err) => {
          logger.error(`Erro na conexão com o Redis: ${err.message}`);
        });

        return client;
      },
    },
    CacheService,
    PubSubService,
  ],
  exports: ['REDIS_CLIENT', CacheService, PubSubService],
})
export class RedisModule {}
