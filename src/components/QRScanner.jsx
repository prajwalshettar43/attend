import React, { useState, useEffect, useRef, useMemo } from "react";
import { CSVLink } from "react-csv";
import { Html5Qrcode } from "html5-qrcode";
// Add import for specific formats if needed
// import { Html5QrcodeSupportedFormats } from "html5-qrcode";

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
  const [isScanning, setIsScanning] = useState(false);
  const [scanAttempts, setScanAttempts] = useState(0);

  const membersIdsRef = useRef(new Set());
  const html5QrCodeRef = useRef(null);
  const videoElementRef = useRef(null);

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
    
    // Clean up style element on component unmount
    return () => {
      document.head.removeChild(styleSheet);
      stopScanner();
    };
  }, []);

  const [scanAnimation, setScanAnimation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

  const handleScan = (text) => {
    // Clear any previous errors
    setError("");
    setDebugMessage(`Scanned data detected: ${text}`);
    
    try {
      const parsedData = parseVCARD(text);
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
        setDebugMessage("Invalid QR code format. Continuing to scan...");
        // Use a temporary error that doesn't stay visible
        setError("Invalid QR code format.");
        setTimeout(() => setError(""), 3000);
      }
    } catch (err) {
      console.error("Error processing scan:", err);
      setDebugMessage("Error processing scan. Continuing to scan...");
    }
  };

  const handleError = (err) => {
    // Convert error to string for comparison
    const errorString = err.toString();
    
    // Filter out normal QR scanning "errors" that occur when no QR code is in view
    // These should not be treated as actual errors
    if (errorString.includes("NotFoundException") || 
        errorString.includes("No MultiFormat Readers were able to detect the code")) {
      // This is normal when scanning - no QR code is in view
      // Don't show an error to the user, just update the debug message if necessary
      if (debugMessage !== "Scanning for QR codes...") {
        setDebugMessage("Scanning for QR codes...");
      }
      return;
    }
    
    // Log real errors to console for debugging
    console.error("Scanner error:", err);
    
    let errorMessage = "";
    let debugMessage = "Failed to initialize scanner.";
    
    if (err.name === "NotAllowedError") {
      errorMessage = "Camera access denied. Please grant permissions in your browser settings.";
      debugMessage = "Camera permission denied.";
    } else if (err.name === "NotFoundError" || errorString.includes("NotFoundError")) {
      errorMessage = "No camera found. Please connect a camera device.";
      debugMessage = "No camera detected.";
    } else if (err.name === "NotReadableError") {
      errorMessage = "Camera is in use by another application.";
      debugMessage = "Camera unavailable.";
    } else if (err.name === "OverconstrainedError" || errorString.includes("OverconstrainedError")) {
      errorMessage = "Camera constraints cannot be satisfied. Trying with different settings...";
      debugMessage = "Adjusting camera settings...";
      
      // Try again with different camera settings
      if (scanAttempts < 3) {
        setScanAttempts(prev => prev + 1);
        setTimeout(() => {
          // Try with progressively more relaxed constraints
          if (scanAttempts === 0) {
            startScanner({ facingMode: "environment" });
          } else if (scanAttempts === 1) {
            startScanner({ facingMode: "user" });
          } else {
            startScanner(true); // Most permissive option
          }
        }, 1000);
        return;
      } else {
        errorMessage = "Could not access camera with compatible settings. Please try a different device.";
        debugMessage = "Camera initialization failed after multiple attempts.";
      }
    }
    
    setError(errorMessage);
    setDebugMessage(debugMessage);
    setIsScanning(false);
  };

  useEffect(() => {
    // Wait a moment before starting the camera to ensure DOM is ready
    const initTimer = setTimeout(() => {
      initializeScanner();
    }, 500);

    return () => {
      clearTimeout(initTimer);
      stopScanner();
    };
  }, [isMobile]);

  const initializeScanner = async () => {
    try {
      stopScanner(); // Stop any existing scanner
      setDebugMessage("Detecting available cameras...");
      setError(""); // Clear any existing errors
      
      try {
        // Request camera permissions explicitly first
        await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (permissionErr) {
        console.error("Permission error:", permissionErr);
        handleError(permissionErr);
        return;
      }
      
      // If we get here, permission was granted
      try {
        // Attempt to get cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput");
        
        if (cameras.length === 0) {
          setError("No cameras detected on this device.");
          setDebugMessage("No cameras available.");
          return;
        }
        
        // Log available cameras to help with debugging
        console.log("Available cameras:", cameras.map(c => c.label || "Unnamed camera"));
        
        if (isMobile) {
          // For mobile, try to find rear camera
          const rearCamera = cameras.find(
            camera => 
              camera.label.toLowerCase().includes("back") || 
              camera.label.toLowerCase().includes("rear")
          );
          
          if (rearCamera) {
            setDebugMessage(`Using rear camera: ${rearCamera.label}`);
            startScanner({ deviceId: rearCamera.deviceId });
          } else {
            setDebugMessage("No rear camera found, using environment mode");
            startScanner({ facingMode: "environment" });
          }
        } else {
          // For desktop, use default camera
          setDebugMessage(`Found ${cameras.length} camera(s), using default`);
          startScanner(true);
        }
      } catch (deviceErr) {
        console.error("Error getting devices:", deviceErr);
        handleError(deviceErr);
      }
    } catch (err) {
      console.error("Error during camera initialization:", err);
      handleError(err);
    }
  };

  const startScanner = (cameraConfig) => {
    try {
      // Make sure the container exists
      const container = document.getElementById("qr-video-container");
      if (!container) {
        setError("Scanner container not found.");
        return;
      }
      
      // Clear any previous instances
      if (html5QrCodeRef.current) {
        stopScanner();
      }
      
      setDebugMessage("Starting scanner...");
      const html5QrCode = new Html5Qrcode("qr-video-container");
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 15, // Slightly higher for smoother scanning on mobile
        qrbox: {
          width: 200, // Smaller to fit mobile screens
          height: 200, // Square to match typical QR code shapes
        },
        aspectRatio: 1, // Square aspect ratio for better mobile compatibility
        disableFlip: true, // Prevent camera flipping to avoid confusion
        verbose: false, // Keep false to reduce console clutter
      };

      setIsScanning(true);
      
      // Different ways to start based on what was passed
      if (typeof cameraConfig === 'boolean') {
        // Most permissive - let the browser choose
        html5QrCode.start({ facingMode: "environment" }, config, handleScan, handleError);
      } else if (typeof cameraConfig === 'string') {
        // Camera ID
        html5QrCode.start(cameraConfig, config, handleScan, handleError);
      } else if (typeof cameraConfig === 'object') {
        // Camera constraints object
        html5QrCode.start(cameraConfig, config, handleScan, handleError);
      }
      
      // Update user feedback once scanner is running
      setTimeout(() => {
        if (isScanning) {
          setDebugMessage("Scanning for QR codes...");
        }
      }, 2000);
      
    } catch (err) {
      console.error("Error starting scanner:", err);
      handleError(err);
    }
  };

  const stopScanner = () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop()
            .then(() => {
              html5QrCodeRef.current.clear();
              setIsScanning(false);
            })
            .catch((err) => {
              console.error("Error stopping scanner:", err);
            });
        } else {
          html5QrCodeRef.current.clear();
        }
      } catch (err) {
        console.error("Error during scanner cleanup:", err);
      }
    }
  };

  const restartScanner = () => {
    setScanAttempts(0);
    stopScanner();
    setTimeout(() => {
      initializeScanner();
    }, 1000);
  };

  const headers = [
    { label: "Name", key: "name" },
    { label: "Membership ID", key: "membershipId" },
    { label: "Year", key: "year" },
  ];

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
          {isMobile ? "Using rear camera (mobile)" : "Using default camera (desktop)"}
        </p>

        <div className="mx-auto w-full max-w-md border-4 border-violet-500 rounded-xl overflow-hidden relative aspect-video">
          <div id="qr-video-container" className="w-full h-full"></div>

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
            {scanAttempts >= 3 && (
              <button
                onClick={restartScanner}
                className="ml-2 underline text-violet-400 hover:text-violet-300"
              >
                Try Again
              </button>
            )}
          </div>
        )}

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