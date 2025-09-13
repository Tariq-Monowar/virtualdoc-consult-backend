export class CreateNotificationDto {
  receiver_id: string;
  sender_id?: string;
  entity_id?: string; // appointment ID, optional
  notification_event_text: string; // JSON string for review card
}
