import React from "react";
import QRScanner from "./components/QRScanner.jsx";
import './App.css'
function App() {
  return (
    <div style={{ width: "100vw", height: "100vh", margin: 0 }}>
      <QRScanner />
    </div>
  );
}

export default App;
