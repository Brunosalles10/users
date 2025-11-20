import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../redis/cache.service';
import { PubSubService } from '../../redis/pubsub.service';
import { User } from '../entities/user.entity';

interface DeletePayload {
  id: number;
}

// Garante que nunca envie os dados sensíveis
type ActionPayload = Omit<User, 'password'> | DeletePayload;

@Injectable()
export class HandlePostActionsUtil {
  private readonly logger = new Logger(HandlePostActionsUtil.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly pubSubService: PubSubService,
  ) {}

  async execute(
    data: User | DeletePayload,
    action: 'created' | 'updated' | 'deleted',
  ): Promise<void> {
    // Limpa caches
    await this.clearCaches(data);

    // Publica evento
    const topic = `user.${action}`;
    await this.pubSubService.publish(topic, this.buildPayload(data, action));

    this.logger.log(`Cache limpo e evento ${topic} disparado.`);
  }

  private async clearCaches(data: User | DeletePayload): Promise<void> {
    const promises = [this.cacheService.del('users:all')];
    if ('id' in data && data.id) {
      promises.push(this.cacheService.del(`user:${data.id}`));
    }
    await Promise.all(promises);
  }

  // Constrói o payload para publicação
  private buildPayload(
    data: User | DeletePayload,
    action: string,
  ): ActionPayload {
    if (action === 'deleted') {
      return data as DeletePayload;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...payload } = data as User;
    return payload;
  }
}
