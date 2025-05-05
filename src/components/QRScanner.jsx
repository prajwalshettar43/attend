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
  const [facingMode, setFacingMode] = useState("environment"); // default to rear
  const [filename, setFilename] = useState("Attendance");
  const [description, setDescription] = useState("");
  const membersIdsRef = useRef(new Set());

  const bubbles = useMemo(() => {
    return Array.from({ length: 25 }, (_, i) => {
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
    });
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
    `;
    document.head.appendChild(styleSheet);

    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod|android|blackberry|windows phone/g.test(userAgent);
    };
    setIsMobile(checkMobile());
  }, []);

  const [videoDevices, setVideoDevices] = useState([]);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const videoInputDevices = devices.filter((device) => device.kind === "videoinput");
      setVideoDevices(videoInputDevices);
    });
  }, []);

  const rearCamera = videoDevices.find((device) =>
    device.label.toLowerCase().includes("back")
  )?.deviceId;

  const constraints = useMemo(() => {
    return {
      video: {
        facingMode: { exact: facingMode } // "environment" or "user"
      }
    };
  }, [facingMode]);
  

  const handleScan = (scannedData) => {
    if (!scannedData?.text) return;

    setDebugMessage(`Scanned data detected: ${scannedData.text}`);
    const parsedData = parseVCARD(scannedData.text);

    if (parsedData && parsedData.membershipId) {
      if (!membersIdsRef.current.has(parsedData.membershipId)) {
        setData((prevData) => [...prevData, { ...parsedData, year: "1" }]);
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
    let errorMessage = "An error occurred while accessing the camera.";
    let debugMessage = "Failed to initialize scanner.";

    if (err.name === "NotAllowedError") {
      errorMessage = "Camera access denied. Please grant permissions in your browser settings.";
      debugMessage = "Camera permission denied.";
    } else if (err.name === "NotFoundError") {
      errorMessage = "No camera found. Please connect a camera device.";
      debugMessage = "No camera detected.";
    } else if (err.name === "NotReadableError") {
      errorMessage = "Camera is in use by another application.";
      debugMessage = "Camera unavailable.";
    }

    setError(errorMessage);
    setDebugMessage(debugMessage);
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

  const [scanAnimation, setScanAnimation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  return (
    <div
      className="min-h-screen p-4 overflow-hidden relative"
      style={{
        background:
          "radial-gradient(100% 100% at 50% 0%, rgb(52, 4, 91) 0%, rgb(10, 0, 17) 80%)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {bubbles}
      </div>

      <div className="max-w-3xl mx-auto bg-black/30 backdrop-blur-sm rounded-xl shadow-lg p-6 relative z-10 border border-violet-500/30">
        <h1 className="text-4xl font-bold text-violet-300 text-center mb-6">
          QR Attendance Scanner
        </h1>

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
          {isMobile
            ? `Using ${facingMode === "user" ? "front" : "rear"} camera (mobile)`
            : "Using default camera (desktop)"}
        </p>

        {isMobile && (
          <div className="text-center mb-4">
            <button
              onClick={() =>
                setFacingMode((prev) =>
                  prev === "environment" ? "user" : "environment"
                )
              }
            >
              Switch to {facingMode === "environment" ? "Front" : "Rear"} Camera
            </button>
          </div>
        )}

        <div className="mx-auto w-full max-w-md border-4 border-violet-500 rounded-xl overflow-hidden relative aspect-video">
          <div className="absolute inset-0">
            <QrReader
              constraints={constraints}
              onResult={(result, error) => {
                if (result) {
                  handleScan({ text: result.text });
                } else if (isMobile && error) {
                  handleError(error);
                }
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/30 text-red-400 rounded text-center">
            {error}
          </div>
        )}
        <p className="mt-2 text-center text-violet-300 text-sm">{debugMessage}</p>

        <div className="mt-8 bg-black bg-opacity-30 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-violet-300">
              Scanned Entries
            </h2>
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
                  {data.map((entry, index) => (
                    <tr key={index} className="bg-violet-800/30">
                      <td className="px-4 py-2 text-violet-100">{entry.name}</td>
                      <td className="px-4 py-2 text-violet-100">{entry.membershipId}</td>
                      <td className="px-4 py-2 text-violet-100">
                        <select
                          value={entry.year || "1"}
                          onChange={(e) => {
                            const updatedData = [...data];
                            updatedData[index].year = e.target.value;
                            setData(updatedData);
                          }}
                          className="bg-black bg-opacity-30 text-white border border-violet-600 rounded px-2 py-1 w-full focus:outline-none"
                        >
                          <option value="1">Year 1</option>
                          <option value="2">Year 2</option>
                          <option value="3">Year 3</option>
                          <option value="4">Year 4</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-violet-300 text-sm text-center">
              No entries scanned yet.
            </p>
          )}
        </div>

        <div className="mt-6 text-center">
          {data.length > 0 && (
            <CSVLink
              data={data}
              headers={headers}
              filename={`${filename}.csv`}
              className="inline-block bg-violet-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-violet-700 transition"
            >
              Download CSV
            </CSVLink>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
