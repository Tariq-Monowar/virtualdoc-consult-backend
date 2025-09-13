import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, OnModuleInit } from '@nestjs/common';
import { MessageStatus } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import appConfig from '../../../config/app.config';
import { ChatRepository } from 'src/common/repository/chat/chat.repository';
import { AppointmentRepository } from 'src/common/repository/appointment/appointment.repository';
import { MissedCallRepository } from 'src/common/repository/missed-call/missed-call.repository';
import { RecordingService } from 'src/modules/recording/recording.service';
import * as fs from 'fs';
import * as path from 'path';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import { UserRepository } from 'src/common/repository/user/user.repository';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  maxHttpBufferSize: 1e8, // 100MB
  pingTimeout: 20000,
  pingInterval: 10000,
})
export class MessageGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly recordingService: RecordingService) {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  // Use single connection tracking
  public clients = new Map<string, string>(); // userId -> socketId
  private activeUsers = new Map<string, string>(); // username -> socketId

  // Call state management
  private activeCalls = new Map<
    string,
    {
      caller: string;
      receiver: string;
      startTime: Date;
      appointmentId: string;
      callTimeout?: NodeJS.Timeout;
    }
  >();

  // Call request timeouts (for unanswered calls)
  private callRequests = new Map<
    string,
    {
      timeout: NodeJS.Timeout;
      caller: string;
      receiver: string;
      appointmentId: string;
    }
  >();

  // Timeouts for disconnected users
  private disconnectTimeouts = new Map<string, NodeJS.Timeout>();

  // Recording state management
  private recordings = new Map<string, fs.WriteStream>();
  private uploadsDir = path.join(
    __dirname,
    '../../../../public/storage/recordings',
  );
  private chunks = new Map<string, Buffer>();

  onModuleInit() {}

  afterInit(server: Server) {
    console.log('Websocket server started');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.query.token;
      if (!token) {
        console.log('No token provided');
        client.disconnect();
        return;
      }

      const decoded: any = jwt.verify(token, appConfig().jwt.secret);
      const userId = decoded.sub;
      client.data.userId = userId;

      // // Disconnect existing connection if any
      // const existingSocketId = this.clients.get(userId);
      // if (existingSocketId) {
      //   const existingSocket =
      //     this.server.sockets.sockets.get(existingSocketId);
      //   if (existingSocket) {
      //     existingSocket.disconnect();
      //   }
      // }

      const user = await UserRepository.getUserDetails(userId);
      console.log(`User ${user.name} connected from message gateway`);

      this.clients.set(userId, client.id);
      await ChatRepository.updateUserStatus(userId, 'online');

      this.server.emit('userStatusChange', {
        user_id: userId,
        status: 'online',
      });
    } catch (error) {
      console.error('Error handling connection:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = [...this.clients.entries()].find(
      ([, socketId]) => socketId === client.id,
    )?.[0];

    if (userId) {
      this.clients.delete(userId);
      await ChatRepository.updateUserStatus(userId, 'offline');
      this.server.emit('userStatusChange', {
        user_id: userId,
        status: 'offline',
      });
    }
  }

  @SubscribeMessage('joinRoom')
  handleRoomJoin(client: Socket, body: any) {
    console.log(`[joinRoom] raw body=`, body, 'typeof=', typeof body);

    // If it's a string, try to parse it
    let payload: any;
    if (typeof body === 'string') {
      try {
        payload = JSON.parse(body);
      } catch {
        console.warn('⚠️ joinRoom: could not parse JSON string', body);
        return;
      }
    } else {
      payload = body;
    }

    const roomId = payload.room_id;
    if (!roomId) {
      console.warn('⚠️ joinRoom: missing room_id in payload', payload);
      return;
    }

    client.join(roomId);
    console.log(`  ↳ socket ${client.id} joined conversation room: ${roomId}`);
    client.emit('joinedRoom', { room_id: roomId });
  }

  @SubscribeMessage('joinConversations')
  handleJoinConversations(client: Socket) {
    const userId = [...this.clients.entries()].find(
      ([, sock]) => sock === client.id,
    )?.[0];

    console.log(`[joinConversations] socketId=${client.id} → userId=${userId}`);
    if (userId) {
      client.join(userId);
      console.log(`  ↳ joined personal room: ${userId}`);
    }
  }

  @SubscribeMessage('sendMessage')
  async listenForMessages(client: Socket, @MessageBody() body: any) {
    console.log('[sendMessage] raw body=', body, 'typeof=', typeof body);

    // If it's a string, try to parse it
    let payload: any;
    if (typeof body === 'string') {
      try {
        payload = JSON.parse(body);
      } catch {
        console.warn('⚠️ sendMessage: could not parse JSON string', body);
        return;
      }
    } else {
      payload = body;
    }

    const { conversationId, message, sender } = payload;
    if (!conversationId || !message || !sender?.id) {
      console.warn('⚠️ malformed sendMessage payload:', payload);
      return;
    }

    console.log(`↳ broadcasting to room ${conversationId}`, {
      message,
      sender,
    });
    this.server
      .to(conversationId)
      .emit('message', { conversationId, message, sender });
  }

  @SubscribeMessage('updateMessageStatus')
  async updateMessageStatus(client: Socket, @MessageBody() body: any) {
    console.log(
      '[updateMessageStatus] raw body=',
      body,
      'typeof=',
      typeof body,
    );

    // 1) If it's a string, parse it
    let payload: any;
    if (typeof body === 'string') {
      try {
        payload = JSON.parse(body);
      } catch {
        console.warn('⚠️ updateMessageStatus: could not parse JSON', body);
        return;
      }
    } else {
      payload = body;
    }

    // 2) Destructure the real values
    const { message_id, status } = payload;
    if (!message_id || !status) {
      console.warn('⚠️ malformed updateMessageStatus payload:', payload);
      return;
    }

    console.log('↳ updating message', message_id, 'to status', status);

    // 3) Call your repository
    await ChatRepository.updateMessageStatus(message_id, status);

    // 4) Broadcast the update
    this.server.emit('messageStatusUpdated', { message_id, status });
  }
  @SubscribeMessage('typing')
  handleTyping(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
    // Debug: inspect incoming socket and payload
    // console.log('[typing] client.data =', client.data);
    // console.log('[typing] raw body =', body, 'typeof =', typeof body);

    // 1) Parse the payload inline
    let payload: any;
    if (typeof body === 'object') {
      payload = body;
    } else {
      try {
        payload = JSON.parse(body);
      } catch {
        console.warn('⚠️ [typing] invalid JSON payload:', body);
        return; // stop if we can't parse
      }
    }

    // 2) Validate shape
    const { to, conversationId } = payload;
    if (typeof to !== 'string' || typeof conversationId !== 'string') {
      console.warn('⚠️ [typing] malformed payload:', payload);
      return;
    }

    // 3) Lookup recipient socket
    const recipientSocketId = this.clients.get(to);
    if (!recipientSocketId) {
      console.warn('⚠️ [typing] no socket for user:', to);
      return;
    }

    // 4) Get sender's userId safely
    const senderUserId = client.data?.userId as string | undefined;
    if (!senderUserId) {
      console.warn('⚠️ [typing] missing client.data.userId');
      return;
    }

    // 5) Emit the typing event
    const eventPayload = {
      from: senderUserId,
      conversationId,
      timestamp: new Date().toISOString(),
    };
    // console.log('↳ [typing] emitting to', recipientSocketId, eventPayload);
    this.server.to(recipientSocketId).emit('userTyping', eventPayload);
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: any,
  ) {
    // Debug: inspect incoming socket and payload
      // console.log('[stopTyping] client.data =', client.data);
      // console.log('[stopTyping] raw body =', body, 'typeof =', typeof body);

    // 1) Parse the payload inline
    let payload: any;
    if (typeof body === 'object') {
      payload = body;
    } else {
      try {
        payload = JSON.parse(body);
      } catch {
        console.warn('⚠️ [stopTyping] invalid JSON payload:', body);
        return; // stop if we can't parse
      }
    }

    // 2) Validate shape
    const { to, conversationId } = payload;
    if (typeof to !== 'string' || typeof conversationId !== 'string') {
      console.warn('⚠️ [stopTyping] malformed payload:', payload);
      return;
    }

    // 3) Lookup recipient socket
    const recipientSocketId = this.clients.get(to);
    if (!recipientSocketId) {
      console.warn('⚠️ [stopTyping] no socket for user:', to);
      return;
    }

    // 4) Get sender's userId safely
    const senderUserId = client.data?.userId as string | undefined;
    if (!senderUserId) {
      console.warn('⚠️ [stopTyping] missing client.data.userId');
      return;
    }

    // 5) Emit the stop-typing event
    const eventPayload = {
      from: senderUserId,
      conversationId,
      timestamp: new Date().toISOString(),
    };
    // console.log('↳ [stopTyping] emitting to', recipientSocketId, eventPayload);
    this.server.to(recipientSocketId).emit('userStoppedTyping', eventPayload);
  }

  // for calling
  @SubscribeMessage('join')
  async handleJoin(
    client: Socket,
    { appointmentId }: { appointmentId: string },
  ) {
    try {
      const userId = [...this.clients.entries()].find(
        ([, socketId]) => socketId === client.id,
      )?.[0];

      if (!userId) {
        client.emit('joinError', {
          message: 'Authentication required. Please login again.',
        });
        return;
      }

      const validation = (await AppointmentRepository.validateCallAccess(
        appointmentId,
        userId,
      )) as AppointmentValidation;

      if (!validation.success) {
        client.emit('joinError', {
          message: validation.message,
          ...(validation.startTime && { startTime: validation.startTime }),
        });
        return;
      }

      console.log(
        `User ${userId} joined call system with appointment ${appointmentId}`,
      );

      // Join the appointment room for call notifications
      client.join(`appointment-${appointmentId}`);

      client.emit('joinedCall', {
        success: true,
        message: 'Successfully joined call system',
        ...(validation.appointment && { appointment: validation.appointment }),
      });
    } catch (error) {
      console.error('Error in handleJoin:', error);
      client.emit('joinError', {
        message: 'Failed to join call system. Please try again.',
      });
    }
  }

  @SubscribeMessage('call')
  async handleCall(
    client: Socket,
    {
      appointmentId,
      receiver,
      offer,
    }: { appointmentId: string; receiver: string; offer: any },
  ) {
    try {
      // Get caller ID from the socket-to-user mapping
      const callerId = [...this.clients.entries()].find(
        ([, socketId]) => socketId === client.id,
      )?.[0];

      // Enhanced logging for call attempt
      console.log(`Call attempt from socket ${client.id}`);
      console.log(`Caller ID resolved to: ${callerId || 'not found'}`);
      console.log(`Attempting to call receiver: ${receiver}`);

      if (!callerId) {
        client.emit('callError', {
          message: 'Authentication required. Please login again.',
        });
        return;
      }

      // Check if caller is already in a call
      const existingCallerCall = [...this.activeCalls.entries()].find(
        ([, call]) => call.caller === callerId || call.receiver === callerId,
      );

      if (existingCallerCall) {
        client.emit('callError', {
          message: 'You are already in another call. Please end it first.',
        });
        return;
      }

      // Check if receiver is already in a call
      const existingReceiverCall = [...this.activeCalls.entries()].find(
        ([, call]) => call.caller === receiver || call.receiver === receiver,
      );

      if (existingReceiverCall) {
        client.emit('callError', {
          message: 'Recipient is already in another call.',
        });
        return;
      }

      // Get the appointment to determine roles
      const appointment =
        await AppointmentRepository.getAppointmentWithUsers(appointmentId);

      if (!appointment) {
        client.emit('callError', {
          message: 'Appointment not found.',
        });
        return;
      }

      const isDoctorCalling = appointment.service.user_id === callerId;
      const isPatientCalling = appointment.user_id === callerId;

      // Get sender's name based on role
      let senderName = '';
      const coach_avatar = appointment.service.user.avatar;
      const user_avatar = appointment.user.avatar;

      const coach_imgUrl = coach_avatar
        ? SojebStorage.url(`${appConfig().storageUrl.avatar}${coach_avatar}`)
        : null;
      const user_imgUrl = user_avatar
        ? SojebStorage.url(`${appConfig().storageUrl.avatar}${user_avatar}`)
        : null;

      if (isDoctorCalling) {
        // If doctor is calling, get doctor's name
        senderName =
          appointment.service.user.name ||
          `${appointment.service.user.first_name} ${appointment.service.user.last_name}`.trim() ||
          'Doctor';
      } else if (isPatientCalling) {
        // If patient is calling, get patient's name
        senderName =
          appointment.user.name ||
          `${appointment.user.first_name} ${appointment.user.last_name}`.trim() ||
          'Patient';
      }

      // Validate call access based on role
      let validation;
      let missedCallId;

      if (isDoctorCalling) {
        // Doctor is calling patient
        validation = await AppointmentRepository.validateDoctorCallAccess(
          appointmentId,
          callerId,
        );
      } else if (isPatientCalling) {
        // Patient is calling doctor
        validation = await AppointmentRepository.validatePatientCallbackAccess(
          appointmentId,
          callerId,
        );

        if (validation.success) {
          missedCallId = validation.missedCallId;
        }
      } else {
        // Neither doctor nor patient
        client.emit('callError', {
          message: 'You are not authorized for this appointment.',
        });
        return;
      }

      if (!validation.success) {
        client.emit('callError', {
          message: validation.message,
          startTime: validation.startTime,
        });
        return;
      }

      const receiverSocketId = this.clients.get(receiver);
      if (receiverSocketId) {
        // Generate a unique call ID
        const callId = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Set a timeout for call request (30 seconds)
        const timeout = setTimeout(() => {
          // If call wasn't answered within 30 seconds
          this.callRequests.delete(callId);

          // Notify the caller that the call was not answered
          client.emit('callNotAnswered', {
            callId,
            receiver,
            message: 'Call not answered. Recipient may be unavailable.',
          });

          // If doctor was calling, create a missed call record
          if (isDoctorCalling) {
            // Create missed call record
            MissedCallRepository.createMissedCall(
              appointmentId,
              callerId, // doctor_id
              receiver, // patient_id
            )
              .then(() => {
                console.log(
                  `Created missed call record for appointment ${appointmentId}`,
                );
              })
              .catch((error) => {
                console.error('Error creating missed call record:', error);
              });
          }

          // Notify receiver that call was missed
          const receiverSocketId = this.clients.get(receiver);
          if (receiverSocketId) {
            this.server.to(receiverSocketId).emit('missedCall', {
              caller: callerId,
              appointmentId,
              isDoctorCall: isDoctorCalling,
              message: `You missed a call from your ${isDoctorCalling ? 'doctor' : 'patient'}`,
            });

            // Also notify the receiver to stop ringing if they're still showing the call UI
            this.server.to(receiverSocketId).emit('callCancelled', {
              callId,
              reason: 'Call timed out and was marked as missed',
            });

            // This only goes to the sender
            client.emit('callCancelled', {
              callId,
              reason: 'Call timed out and was marked as missed',
            });
          }
        }, 30000); // 30 seconds timeout

        // Store the call request
        this.callRequests.set(callId, {
          timeout,
          caller: callerId,
          receiver,
          appointmentId,
        });

        // If patient is calling back, mark the missed call as used
        if (isPatientCalling && missedCallId) {
          await MissedCallRepository.markCallbackUsed(missedCallId);
        }

        // Send call request to receiver
        console.log(`Sending incomingCall event to socket ${receiverSocketId}`);
        this.server.to(receiverSocketId).emit('incomingCall', {
          callId,
          caller: callerId,
          callerName: senderName,
          callerAvatar: isDoctorCalling ? coach_imgUrl : user_imgUrl,
          appointmentId,
          offer,
          isDoctorCall: isDoctorCalling,
        });

        // Notify caller that call is ringing
        client.emit('callRinging', {
          callId,
          receiver,
        });
      } else {
        console.log(`Receiver ${receiver} is not online. No socket ID found.`);
        client.emit('callError', {
          message: 'Recipient is not online or not available.',
        });
      }
    } catch (error) {
      console.error('Error in handleCall:', error);
      client.emit('callError', {
        message: 'Failed to initiate call. Please try again.',
      });
    }
  }

  // Add a new method to handle call rejection
  @SubscribeMessage('rejectCall')
  handleRejectCall(
    client: Socket,
    { callId, reason = 'Call rejected' }: { callId: string; reason?: string },
  ) {
    try {
      console.log('client id: ', client.id);
      // Get receiver ID from the client's socket data
      const receiverId = [...this.clients.entries()].find(
        ([, socketId]) => socketId === client.id,
      )?.[0];

      console.log('receiver id: ', receiverId);

      if (!receiverId) {
        return;
      }

      // Find the call request
      const callRequest = this.callRequests.get(callId);
      if (!callRequest) {
        return;
      }

      // Clear the timeout
      clearTimeout(callRequest.timeout);
      this.callRequests.delete(callId);

      // Notify the caller that the call was rejected
      const callerSocketId = this.clients.get(callRequest.caller);
      console.log('callerSocketId: ', callerSocketId);
      if (callerSocketId) {
        this.server.to(callerSocketId).emit('callRejected', {
          receiver: receiverId,
          reason,
        });
      }
    } catch (error) {
      console.error('Error in handleRejectCall:', error);
    }
  }

  // Update the answer method to handle call acceptance and recording
  @SubscribeMessage('answer')
  async handleAnswer(
    client: Socket,
    {
      callId,
      caller,
      appointmentId,
      answer,
    }: { callId: string; caller: string; appointmentId: string; answer: any },
  ) {
    try {
      console.log('appointmentId from gateway: ', appointmentId);
      const receiverId = [...this.clients.entries()].find(
        ([, socketId]) => socketId === client.id,
      )?.[0];

      if (!receiverId) {
        client.emit('answerError', {
          message: 'Authentication required. Please login again.',
        });
        return;
      }

      const callRequest = this.callRequests.get(callId);
      if (callRequest) {
        clearTimeout(callRequest.timeout);
        this.callRequests.delete(callId);
      }

      const validation = (await AppointmentRepository.validateCallAccess(
        appointmentId,
        receiverId,
      )) as AppointmentValidation;

      if (!validation.success) {
        client.emit('answerError', {
          message: validation.message,
        });
        return;
      }

      const callerSocketId = this.clients.get(caller);
      if (callerSocketId) {
        // Start recording when call is accepted
        try {
          await this.recordingService.startRecording(appointmentId, callId);
          console.log(`Started recording for call ${callId}`);
        } catch (error) {
          console.error('Failed to start recording:', error);
        }

        this.activeCalls.set(callId, {
          caller,
          receiver: receiverId,
          startTime: new Date(),
          appointmentId,
        });

        // Now TypeScript knows validation.appointment exists and is safe to use
        const durationInMinutes = validation.appointment?.service?.duration
          ? parseInt(validation.appointment.service.duration)
          : 60;

        const callTimeout = setTimeout(
          () => {
            this.handleCallTimeout(callId);
          },
          (durationInMinutes + 5) * 60 * 1000,
        );

        this.activeCalls.set(callId, {
          ...this.activeCalls.get(callId),
          callTimeout,
        });

        this.server.to(callerSocketId).emit('callAccepted', {
          callId,
          answer,
          receiver: receiverId,
          appointmentId,
        });

        console.log(
          `Call started between ${caller} and ${receiverId} for appointment ${appointmentId}`,
        );
      } else {
        client.emit('answerError', {
          message: 'Caller is no longer available.',
        });
      }
    } catch (error) {
      console.error('Error in handleAnswer:', error);
      client.emit('answerError', {
        message: 'Failed to answer call. Please try again.',
      });
    }
  }

  // Add method to handle call end and stop recording
  @SubscribeMessage('endCall')
  async handleCallEnded(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    {
      callId,
      receiver,
      appointmentId,
    }: { callId: string; receiver: string; appointmentId: string },
  ) {
    try {
      console.log('Received endCall event for callId:', callId);
      console.log('Line 753 ', callId, receiver, appointmentId);

      // 1. First check active calls
      let call = this.activeCalls.get(callId);
      console.log('activeCalls: ', call);

      // 2. If not in active calls, check call requests
      if (!call) {
        // Try to find in callRequests
        const callRequest = this.callRequests.get(callId);
        if (callRequest) {
          console.log('Found call in callRequests:', callRequest);

          // Clear the timeout
          clearTimeout(callRequest.timeout);
          this.callRequests.delete(callId);

          // Notify the caller that the call was ended
          const callerSocketId = this.clients.get(callRequest.caller);
          if (callerSocketId) {
            this.server.to(callerSocketId).emit('callEnded', {
              callId,
              appointmentId,
              reason: 'Call ended before answer',
            });
          }

          // If receiver is online, notify them too
          const receiverSocketId = this.clients.get(callRequest.receiver);
          if (receiverSocketId) {
            this.server.to(receiverSocketId).emit('callEnded', {
              callId,
              appointmentId,
              reason: 'Call ended before answer',
            });
          }

          return;
        }

        // 3. If not found by callId, try to find by appointmentId in callRequests
        const foundRequest = Array.from(this.callRequests.entries()).find(
          ([, c]) => c.appointmentId === appointmentId,
        );

        if (foundRequest) {
          const [foundCallId, foundCall] = foundRequest;
          console.log('Found call request by appointmentId:', foundCallId);

          // Clear the timeout
          clearTimeout(foundCall.timeout);
          this.callRequests.delete(foundCallId);

          // Notify both parties
          [foundCall.caller, foundCall.receiver].forEach((userId) => {
            const sockId = this.clients.get(userId);
            if (sockId) {
              this.server.to(sockId).emit('callEnded', {
                callId: foundCallId,
                appointmentId,
                reason: 'Call ended before answer',
              });
            }
          });
          return;
        }
      }

      // 4. If found in activeCalls, handle normal call ending
      if (call) {
        this.activeCalls.delete(callId);

        const payload = {
          callId,
          appointmentId,
          reason: 'Call ended by participant',
        };

        [call.caller, call.receiver].forEach((userId) => {
          const sockId = this.clients.get(userId);
          if (sockId) this.server.to(sockId).emit('callEnded', payload);
        });

        this.cleanupCallResources(callId);
      } else {
        console.log('No active call or call request found for callId:', callId);
      }
    } catch (error) {
      console.error('Error in handleCallEnded:', error);
    }
  }

  private cleanupCallResources(callId: string) {
    // Clean up recording buffers
    this.chunks.delete(callId);

    // Clean up any active streams
    const stream = this.recordings.get(callId);
    if (stream) {
      stream.end();
      this.recordings.delete(callId);
    }
  }

  private async handleCallTimeout(callId: string) {
    try {
      const call = this.activeCalls.get(callId);
      if (!call) return;

      // Get recording buffer
      const buffer = this.chunks.get(callId);
      if (buffer) {
        const filePath = path.join(this.uploadsDir, `${callId}.webm`);
        const stream = fs.createWriteStream(filePath, { flags: 'a' });
        stream.write(buffer);
        this.chunks.delete(callId);
        console.log(`Saved recording for timed out call ${callId}`);
      }

      // Clean up call
      this.activeCalls.delete(callId);

      // Notify participants
      const callerSocketId = this.clients.get(call.caller);
      const receiverSocketId = this.clients.get(call.receiver);

      if (callerSocketId) {
        this.server.to(callerSocketId).emit('callTimeout', { callId });
      }
      if (receiverSocketId) {
        this.server.to(receiverSocketId).emit('callTimeout', { callId });
      }

      // Create missed call record
      await MissedCallRepository.createMissedCall(
        call.appointmentId,
        call.caller, // doctor_id
        call.receiver, // patient_id
      );
    } catch (error) {
      console.error('Error in handleCallTimeout:', error);
    }
  }

  @SubscribeMessage('reconnectCall')
  async handleReconnectCall(
    client: Socket,
    { callId, appointmentId }: { callId: string; appointmentId: string },
  ) {
    try {
      // Get user ID from the client's socket data
      const userId = [...this.clients.entries()].find(
        ([, socketId]) => socketId === client.id,
      )?.[0];

      if (!userId) {
        client.emit('reconnectError', {
          message: 'Authentication required. Please login again.',
        });
        return;
      }

      // Check if the call exists
      const activeCall = this.activeCalls.get(callId);
      if (!activeCall) {
        client.emit('reconnectError', {
          message: 'Call no longer exists or has ended.',
        });
        return;
      }

      // Check if user is part of the call
      if (activeCall.caller !== userId && activeCall.receiver !== userId) {
        client.emit('reconnectError', {
          message: 'You are not part of this call.',
        });
        return;
      }

      // Determine if user is caller or receiver
      const isCallerReconnecting = activeCall.caller === userId;
      const otherPartyId = isCallerReconnecting
        ? activeCall.receiver
        : activeCall.caller;
      const otherPartySocketId = this.clients.get(otherPartyId);

      // Notify the other party about reconnection
      if (otherPartySocketId) {
        this.server.to(otherPartySocketId).emit('peerReconnecting', {
          callId,
          userId,
        });
      }

      // Send reconnection success to the client
      client.emit('reconnectSuccess', {
        callId,
        appointmentId,
        otherPartyId,
        role: isCallerReconnecting ? 'caller' : 'receiver',
      });
    } catch (error) {
      console.error('Error in handleReconnectCall:', error);
      client.emit('reconnectError', {
        message: 'Failed to reconnect to call. Please try again.',
      });
    }
  }

  @SubscribeMessage('iceCandidate')
  handleIceCandidate(
    client: Socket,
    { callId, candidate, to }: { callId: string; candidate: any; to: string },
  ) {
    try {
      // Get sender ID from the socket-to-user mapping
      const senderId = [...this.clients.entries()].find(
        ([, socketId]) => socketId === client.id,
      )?.[0];

      if (!senderId) {
        console.log(
          `Could not find user ID for socket ${client.id} when handling ICE candidate`,
        );
        return;
      }

      // Forward the ICE candidate to the other peer
      const receiverSocketId = this.clients.get(to);
      if (receiverSocketId) {
        // console.log(
        //   `Forwarding ICE candidate from ${senderId} to ${to} (socket: ${receiverSocketId})`,
        // );
        this.server.to(receiverSocketId).emit('iceCandidate', {
          callId,
          candidate,
          from: senderId,
        });
      } else {
        console.log(
          `Could not forward ICE candidate: receiver ${to} not found`,
        );
      }
    } catch (error) {
      console.error('Error in handleIceCandidate:', error);
    }
  }

  @SubscribeMessage('recordingChunk')
  handleRecordingChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      recordingId: string;
      sequence: number;
      chunk: any;
      appointmentId: string;
    },
  ) {
    try {
      console.log('Received chunk', payload.sequence, payload.chunk.length);

      // 2.1 append to buffer
      if (!this.chunks.has(payload.recordingId)) {
        this.chunks.set(payload.recordingId, Buffer.alloc(0));
      }
      const existing = this.chunks.get(payload.recordingId)!;
      const data = Buffer.from(new Uint8Array(payload.chunk));
      this.chunks.set(payload.recordingId, Buffer.concat([existing, data]));

      // 2.2 acknowledge
      client.emit('chunkReceived', { sequence: payload.sequence });
    } catch (error) {
      console.error('Error handling recording chunk:', error);
      client?.emit('chunkError', { sequence: payload.sequence });
    }
  }

  // 3. FINALIZE RECORDING: writes file & updates DB
  @SubscribeMessage('recordingEnded')
  async handleRecordingEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { recordingId: string; appointmentId: string },
  ) {
    const { recordingId, appointmentId } = payload;

    // 3.1 compute (or reuse) timestamp + filename
    const filePath = this.getRecordingPath(appointmentId, recordingId, true);

    // 3.2 write buffer to disk
    const buffer = this.chunks.get(recordingId) || Buffer.alloc(0);
    fs.writeFileSync(filePath, buffer);
    this.chunks.delete(recordingId);
    console.log(`Started writing to file ${filePath}`);

    // 3.3 update DB now that file exists
    const filenameOnly = path.basename(filePath);
    await this.recordingService.stopRecording(appointmentId, filenameOnly);
  }

  private getRecordingPath(
    appointmentId: string,
    recordingId: string,
    fullPath: boolean = true,
  ): string {
    // Create appointment-specific directory
    const appointmentDir = path.join(this.uploadsDir, appointmentId);
    if (!fs.existsSync(appointmentDir)) {
      fs.mkdirSync(appointmentDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${appointmentId}_${timestamp}.webm`;

    // Return based on flag
    return fullPath ? path.join(appointmentDir, filename) : filename;
  }
}
// Add these interfaces at the top of the file after imports
interface AppointmentValidation {
  success: boolean;
  message: string;
  startTime?: Date;
  appointment?: {
    service?: {
      duration?: string;
      user_id?: string;
    };
    user_id?: string;
  };
}

// Type guard function
function isSuccessValidation(
  validation: AppointmentValidation,
): validation is AppointmentValidation & { success: true } {
  return validation.success === true;
}
