"use client";
import React, { useRef, useState } from "react";
import toast from "react-hot-toast";
import { readString, jsonToCSV } from "react-papaparse";
import { Tooltip } from "react-tooltip";
import * as XLSX from "xlsx";

export default function FileConverter() {
  const ref = useRef();
  const [showFormatDialog, setShowFormatDialog] = useState(false);
  const [conversionData, setConversionData] = useState(null);
  const [conversionFileName, setConversionFileName] = useState("");

  // --- flatten JSON -> rows (only if it matches nested format) ---
  const flattenData = (data) => {
    if (!Array.isArray(data)) return data;

    const isNestedFormat = data.some(
      (item) => item && typeof item === "object" && Array.isArray(item.leaves)
    );

    if (!isNestedFormat) return data;

    const flattened = [];
    data.forEach((item) => {
      if (Array.isArray(item.leaves)) {
        item.leaves.forEach((leave) => {
          flattened.push({
            month: item.month,
            year: item.year,
            monthId: item.id,
            ...leave,
          });
        });
      } else {
        flattened.push(item);
      }
    });
    return flattened;
  };

  // --- group rows -> nested JSON (only if it looks flattened) ---
  const nestData = (rows) => {
    if (!Array.isArray(rows)) return rows;

    const isFlattenedFormat = rows.some(
      (row) =>
        row &&
        typeof row === "object" &&
        "month" in row &&
        "year" in row &&
        ("monthId" in row || "id" in row)
    );

    if (!isFlattenedFormat) return rows;

    const grouped = {};
    rows.forEach((row) => {
      const { month, year, monthId, id, ...leave } = row;
      const groupId = monthId || id || `${month}-${year}`;
      if (!grouped[groupId]) {
        grouped[groupId] = {
          month,
          year,
          id: groupId,
          leaves: [],
        };
      }
      grouped[groupId].leaves.push(leave);
    });

    return Object.values(grouped);
  };

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

        const nested = nestData(cleanedData);

        downloadFile(
          JSON.stringify(nested, null, 2),
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
      const rows = XLSX.utils.sheet_to_json(worksheet).map(cleanRow);

      const nested = nestData(rows);

      downloadFile(
        JSON.stringify(nested, null, 2),
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
      // 🔥 flatten only if nested
      const flatData = flattenData(conversionData);

      if (format === "csv") {
        const csv = jsonToCSV(flatData);
        downloadFile(csv, `${conversionFileName}.csv`, "text/csv");
      } else if (format === "xlsx") {
        const worksheet = XLSX.utils.json_to_sheet(flatData);
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
    ref.current.value = "";
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
    <div className="max-w-6xl mx-auto my-12 px-4">
      <div className="container-main text-center">
        <h3 className="text-2xl font-semibold leading-relaxed mb-6">
          File Converter with Format Selection
          <br />
          (JSON → CSV/XLSX | CSV/Excel → JSON)
        </h3>
        <input
          type="file"
          id="fileInput"
          className="block w-full rounded-md border border-gray-600 bg-gray-900 p-2 text-sm text-white placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-400"
          accept=".csv,.json,.xlsx,.xls"
          onChange={handleFileUpload}
          multiple
          ref={ref}
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
