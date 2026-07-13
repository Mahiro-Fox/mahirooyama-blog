import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface ReplyNotificationEmailProps {
  originalMessage: string;
  replyContent: string;
  messageUrl: string;
  siteName?: string;
}

export default function ReplyNotificationEmail({
  originalMessage = '这是访客留下的示例留言内容',
  replyContent = '这是站长的示例回复内容',
  messageUrl = 'https://yoursite.com/guestbook',
  siteName = '我的个人网站',
}: ReplyNotificationEmailProps) {
  return (
    <Html lang="zh-CN">
      <Head />
      {/* Preview 是收件箱列表里那行灰色预览文字，不写的话邮件客户端会
          自动抓正文前几个字，容易显示得很奇怪，建议手动指定 */}
      <Preview>你在 {siteName} 的留言收到了新回复</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>你的留言收到了新回复</Heading>

          <Text style={label}>你的留言：</Text>
          <Section style={quoteBox}>
            <Text style={quoteText}>{originalMessage}</Text>
          </Section>

          <Text style={label}>回复内容：</Text>
          <Section style={replyBox}>
            <Text style={replyText}>{replyContent}</Text>
          </Section>

          <Button style={button} href={messageUrl}>
            查看完整对话
          </Button>

          <Hr style={hr} />

          <Text style={footer}>
            这是 {siteName} 发送的自动通知邮件，如非本人操作请忽略。
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// 所有样式用内联对象写，react-email 在渲染时会自动做兼容性处理
// （比如转成邮件客户端更兼容的写法），不需要你自己操心
const main = {
  backgroundColor: '#f6f6f6',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  padding: '24px 0',
};

const container = {
  backgroundColor: '#ffffff',
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px',
  borderRadius: '8px',
};

const heading = {
  fontSize: '20px',
  color: '#111111',
  marginBottom: '24px',
};

const label = {
  fontSize: '13px',
  color: '#888888',
  marginBottom: '4px',
};

const quoteBox = {
  backgroundColor: '#f5f5f5',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '20px',
};

const quoteText = {
  fontSize: '14px',
  color: '#555555',
  margin: 0,
};

const replyBox = {
  borderLeft: '3px solid #0070f3',
  paddingLeft: '16px',
  marginBottom: '24px',
};

const replyText = {
  fontSize: '15px',
  color: '#333333',
  margin: 0,
};

const button = {
  backgroundColor: '#0070f3',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  textDecoration: 'none',
  padding: '10px 20px',
  display: 'inline-block',
};

const hr = {
  borderColor: '#eeeeee',
  margin: '32px 0 16px',
};

const footer = {
  fontSize: '12px',
  color: '#999999',
};
