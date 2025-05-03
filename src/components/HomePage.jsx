"use client";
import React, { useState } from "react";
import CSV2JSON from "./CSV2JSON";
import FileConverter from "./FileConverter";

export default function HomePage() {
  const [showOld, setShowOld] = useState(false);
  return (
    <div className="container mx-auto">
      {showOld ? (
        <div className="d-flex flex-column align-items-center justify-content-center h-screen">
          <h1 className="text-2xl font-bold">Old CSV to JSON Converter</h1>
          <CSV2JSON />
          <button
            onClick={() => setShowOld(false)}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
          >
            Switch to New Converter
          </button>
        </div>
      ) : (
        <div className="d-flex flex-column align-items-center justify-content-center h-screen">
          <h1 className="text-2xl font-bold">New File Converter</h1>
          <FileConverter />
          <button
            onClick={() => setShowOld(true)}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
          >
            Switch to Old Converter
          </button>
        </div>
      )}
    </div>
  );
}
