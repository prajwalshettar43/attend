import React, { useState, useEffect, useRef, useMemo } from "react";
import { CSVLink } from "react-csv";
import { QrReader } from "react-qr-reader";

// Floating Bubble Component
const FloatingBubble = ({ size, speed, delay, opacity, left, top }) => {
  return (
    <div
      className="absolute rounded-full bg-violet-400"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        opacity: opacity,
        animation: `floatUp ${speed}s infinite ease-in-out ${delay}s`,
        filter: "blur(1px)",
        left: `${left}%`,
        top: `${top}%`
      }}
    />
  );
};

const QRScanner = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState("");
  const [debugMessage, setDebugMessage] = useState("Initializing scanner...");
  const [isMobile, setIsMobile] = useState(false);
  const membersIdsRef = useRef(new Set());
  const [videoDevices, setVideoDevices] = useState([]);
  const [filename, setFilename] = useState("Attendance");
  const [description, setDescription] = useState("");
  const [scanAnimation, setScanAnimation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const bubbles = useMemo(() => {
    const bubblesArray = [];
    for (let i = 0; i < 25; i++) {
      const size = Math.floor(Math.random() * 30) + 20;
      const speed = Math.floor(Math.random() * 4) + 3;
      const delay = Math.random() * 2;
      const opacity = Math.random() * 0.2 + 0.1;
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      bubblesArray.push(
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
    }
    return bubblesArray;
  }, []);

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
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(styleSheet);

    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod|android|blackberry|windows phone/g.test(userAgent);
    };
    setIsMobile(checkMobile());
  }, []);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const videoInputDevices = devices.filter(device => device.kind === "videoinput");
      setVideoDevices(videoInputDevices);
    });
  }, []);

  const rearCamera = videoDevices.find(device => device.label.toLowerCase().includes("back"))?.deviceId;
  const frontCamera = videoDevices.find(device => device.label.toLowerCase().includes("front"))?.deviceId;

  const constraints = useMemo(() => {
    return {
      video: isMobile
        ? { facingMode: { exact: "environment" } } // Force rear camera on mobile
        : { facingMode: "user" },                 // Use front camera on desktop
    };
  }, [isMobile]);
  
  const handleScan = (scannedData) => {
    if (!scannedData?.text) return;

    setDebugMessage(`Scanned data detected: ${scannedData.text}`);
    const parsedData = parseVCARD(scannedData.text);

    if (parsedData && parsedData.membershipId) {
      if (!membersIdsRef.current.has(parsedData.membershipId)) {
        setData((prevData) => [...prevData, { ...parsedData, year: "" }]);
        membersIdsRef.current.add(parsedData.membershipId);
        setScanAnimation(true);
        setShowSuccess(true);

        setTimeout(() => setScanAnimation(false), 1500);
        setTimeout(() => setShowSuccess(false), 2000);

        setError("");
      } else {
        setDebugMessage(`Duplicate detected: ${parsedData.membershipId}`);
      }
    } else {
      setError("Invalid QR code format.");
    }
  };


  const handleError = (err) => {
    console.error("Scanner error:", err);
    setError(
      isMobile
        ? "An error occurred while accessing the camera. Please grant camera permissions and use a supported browser."
        : "An error occurred while accessing the camera. Please check camera permissions."
    );
    setDebugMessage("Failed to initialize scanner. Please check camera permissions.");
  };

  const parseVCARD = (scannedData) => {
    try {
      if (scannedData.includes("BEGIN:VCARD")) {
        const nicknameMatch = scannedData.match(/NICKNAME:([^ ]+)/);
        const membershipIdMatch = scannedData.match(/Member#: (\d+)/);

        if (nicknameMatch && membershipIdMatch) {
          return {
            name: nicknameMatch[1].trim(),
            membershipId: membershipIdMatch[1].trim(),
          };
        }
      }

      if (scannedData.includes("Member Name:")) {
        const nameMatch = scannedData.match(/Member Name:([^,]+)/);
        const memberNumberMatch = scannedData.match(/Member Number:([^,]+)/);

        if (nameMatch && memberNumberMatch) {
          return {
            name: nameMatch[1].trim(),
            membershipId: memberNumberMatch[1].trim(),
          };
        }
      }
    } catch (e) {
      console.error("Error parsing scanned data:", e);
    }

    return null;
  };

  const headers = [
    { label: "Name", key: "name" },
    { label: "Membership ID", key: "membershipId" },
    { label: "Year", key: "year" },
  ];

  return (
    <div className="min-h-screen p-4 overflow-hidden relative"
      style={{
        background: "radial-gradient(100% 100% at 50% 0%, rgb(52, 4, 91) 0%, rgb(10, 0, 17) 80%)"
      }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {bubbles}
      </div>

      <div className="max-w-3xl mx-auto bg-black/30 backdrop-blur-sm rounded-xl shadow-lg p-6 relative z-10 border border-violet-500/30">
        <h1 className="text-4xl font-bold text-violet-300 text-center mb-6">QR Attendance Scanner</h1>

        <div className="mb-4 flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Filename (without .csv)"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="border border-violet-600 bg-black bg-opacity-30 text-white rounded-md px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="border border-violet-600 bg-black bg-opacity-30 text-white rounded-md px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all resize-none"
          />

        </div>

        <p className="text-sm text-gray-400 text-center mb-2">
          {isMobile ? "Using rear camera (mobile)" : "Using front camera (desktop)"}
        </p>

        <div className="mx-auto w-full max-w-md border-4 border-violet-500 rounded-xl overflow-hidden relative aspect-video">
          <div className="absolute inset-0">
            <QrReader
              constraints={constraints}
              onResult={(result, error) => {
                if (result) handleScan({ text: result?.text });
              }}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              videoStyle={{ width: "100%", height: "100%", objectFit: "cover" }}
              ViewFinder={() => null}
            />
          </div>
          {scanAnimation && (
            <div
              className="absolute left-0 right-0 bg-violet-500 h-1 w-full"
              style={{ animation: "scan 1.5s linear" }}
            />
          )}
          {showSuccess && (
            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
              <div className="bg-black/50 p-4 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {error && <div className="mt-4 p-3 bg-red-900/30 text-red-400 rounded text-center">{error}</div>}
        <p className="mt-2 text-center text-violet-300 text-sm">{debugMessage}</p>

        <div className="mt-8 bg-black bg-opacity-30 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-violet-300">Scanned Entries</h2>
            <div className="bg-violet-900/50 text-violet-300 px-3 py-1 rounded-full text-sm">
              Total: {data.length}
            </div>
          </div>

          {data.length > 0 ? (
            <div className="overflow-x-auto rounded-lg">
              <table className="w-full table-auto border-collapse">
                <thead className="bg-violet-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-white">Name</th>
                    <th className="px-4 py-2 text-left text-white">Membership ID</th>
                    <th className="px-4 py-2 text-left text-white">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={index} className="bg-black bg-opacity-20 border-b border-violet-800 hover:bg-violet-900/20 transition-colors">
                      <td className="px-4 py-2 text-white">{item.name}</td>
                      <td className="px-4 py-2 text-white">{item.membershipId}</td>
                      <td className="px-4 py-2 text-white">
                        <select
                          value={item.year || ""}
                          onChange={(e) => {
                            const updatedData = [...data];
                            updatedData[index].year = e.target.value;
                            setData(updatedData);
                          }}
                          className="bg-black bg-opacity-50 border border-violet-500 rounded-md px-2 py-1 text-white"
                        >
                          <option value="1">1st Year</option>
                          <option value="2">2nd Year</option>
                          <option value="3">3rd Year</option>
                          <option value="4">4th Year</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-violet-300 text-center p-6">No data scanned yet.</p>
          )}

          {data.length > 0 && (
            <div className="text-center mt-6">
              <CSVLink
                data={[
                  [`Description: ${description}`], // First row
                  headers.map(h => h.label),       // Column headers
                  ...data.map(row => [row.name, row.membershipId, row.year]) // Data rows
                ]}
                filename={`${filename}.csv`}
                className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-md transition-all shadow-lg hover:shadow-violet-500/20 inline-flex items-center"
                style={{ animation: "pulse 2s infinite" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download CSV
              </CSVLink>

              {description && (
                <div className="mt-4 p-3 bg-violet-900/20 rounded-lg text-sm text-violet-300 inline-block">
                  Description: {description}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
