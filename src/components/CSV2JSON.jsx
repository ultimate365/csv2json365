"use client";
import React, { useRef } from "react";
import toast from "react-hot-toast";
import { readString, jsonToCSV } from "react-papaparse";
import * as XLSX from "xlsx";
import { Tooltip } from "react-tooltip";

export default function CSV2JSON() {
  const ref = useRef();

  const handleFileUpload = (event) => {
    const selectedFiles = Array.from(event.target.files);
    selectedFiles.forEach((file) => {
      const fileNameWithoutExtension = file.name
        .split(".")
        .slice(0, -1)
        .join(".");

      if (
        file.type === "text/csv" ||
        file.type === "application/json" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        const reader = new FileReader();
        reader.onload = () => {
          const fileContent = reader.result;
          convertFile(fileContent, fileNameWithoutExtension, file.type);
        };
        if (file.type.includes("spreadsheetml")) {
          reader.readAsArrayBuffer(file);
        } else {
          reader.readAsText(file);
        }
      } else {
        toast.error("Invalid file uploaded");
        if (typeof window !== "undefined") {
          document.getElementById("fileInput").value = "";
        }
      }
    });
  };

  const downloadFile = (data, fileName, fileType) => {
    let blob;
    if (
      fileType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      blob = new Blob([data], { type: fileType });
    } else {
      blob = new Blob([data], { type: fileType });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    a.remove();
    ref.current.value = "";
  };

  const convertFile = (fileContent, fileName, fileType) => {
    // --- Helper: Flatten month + leaves into rows ---
    const flattenData = (data) => {
      const flattened = [];

      data.forEach((item) => {
        if (Array.isArray(item.leaves)) {
          item.leaves.forEach((leave) => {
            flattened.push({
              month: item.month,
              year: item.year,
              monthId: item.id, // renamed to avoid clash with teacher id
              ...leave, // teacher details expanded
            });
          });
        } else {
          flattened.push(item);
        }
      });

      return flattened;
    };

    if (fileType === "application/json" || isJson(fileContent)) {
      // ✅ JSON → CSV & XLSX
      const jsonData = JSON.parse(fileContent);

      // 🔥 Flatten nested arrays into plain rows
      const flatData = flattenData(jsonData);

      // --- CSV Export ---
      const csv = jsonToCSV(flatData);
      downloadFile(csv, `${fileName}.csv`, "text/csv");

      // --- XLSX Export ---
      const ws = XLSX.utils.json_to_sheet(flatData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      downloadFile(
        excelBuffer,
        `${fileName}.xlsx`,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    } else if (fileType === "text/csv") {
      // ✅ CSV → JSON (flat)
      readString(fileContent, {
        complete: (results) => {
          const data = results.data
            .filter((row) =>
              Object.values(row).some((val) => val !== null && val !== "")
            )
            .map((row) => {
              const cleanedRow = {};
              for (const key in row) {
                const val = row[key];
                if (!isNaN(val) && val !== "") {
                  cleanedRow[key] = Number(val);
                } else if (val === "TRUE") {
                  cleanedRow[key] = true;
                } else if (val === "FALSE") {
                  cleanedRow[key] = false;
                } else {
                  try {
                    cleanedRow[key] = JSON.parse(val);
                  } catch {
                    cleanedRow[key] = val;
                  }
                }
              }
              return cleanedRow;
            });

          const json = JSON.stringify(data, null, 2);
          downloadFile(json, `${fileName}.json`, "application/json");
        },
        header: true,
      });
    } else if (fileType.includes("spreadsheetml")) {
      // ✅ XLSX → JSON
      const workbook = XLSX.read(fileContent, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      const parsedData = data.map((row) => {
        for (const key in row) {
          try {
            row[key] = JSON.parse(row[key]);
          } catch {
            // leave as is
          }
        }
        return row;
      });

      const json = JSON.stringify(parsedData, null, 2);
      downloadFile(json, `${fileName}.json`, "application/json");
    }
  };

  const isJson = (str) => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="container my-5">
      <div className="container-main">
        <h3>
          CSV To JSON
          <br /> OR
          <br /> JSON To CSV
          <br />
          File Converter
        </h3>
        <input
          type="file"
          id="fileInput"
          className="form-control"
          accept=".csv,.json,.xlsx"
          onChange={handleFileUpload}
          multiple
          ref={ref}
        />
      </div>
      <Tooltip anchorSelect=".container-main" place="top">
        Please Upload only .csv, .json or .xlsx files
      </Tooltip>
    </div>
  );
}
