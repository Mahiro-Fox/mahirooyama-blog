type Guestbook = {
  id: string;
  createdAt: string;
  nickname: string;
  bgColor: string;
  contact?: string;
  content: string;
  replyContent?: string;
  replyAt?: string;
  isApproved: boolean;
  isRepliedEmail?: boolean;
  isEmailNotificationEnabled?: boolean;
};
