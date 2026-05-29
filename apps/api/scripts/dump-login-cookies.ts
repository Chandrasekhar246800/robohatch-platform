import 'dotenv/config';

async function main() {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'e2e.admin@robohatch.local',
      password: 'E2E_admin_pass_2026!',
    }),
  });

  const body = await response.json().catch(() => null);
  const rawCookies = typeof (response.headers as any).getSetCookie === 'function'
    ? (response.headers as any).getSetCookie()
    : response.headers.get('set-cookie');

  console.log(JSON.stringify({
    status: response.status,
    body,
    cookies: rawCookies,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});