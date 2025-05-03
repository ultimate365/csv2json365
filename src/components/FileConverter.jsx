"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { readString, jsonToCSV } from "react-papaparse";
import { Tooltip } from "react-tooltip";
import * as XLSX from "xlsx";

export default function FileConverter() {
  const [showFormatDialog, setShowFormatDialog] = useState(false);
  const [conversionData, setConversionData] = useState(null);
  const [conversionFileName, setConversionFileName] = useState("");

  const cleanRow = (row) => {
    const cleanedRow = {};
    for (const key in row) {
      let value = row[key];
      if (typeof value === "number") {
        const strValue = value.toString();
        if (strValue.length >= 7 && !strValue.includes(".")) {
          value = strValue;
        }
      }
      if (typeof value === "string") {
        if (!isNaN(value) && value.trim() !== "") {
          if (value.length >= 7 && !value.includes(".")) {
            value = value.toString();
          } else {
            value = parseFloat(value);
          }
        } else if (value.toUpperCase() === "TRUE") {
          value = true;
        } else if (value.toUpperCase() === "FALSE") {
          value = false;
        }
      }
      cleanedRow[key] = value;
    }
    return cleanedRow;
  };

  const handleFileUpload = (event) => {
    const selectedFiles = Array.from(event.target.files);
    selectedFiles.forEach((file) => {
      const fileName = file.name;
      const extension = fileName.split(".").pop().toLowerCase();
      const fileNameWithoutExtension = fileName
        .split(".")
        .slice(0, -1)
        .join(".");

      if (!["csv", "json", "xls", "xlsx"].includes(extension)) {
        toast.error("Invalid file type");
        resetFileInput();
        return;
      }

      const reader = new FileReader();

      if (extension === "csv" || extension === "json") {
        reader.onload = () => {
          const fileContent = reader.result;
          if (extension === "json") {
            try {
              const jsonData = JSON.parse(fileContent).map(cleanRow);
              setConversionData(jsonData);
              setConversionFileName(fileNameWithoutExtension);
              setShowFormatDialog(true);
            } catch (error) {
              handleError("Invalid JSON format", error);
            }
          } else {
            processCSVFile(fileContent, fileNameWithoutExtension);
          }
        };
        reader.readAsText(file);
      } else {
        reader.onload = () => {
          const arrayBuffer = reader.result;
          processExcelFile(arrayBuffer, fileNameWithoutExtension);
        };
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const processCSVFile = (content, fileName) => {
    readString(content, {
      header: true,
      complete: (results) => {
        const cleanedData = results.data
          .filter((row) =>
            Object.values(row).some((v) => v !== null && v !== "")
          )
          .map(cleanRow);
        downloadFile(
          JSON.stringify(cleanedData, null, 2),
          `${fileName}.json`,
          "application/json"
        );
      },
      error: (error) => handleError("CSV processing error", error),
    });
  };

  const processExcelFile = (arrayBuffer, fileName) => {
    try {
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet).map(cleanRow);
      downloadFile(
        JSON.stringify(jsonData, null, 2),
        `${fileName}.json`,
        "application/json"
      );
    } catch (error) {
      handleError("Excel processing error", error);
    }
  };

  const handleFormatSelection = (format) => {
    if (!conversionData || !conversionFileName) return;

    try {
      if (format === "csv") {
        const csv = jsonToCSV(conversionData);
        downloadFile(csv, `${conversionFileName}.csv`, "text/csv");
      } else if (format === "xlsx") {
        const worksheet = XLSX.utils.json_to_sheet(conversionData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        const xlsxBuffer = XLSX.write(workbook, {
          type: "array",
          bookType: "xlsx",
        });
        downloadFile(
          xlsxBuffer,
          `${conversionFileName}.xlsx`,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
      }
    } catch (error) {
      handleError("Conversion error", error);
    } finally {
      setShowFormatDialog(false);
      resetFileInput();
    }
  };

  const downloadFile = (data, fileName, fileType) => {
    const blob = new Blob([data], { type: fileType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFileInput = () => {
    document.getElementById("fileInput").value = "";
    setConversionData(null);
    setConversionFileName("");
  };

  const handleError = (message, error) => {
    toast.error(message);
    console.error(error);
    resetFileInput();
  };

  return (
    <div className="container my-5">
      <div className="container-main">
        <h3>
          File Converter with Format Selection
          <br />
          (JSON → CSV/XLSX | CSV/Excel → JSON)
        </h3>
        <input
          type="file"
          id="fileInput"
          className="form-control"
          accept=".csv,.json,.xlsx,.xls"
          onChange={handleFileUpload}
          multiple
        />
      </div>

      {showFormatDialog && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h4>Select Output Format for {conversionFileName}</h4>
            <div className="modal-buttons">
              <button
                className="btn-csv"
                onClick={() => handleFormatSelection("csv")}
              >
                Download as CSV
              </button>
              <button
                className="btn-xlsx"
                onClick={() => handleFormatSelection("xlsx")}
              >
                Download as Excel
              </button>
            </div>
            <div className="modal-buttons">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowFormatDialog(false);
                  resetFileInput();
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <Tooltip anchorSelect=".container-main" place="top">
        Supported formats: .json, .csv, .xlsx, .xls
      </Tooltip>
    </div>
  );
}
