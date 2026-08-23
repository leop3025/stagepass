const { PrismaClient } = require('@prisma/client');

(async () => {
  const email = 'demo17@stagepass.test';
  const regRes = await fetch('http://localhost:3016/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Demo Customer 17',
      email,
      password: 'Demo123!'
    })
  });

  const regText = await regRes.text();
  console.log('REGISTER_STATUS', regRes.status);
  console.log(regText);

  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({ where: { email } });
  console.log('DB_USER', JSON.stringify(user, null, 2));

  const cookie = (regRes.headers.get('set-cookie') || '').split(';')[0];
  const me1 = await fetch('http://localhost:3016/api/auth/me', {
    headers: { Cookie: cookie }
  });
  console.log('ME1_STATUS', me1.status);
  console.log(await me1.text());

  const loginRes = await fetch('http://localhost:3016/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie
    },
    body: JSON.stringify({ email, password: 'Demo123!' })
  });

  const loginText = await loginRes.text();
  console.log('LOGIN_STATUS', loginRes.status);
  console.log(loginText);

  const loginCookie = (loginRes.headers.get('set-cookie') || cookie).split(';')[0];
  const me2 = await fetch('http://localhost:3016/api/auth/me', {
    headers: { Cookie: loginCookie }
  });
  console.log('ME2_STATUS', me2.status);
  console.log(await me2.text());

  await prisma.$disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
