// Development wordmark icon; replace with approved BLIES brand assets before launch.
export function GET() {
  return new Response(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#0d2946"/><text x="32" y="47" text-anchor="middle" font-family="Arial,sans-serif" font-size="44" font-weight="bold" fill="white">B</text></svg>',
    {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
