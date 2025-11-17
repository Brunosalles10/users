import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

//Permiti que os microsserviços se comuniquem entre si via Redis Pub/Sub

@Injectable()
export class PubSubService {
  private readonly logger = new Logger('UsersPubSub');

  constructor(@Inject('REDIS_CLIENT') private readonly publisher: Redis) {}

  //Publica uma mensagem em um canal específico
  async publish(channel: string, message: any): Promise<void> {
    try {
      const payload = JSON.stringify(message);
      await this.publisher.publish(channel, payload);
      this.logger.log(`Evento publicado → [${channel}] ${payload}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Erro ao publicar no canal ${channel}: ${msg}`);
    }
  }
}
