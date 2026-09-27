import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeViewProps {
  value: string;
  size?: number;
  className?: string;
}

export const QrCodeView: React.FC<QrCodeViewProps> = ({ value, size = 180, className = '' }) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(setDataUrl)
      .catch((err) => console.error('Error rendering QR code:', err));
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-800 text-slate-400 rounded-xl animate-pulse ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs">Gerando QR...</span>
      </div>
    );
  }

  return (
    <div className={`p-2 bg-white rounded-xl shadow-lg inline-block ${className}`}>
      <img src={dataUrl} alt="QR Code" className="rounded" style={{ width: size, height: size }} />
    </div>
  );
};
