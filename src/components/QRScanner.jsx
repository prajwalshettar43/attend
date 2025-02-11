import React, { useState } from "react";
import { CSVLink } from "react-csv";
import QrScanner from "react-qr-scanner";

const QRScanner = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState("");
  const [debugMessage, setDebugMessage] = useState("Initializing scanner...");
  const [lastScan, setLastScan] = useState("");

  const styles = {
    container: {
      minHeight: "100vh",
      backgroundColor: "#f9fafb",
      padding: "2rem",
    },
    card: {
      maxWidth: "900px",
      margin: "0 auto",
      backgroundColor: "white",
      borderRadius: "8px",
      padding: "1.5rem",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    },
    title: {
      fontSize: "1.875rem",
      fontWeight: "bold",
      textAlign: "center",
      color: "#059669",
      marginBottom: "1.5rem",
    },
    scannerContainer: {
      position: "relative",
      width: "320px",
      height: "240px",
      margin: "0 auto",
      overflow: "hidden",
      borderRadius: "8px",
      border: "2px solid #059669",
    },
    scanner: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
    errorMessage: {
      marginTop: "1rem",
      padding: "1rem",
      backgroundColor: "#fee2e2",
      color: "#dc2626",
      borderRadius: "6px",
      textAlign: "center",
    },
    debugMessage: {
      marginTop: "1rem",
      textAlign: "center",
      color: "#4b5563",
    },
    dataSection: {
      marginTop: "2rem",
    },
    sectionTitle: {
      fontSize: "1.25rem",
      fontWeight: "600",
      color: "#1f2937",
      marginBottom: "1rem",
    },
    counter: {
      fontSize: "1.125rem",
      fontWeight: "500",
      color: "#374151",
      marginBottom: "1rem",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      marginTop: "1rem",
    },
    tableHeader: {
      backgroundColor: "#059669",
      color: "white",
    },
    th: {
      padding: "0.75rem",
      textAlign: "left",
    },
    td: {
      padding: "0.75rem",
      borderBottom: "1px solid #e5e7eb",
      color:"black",
    },
    noData: {
      textAlign: "center",
      color: "#6b7280",
      marginTop: "1rem",
    },
    downloadButton: {
      display: "inline-block",
      backgroundColor: "#059669",
      color: "white",
      padding: "0.5rem 1rem",
      borderRadius: "6px",
      textDecoration: "none",
      marginTop: "1.5rem",
      cursor: "pointer",
      transition: "background-color 0.2s",
    },
    buttonContainer: {
      textAlign: "center",
      marginTop: "1.5rem",
    },
  };

  const handleScan = (scannedData) => {
    if (scannedData?.text && scannedData.text !== lastScan) {
      setLastScan(scannedData.text);
      setDebugMessage(`Scanned data detected: ${scannedData.text}`);
      const parsedData = parseVCARD(scannedData.text);
      
      if (parsedData && !data.some((item) => item.membershipId === parsedData.membershipId)) {
        setData((prevData) => [...prevData, parsedData]);
        setError("");
      } else if (!parsedData) {
        setError("Invalid QR code format.");
      }
  
      // No need to reset `lastScan` after the scan
    }
  };
  

  const handleError = (err) => {
    console.error("Scanner error:", err);
    setError("An error occurred while accessing the camera.");
    setDebugMessage("Failed to initialize scanner.");
  };

  const parseVCARD = (scannedData) => {
    try {
      // Check for VCARD format and extract NICKNAME
      if (scannedData.includes("BEGIN:VCARD")) {
        const nicknameMatch = scannedData.match(/NICKNAME:([^ ]+)/); // Matches "NICKNAME:VALUE"
        const membershipIdMatch = scannedData.match(/Member#: (\d+)/); // Matches "Member#: VALUE"
  
        if (nicknameMatch && membershipIdMatch) {
          const name = nicknameMatch[1].trim();
          const membershipId = membershipIdMatch[1].trim();
  
          return {
            name,
            membershipId,
          };
        }
      }
  
      // Check for Plain Text format
      if (scannedData.includes("Member Name:")) {
        const nameMatch = scannedData.match(/Member Name:([^,]+)/); // Matches "Member Name:" followed by the name until a comma
        const memberNumberMatch = scannedData.match(/Member Number:([^,]+)/); // Matches "Member Number:" followed by the number until a comma
  
        if (nameMatch && memberNumberMatch) {
          const name = nameMatch[1].trim();
          const membershipId = memberNumberMatch[1].trim();
  
          return {
            name,
            membershipId,
          };
        }
      }
    } catch (e) {
      console.error("Error parsing scanned data:", e);
    }
  
    return null; // Return null if parsing fails
  };
  

  const headers = [
    { label: "Name", key: "name" },
    { label: "Membership ID", key: "membershipId" },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>QR Code Scanner</h1>

        <div style={styles.scannerContainer}>
          <QrScanner
            delay={300}
            style={styles.scanner}
            onError={handleError}
            onScan={handleScan}
          />
        </div>

        {error && <div style={styles.errorMessage}>{error}</div>}
        <p style={styles.debugMessage}>{debugMessage}</p>

        <div style={styles.dataSection}>
          <h2 style={styles.sectionTitle}>Scanned Data</h2>
          <p style={styles.counter}>Total QR Codes Scanned: {data.length}</p>

          {data.length > 0 ? (
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Membership ID</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={index}>
                    <td style={styles.td}>{item.name}</td>
                    <td style={styles.td}>{item.membershipId.toString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={styles.noData}>No data scanned yet.</p>
          )}

          {data.length > 0 && (
            <div style={styles.buttonContainer}>
              <CSVLink
                data={data}
                headers={headers}
                filename={"Attendence_data.csv"}
                style={styles.downloadButton}
              >
                Download CSV
              </CSVLink>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;