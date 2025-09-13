import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { OnModuleInit } from '@nestjs/common';
import appConfig from 'src/config/app.config';
import Redis from 'ioredis';
import * as jwt from 'jsonwebtoken';
import { UserRepository } from 'src/common/repository/user/user.repository';
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit
{
  @WebSocketServer()
  server: Server;

  private redisPubClient: Redis;
  private redisSubClient: Redis;

  // Map to store connected clients
  private clients = new Map<string, string>(); // userId -> socketId

  constructor(private readonly notificationService: NotificationService) {}

  onModuleInit() {
    this.redisPubClient = new Redis({
      host: appConfig().redis.host,
      port: Number(appConfig().redis.port),
      password: appConfig().redis.password,
    });

    this.redisSubClient = new Redis({
      host: appConfig().redis.host,
      port: Number(appConfig().redis.port),
      password: appConfig().redis.password,
    });

    this.redisSubClient.subscribe('notification', (err, message: string) => {
      const data = JSON.parse(message);
      this.server.emit('receiveNotification', data);
    });
  }

  afterInit(server: Server) {
    console.log('Websocket server started');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    // client.handshake.query.token;
    // console.log('new connection!', client.id);

          // const token =
          //   client.handshake.auth.token || client.handshake.query.token;


    const token =
      client.handshake.auth.token || client.handshake.query.token;
    const decoded: any = jwt.verify(token as string, appConfig().jwt.secret);

    // console.log("token", token)

    const userId = (client.handshake.query.userId as string) || decoded.sub; // User ID passed as query parameter
    if (userId) {
      this.clients.set(userId, client.id);
      client.join(userId);
    }

    const user = await UserRepository.getUserDetails(userId);
    console.log(`User ${user.name} connected from notification gateway`);
  }

  handleDisconnect(client: Socket) {
    // console.log('client disconnected!', client.id);
    const userId = [...this.clients.entries()].find(
      ([, socketId]) => socketId === client.id,
    )?.[0];
    if (userId) {
      this.clients.delete(userId);
      console.log(`User ${userId} disconnected`);
    }
  }

  // @SubscribeMessage('joinRoom')
  // handleRoomJoin(client: Socket, room: string) {
  //   client.join(room);
  //   client.emit('joinedRoom', room);
  // }

  @SubscribeMessage('sendNotification')
  async handleNotification(@MessageBody() data: any) {
    console.log(`Received notification: ${JSON.stringify(data)}`);
    // Broadcast notification to all clients
    // this.server.emit('receiveNotification', data);

    // Emit notification to specific client
    const targetSocketId = this.clients.get(data.userId);
    if (targetSocketId) {
      await this.redisPubClient.publish('notification', JSON.stringify(data));

      // console.log(`Notification sent to user ${data.userId}`);
    } else {
      // console.log(`User ${data.userId} not connected`);
    }
  }

  @SubscribeMessage('createNotification')
  create(@MessageBody() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  @SubscribeMessage('findAllNotification')
  findAll() {
    return this.notificationService.findAll();
  }

  @SubscribeMessage('findOneNotification')
  findOne(@MessageBody() id: string) {
    return this.notificationService.findOne(id);
  }

  @SubscribeMessage('updateNotification')
  update(@MessageBody() data: { id: string; update: UpdateNotificationDto }) {
    return this.notificationService.update(data.id, data.update);
  }

  @SubscribeMessage('removeNotification')
  remove(@MessageBody() id: string) {
    return this.notificationService.remove(id);
  }
}
