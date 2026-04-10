import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.log('用法: npx tsx scripts/hash-password.ts <your-password>');
  process.exit(1);
}

async function hashPassword() {
  const hashed = await bcrypt.hash(password, 12);
  console.log('\n原始密码:', password);
  console.log('哈希密码:', hashed);
  console.log(
    '\n请将哈希密码添加到 .env.local 文件中的 ADMIN_PASSWORD_HASH 变量\n'
  );
}

hashPassword();
