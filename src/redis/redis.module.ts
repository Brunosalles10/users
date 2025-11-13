import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { CacheService } from './cache.service';
import { PubSubService } from './pubsub.service';

/**
 * Módulo global de Redis — cria uma conexão reutilizável
 * e exporta o cliente Redis para outros serviços (cache, pub/sub, etc.)
 */
@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        // Cria e configura o cliente Redis
        const client = new Redis({
          host: process.env.REDIS_HOST || 'redis',
          port: parseInt(process.env.REDIS_PORT ?? '6379', 10), // Porta padrão do Redis
        });

        client.on('connect', () => {
          console.log(' Redis conectado com sucesso!');
        });

        client.on('error', (err) => {
          console.error('Erro ao conectar ao Redis:', err);
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
