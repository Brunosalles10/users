import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

//Permiti que os microsserviços se comuniquem entre si via Redis Pub/Sub

@Injectable()
export class PubSubService implements OnModuleInit {
  private readonly logger = new Logger(PubSubService.name);
  private subscriber: Redis;

  constructor(@Inject('REDIS_CLIENT') private readonly publisher: Redis) {}

  //Inicializa o subscriber Redis

  async onModuleInit() {
    this.subscriber = this.publisher.duplicate();

    this.subscriber.on('connect', () => {
      this.logger.log('Subscriber conectado ao Redis Service USERS');
    });

    this.subscriber.on('message', (channel, message) => {
      this.logger.log(`Evento recebido no canal [${channel}]: ${message}`);
      this.handleEvent(channel, message);
    });

    //  Canais que deseja ouvir
    await this.subscriber.subscribe(
      'user.created',
      'user.updated',
      'user.deleted',
      'activity.created',
      'activity.updated',
      'activity.deleted',
    );
  }

  //Publica uma mensagem em um canal específico

  async publish(channel: string, message: any) {
    try {
      const payload = JSON.stringify(message);
      await this.publisher.publish(channel, payload);
      this.logger.log(`Evento publicado → [${channel}] ${payload}`);
    } catch (err) {
      if (err instanceof Error) {
        this.logger.error(
          `Erro ao publicar evento (${channel}): ${err.message}`,
        );
      } else {
        this.logger.error(`Erro desconhecido ao publicar evento: ${err}`);
      }
    }
  }

  // Logica para lidar com eventos recebidos

  private handleEvent(channel: string, message: string) {
    try {
      interface UserEvent {
        id: string;
        email: string;
        name?: string;
        userId?: string;
      }
      const data = JSON.parse(message) as UserEvent;

      switch (channel) {
        case 'user.created':
          this.logger.log(`Novo usuário criado: ${data.email} (id=${data.id})`);
          break;
        case 'user.updated':
          this.logger.log(`Usuário atualizado: ${data.id}`);
          break;
        case 'user.deleted':
          this.logger.warn(`Usuário removido: ${data.id}`);
          break;
        case 'activity.created':
          this.logger.log(
            `Nova atividade criada (id=${data.id}) para usuário ${data.userId}`,
          );
          break;
        case 'activity.updated':
          this.logger.log(`Atividade atualizada (id=${data.id})`);
          break;
        default:
          this.logger.warn(`Canal desconhecido: ${channel}`);
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        this.logger.error(` Erro ao processar mensagem: ${err.message}`);
      } else {
        this.logger.error(
          `Erro desconhecido ao processar mensagem: ${String(err)}`,
        );
      }
    }
  }
}
