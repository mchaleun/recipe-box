// Tells the app it's running online, and whether a family passcode is set.
export function GET() {
  return new Response(JSON.stringify({ ok: true, online: true, scan: true, import: true, auth: !!process.env.FAMILY_PASSCODE }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
