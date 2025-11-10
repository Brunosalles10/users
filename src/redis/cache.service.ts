import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

  /**
   * Retorna um valor do cache
   * @param key Chave única do cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redisClient.get(key);
      if (!value) return null;

      this.logger.log(`Cache HIT → ${key}`);
      return JSON.parse(value) as T;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro desconhecido';
      this.logger.error(`Erro ao ler cache (${key}): ${errorMessage}`);
      return null;
    }
  }

  /**
   * Armazena um valor no cache com tempo de expiração
   * @param key Chave do cache
   * @param value Valor a ser armazenado
   * @param ttl Tempo de expiração em segundos
   */
  async set<T>(key: string, value: T, ttl = 60): Promise<void> {
    try {
      await this.redisClient.set(key, JSON.stringify(value), 'EX', ttl);
      this.logger.log(`Cache SET → ${key} (TTL: ${ttl}s)`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro desconhecido';
      this.logger.error(`Erro ao gravar cache (${key}): ${errorMessage}`);
    }
  }

  /**
   * Remove um valor do cache
   * @param key Chave do cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
      this.logger.log(`Cache DEL → ${key}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro desconhecido';
      this.logger.error(`Erro ao deletar cache (${key}): ${errorMessage}`);
    }
  }

  /**
   * Limpa todo o cache
   */
  async flushAll(): Promise<void> {
    try {
      await this.redisClient.flushall();
      this.logger.warn(' Todos os caches foram limpos!');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro desconhecido';
      this.logger.error('Erro ao limpar todo o cache:', errorMessage);
    }
  }
}
