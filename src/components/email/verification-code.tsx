import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface VerificationCodeEmailProps {
  code: string;
  siteName?: string;
  /** 验证码有效分钟数，仅用于文案展示 */
  expiresMinutes?: number;
}

export default function VerificationCodeEmail({
  code = '000000',
  siteName = '我的个人网站',
  expiresMinutes = 10,
}: VerificationCodeEmailProps) {
  return (
    <Html lang="zh-CN">
      <Head />
      {/* 收件箱列表里的预览文字，避免客户端自动抓正文 */}
      <Preview>你的 {siteName} 邮箱验证码是 {code}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>邮箱验证码</Heading>

          <Text style={intro}>
            你正在 {siteName} 注册或登录账号，请在页面中输入下方验证码完成验证：
          </Text>

          <Section style={codeBox}>
            <Text style={codeText}>{code}</Text>
          </Section>

          <Text style={tip}>
            验证码 {expiresMinutes} 分钟内有效，请勿泄露给他人。如非本人操作，请忽略本邮件。
          </Text>

          <Hr style={hr} />

          <Text style={footer}>这是 {siteName} 发送的自动邮件，请勿回复。</Text>
        </Container>
      </Body>
    </Html>
  );
}

// 样式用内联对象写，react-email 渲染时会自动做邮件客户端兼容处理
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
  marginBottom: '16px',
};

const intro = {
  fontSize: '14px',
  color: '#555555',
  lineHeight: '22px',
  marginBottom: '20px',
};

const codeBox = {
  backgroundColor: '#f5f5f5',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '20px',
  textAlign: 'center' as const,
};

const codeText = {
  fontSize: '32px',
  fontWeight: 700,
  letterSpacing: '8px',
  color: '#111111',
  margin: 0,
};

const tip = {
  fontSize: '13px',
  color: '#888888',
  lineHeight: '20px',
};

const hr = {
  borderColor: '#eeeeee',
  margin: '32px 0 16px',
};

const footer = {
  fontSize: '12px',
  color: '#999999',
};