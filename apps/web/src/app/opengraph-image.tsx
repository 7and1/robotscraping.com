import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px',
        backgroundColor: '#0A0A0E',
        backgroundImage:
          'radial-gradient(circle at 20% 20%, rgba(124,255,178,0.25), transparent 40%), radial-gradient(circle at 80% 20%, rgba(255,79,154,0.2), transparent 35%)',
        color: '#FFFFFF',
        fontFamily: 'Space Grotesk',
      }}
    >
      <div style={{ fontSize: 56, fontWeight: 600 }}>RobotScraping.com</div>
      <div style={{ fontSize: 28, marginTop: 20, color: '#7CFFB2' }}>
        Turn any website into a JSON API
      </div>
      <div style={{ fontSize: 20, marginTop: 24, color: '#E6FDF1' }}>
        Cloudflare Browser Rendering · AI Extraction · D1 + R2 Logs
      </div>
    </div>,
    {
      ...size,
    },
  );
}
