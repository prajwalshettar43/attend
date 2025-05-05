import React, { useState, useEffect, useRef, useMemo } from "react";
import { CSVLink } from "react-csv";
import { QrReader } from "react-qr-reader";

// Floating Bubble Component
const FloatingBubble = ({ size, speed, delay, opacity, left, top }) => (
  <div
    className="absolute rounded-full bg-violet-400"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      opacity: opacity,
      animation: `floatUp ${speed}s infinite ease-in-out ${delay}s`,
      filter: "blur(1px)",
      left: `${left}%`,
      top: `${top}%`,
    }}
  />
);

const QRScanner = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState("");
  const [debugMessage, setDebugMessage] = useState("Initializing scanner...");
  const [isMobile, setIsMobile] = useState(false);
  const [filename, setFilename] = useState("Attendance");
  const [description, setDescription] = useState("");
  const membersIdsRef = useRef(new Set());

  // camera devices and selection
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  const bubbles = useMemo(() =>
    Array.from({ length: 25 }, (_, i) => {
      const size = Math.floor(Math.random() * 30) + 20;
      const speed = Math.floor(Math.random() * 4) + 3;
      const delay = Math.random() * 2;
      const opacity = Math.random() * 0.2 + 0.1;
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      return (
        <FloatingBubble
          key={i}
          size={size}
          speed={speed}
          delay={delay}
          opacity={opacity}
          left={left}
          top={top}
        />
      );
    }),
  []);

  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      @keyframes floatUp {
        0% { transform: translateY(0); opacity: 0.2; }
        50% { transform: translateY(-20px); opacity: 0.3; }
        100% { transform: translateY(-60px); opacity: 0; }
      }
      @keyframes scan {
        0% { height: 0; top: 0; opacity: 0.7; }
        50% { opacity: 0.5; }
        100% { height: 0; top: 100%; opacity: 0.7; }
      }
    `;
    document.head.appendChild(styleSheet);

    const checkMobile = () => {
      const ua = navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod|android|blackberry|windows phone/.test(ua);
    };
    setIsMobile(checkMobile());
  }, []);

  // enumerate devices
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(videoInputs);
      // auto-select back camera if available
      const back = videoInputs.find(d => /back|rear/.test(d.label.toLowerCase()));
      setSelectedDeviceId(back ? back.deviceId : videoInputs[0]?.deviceId);
    });
  }, []);

  // constraints
  const constraints = useMemo(() => ({
    video: selectedDeviceId
      ? { deviceId: { exact: selectedDeviceId } }
      : { facingMode: 'environment' }
  }), [selectedDeviceId]);

  const handleScan = ({ text }) => {
    if (!text) return;
    setDebugMessage(`Scanned data detected: ${text}`);
    const parsed = parseVCARD(text);
    if (parsed?.membershipId && !membersIdsRef.current.has(parsed.membershipId)) {
      setData(prev => [...prev, { ...parsed, year: '1' }]);
      membersIdsRef.current.add(parsed.membershipId);
      setError('');
    }
  };

  const handleError = (err) => {
    console.error(err);
    setError(err.message);
  };

  const parseVCARD = (scanned) => {
    try {
      if (scanned.includes('BEGIN:VCARD')) {
        const nm = scanned.match(/NICKNAME:([^ ]+)/)?.[1];
        const id = scanned.match(/Member#:\s*(\d+)/)?.[1];
        if (nm && id) return { name: nm.trim(), membershipId: id.trim() };
      }
    } catch {}
    return null;
  };

  const headers = [
    { label: 'Name', key: 'name' },
    { label: 'Membership ID', key: 'membershipId' },
    { label: 'Year', key: 'year' },
  ];

  return (
    <div className="min-h-screen p-4 relative" style={{ background: 'radial-gradient(100% 100% at 50% 0%, #34045B 0%, #0A0011 80%)' }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">{bubbles}</div>
      <div className="max-w-3xl mx-auto bg-black/30 backdrop-blur-sm rounded-xl p-6 z-10 relative border border-violet-500/30">
        <h1 className="text-4xl text-violet-300 text-center mb-6">QR Attendance Scanner</h1>
        <div className="mb-4 flex flex-col md:flex-row gap-4">
          <input
            className="w-full px-4 py-2 bg-black bg-opacity-30 border border-violet-600 text-white rounded"
            value={filename} onChange={e => setFilename(e.target.value)} placeholder="Filename" />
          <textarea
            className="w-full px-4 py-2 bg-black bg-opacity-30 border border-violet-600 text-white rounded"
            rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" />
        </div>
        {videoDevices.length > 1 && (
          <div className="mb-4 text-center">
            <select
              className="px-3 py-2 bg-black bg-opacity-30 border border-violet-600 text-white rounded"
              value={selectedDeviceId || ''}
              onChange={e => setSelectedDeviceId(e.target.value)}>
              {videoDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>
              ))}
            </select>
          </div>
        )}
        <div className="w-full max-w-md mx-auto aspect-video border-4 border-violet-500 rounded overflow-hidden relative">
          <QrReader
            constraints={constraints}
            onResult={(res, err) => res ? handleScan(res) : err && handleError(err)}
            videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        {error && <div className="mt-4 p-2 bg-red-900 text-red-400 rounded text-center">{error}</div>}
        <div className="mt-4 bg-black bg-opacity-30 p-4 rounded">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl text-violet-300">Scanned Entries</h2>
            <span className="text-violet-300">Total: {data.length}</span>
          </div>
          {data.length ? (
            <table className="w-full text-white">
              <thead className="bg-violet-700"><tr><th>Name</th><th>ID</th><th>Year</th></tr></thead>
              <tbody>{data.map((e,i)=>(
                <tr key={i} className="bg-violet-800/30"><td>{e.name}</td><td>{e.membershipId}</td><td>{e.year}</td></tr>
              ))}</tbody>
            </table>
          ) : <p className="text-violet-300 text-center">No entries scanned.</p>}
        </div>
        <div className="mt-4 text-center">
          {data.length>0 && <CSVLink data={data} headers={headers} filename={`${filename}.csv`} className="px-4 py-2 bg-violet-600 text-white rounded">Download CSV</CSVLink>}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
