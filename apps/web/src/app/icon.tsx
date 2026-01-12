import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '64px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0A0A0E',
        color: '#7CFFB2',
        fontSize: 28,
        fontWeight: 700,
        fontFamily: 'Space Grotesk',
        borderRadius: '14px',
        border: '1px solid rgba(124,255,178,0.6)',
      }}
    >
      RS
    </div>,
    {
      width: 64,
      height: 64,
    },
  );
}
