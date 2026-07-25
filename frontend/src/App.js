import React, { useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  updateFormData,
  addChatMessage,
  resetForm,
  setLoading,
  setProgress,
} from "./store/complaintSlice";

function App() {
  const dispatch = useDispatch();
  const { formData, chatHistory, isLoading, progress } = useSelector(
    (state) => state.complaint,
  );
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    dispatch(
      addChatMessage({ type: "user", text: `Uploaded document: ${file.name}` }),
    );
    dispatch(setLoading(true));
    dispatch(setProgress(20));

    const formDataObj = new FormData();
    formDataObj.append("file", file);

    try {
      const res = await axios.post(
        "http://localhost:8000/api/upload",
        formDataObj,
      );
      dispatch(setProgress(100));
      dispatch(updateFormData(res.data.data));
      dispatch(
        addChatMessage({
          type: "ai",
          text:
            res.data.data.ai_summary || "Document analyzed and form populated.",
        }),
      );
      scrollToBottom();
    } catch (err) {
      console.error(err);
      dispatch(
        addChatMessage({ type: "ai", text: "Error processing document." }),
      );
    } finally {
      dispatch(setLoading(false));
      setTimeout(() => dispatch(setProgress(0)), 1000);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput) return;

    const userText = chatInput;
    dispatch(addChatMessage({ type: "user", text: userText }));
    setChatInput("");
    dispatch(setLoading(true));

    const actionType = formData.product_name ? "edit" : "extract";

    try {
      const res = await axios.post("http://localhost:8000/api/chat", {
        message: userText,
        current_data: formData,
        action_type: actionType,
      });
      dispatch(updateFormData(res.data.data));
      dispatch(
        addChatMessage({
          type: "ai",
          text: res.data.data.ai_summary || "Information updated.",
        }),
      );
      scrollToBottom();
    } catch (err) {
      console.error(err);
      dispatch(
        addChatMessage({ type: "ai", text: "Sorry, I encountered an error." }),
      );
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleReset = () => {
    dispatch(resetForm());
  };

  const handleSavePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Customer Complaint Report", 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    // Helper to strip invisible characters and convert smart punctuation
    const sanitizeForPDF = (text) => {
      if (!text) return '';
      return String(text)
        .replace(/[\u2018\u2019]/g, "'") // Convert smart single quotes
        .replace(/[\u201C\u201D]/g, '"') // Convert smart double quotes
        .replace(/[\u2013\u2014]/g, '-') // Convert en/em dashes
        .replace(/[^\x20-\x7E\r\n]/g, ''); // Strip all other non-ASCII characters
    };

    // Build the array, applying the sanitizer to the second column
    const rawTableData = [
      ['Complaint Source', formData.complaint_source],
      ['Customer Name', formData.customer_name],
      ['Product Name', formData.product_name],
      ['Strength/Grade', formData.product_strength],
      ['Batch / Lot Number', formData.batch_number],
      ['Affected Quantity', formData.affected_quantity],
      ['Manufacturing Date', formData.manufacturing_date],
      ['Expiry Date', formData.expiry_date],
      ['Originating Site', formData.originating_site_block],
      ['Impacted NPM', formData.impacted_npm],
      ['Complaint Category', formData.complaint_category],
      ['Complaint Description', formData.complaint_description],
      ['Severity', formData.suggested_severity],
      ['Suggested Action', formData.suggested_next_action],
      ['Risk Assessment', formData.initial_risk_assessment],
    ];

    const tableData = rawTableData.map(row => [row[0], sanitizeForPDF(row[1])]);

    autoTable(doc, {
      startY: 30,
      head: [['Field', 'Details']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { 
        overflow: 'linebreak',
        cellPadding: 3,
        valign: 'middle'
      },
      columnStyles: { 
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 130 }
      }
    });

    doc.save(`Complaint_${sanitizeForPDF(formData.batch_number) || 'Report'}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center p-6 font-inter">
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT PANEL: Form */}
        <div
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 overflow-y-auto"
          style={{ maxHeight: "90vh" }}
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Log Customer Complaint</h1>
              <p className="text-sm text-gray-500">
                API & FDF Quality Assurance Module
              </p>
            </div>
            <span className="text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Ready
              to Commit
            </span>
          </div>

          <div className="space-y-6">
            {/* Section 1 */}
            <div>
              <h2 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">
                1. Origin & Customer Details
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Complaint Source
                  </label>
                  <input
                    readOnly
                    value={formData.complaint_source}
                    className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Customer Name
                  </label>
                  <input
                    readOnly
                    value={formData.customer_name}
                    className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none bg-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div>
              <h2 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">
                2. Product & Batch Identification
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Product Name
                  </label>
                  <input
                    readOnly
                    value={formData.product_name}
                    className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Product Strength/Grade
                  </label>
                  <input
                    readOnly
                    value={formData.product_strength}
                    className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none bg-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Batch / Lot Number
                  </label>
                  <input
                    readOnly
                    value={formData.batch_number}
                    className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none bg-blue-50 text-blue-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Affected Quantity
                  </label>
                  <input
                    readOnly
                    value={formData.affected_quantity}
                    className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none bg-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Manufacturing Date
                  </label>
                  <input
                    readOnly
                    value={formData.manufacturing_date}
                    className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Expiry Date
                  </label>
                  <input
                    readOnly
                    value={formData.expiry_date}
                    className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div>
              <h2 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">
                3. Facility & Material Impact
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Originating Site Block
                  </label>
                  <input
                    readOnly
                    value={formData.originating_site_block}
                    className="w-full border border-blue-300 px-3 py-2 rounded focus:outline-none bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Impacted Non-Product Materials (NPM)
                  </label>
                  <input
                    readOnly
                    value={formData.impacted_npm}
                    className="w-full border border-blue-300 px-3 py-2 rounded focus:outline-none bg-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Section 4 */}
            <div>
              <h2 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">
                4. Defect Analysis
              </h2>
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-1">
                  Complaint Category
                </label>
                <input
                  readOnly
                  value={formData.complaint_category}
                  className="w-full border border-blue-300 px-3 py-2 rounded focus:outline-none bg-transparent"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-1">
                  Complaint Description
                </label>
                <textarea
                  readOnly
                  value={formData.complaint_description}
                  rows="3"
                  className="w-full border border-blue-300 px-3 py-2 rounded focus:outline-none bg-transparent"
                ></textarea>
              </div>

              {/* AI Risk Assessment Block */}
              <div className="bg-indigo-50/40 border border-indigo-100 rounded-lg p-4 mt-4">
                <h3 className="text-sm font-semibold text-indigo-900 flex items-center gap-2 mb-3">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    ></path>
                  </svg>
                  AI copilot risk assessment
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs text-indigo-700 mb-1">
                      Severity (Suggested)
                    </label>
                    <input
                      readOnly
                      value={formData.suggested_severity}
                      className="w-full border border-indigo-200 px-3 py-2 rounded focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-indigo-700 mb-1">
                      Suggested Next Action
                    </label>
                    <input
                      readOnly
                      value={formData.suggested_next_action}
                      className="w-full border border-indigo-200 px-3 py-2 rounded focus:outline-none bg-white"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm text-gray-600 mb-1">
                    Initial Risk Assessment
                  </label>
                  <textarea
                    readOnly
                    rows="3"
                    value={formData.initial_risk_assessment}
                    className="w-full border border-blue-300 px-3 py-2 rounded focus:outline-none bg-transparent"
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 border rounded hover:bg-gray-50 text-sm font-medium"
              >
                Reset Form
              </button>
              <button
                type="button"
                onClick={handleSavePDF}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                Save as PDF
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: AI Copilot Chat */}
        <div
          className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col"
          style={{ maxHeight: "90vh" }}
        >
          <div className="p-4 border-b flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 text-indigo-900">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  ></path>
                </svg>
                AI Copilot
              </h2>
            </div>
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
          </div>

          <div className="flex-grow p-4 overflow-y-auto bg-gray-50/50 space-y-4">
            {chatHistory.map((chat, idx) => (
              <div
                key={idx}
                className={`flex ${chat.type === "user" ? "justify-end" : "justify-start"}`}
              >
                {chat.type === "ai" && (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-2 flex-shrink-0 text-sm">
                    ✓
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 text-sm ${
                    chat.type === "user"
                      ? "bg-indigo-600 text-white"
                      : chat.type === "system"
                        ? "bg-transparent text-gray-500 text-xs w-full text-center"
                        : "bg-white border border-gray-200 text-gray-700 shadow-sm"
                  }`}
                >
                  {chat.text}
                </div>
                {chat.type === "user" && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center ml-2 flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2">
                  <span className="animate-pulse w-2 h-2 bg-indigo-500 rounded-full"></span>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-500 shadow-sm w-48">
                  {progress > 0 ? `Analyzing... ${progress}%` : "Thinking..."}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-white border-t">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="file"
                id="fileUpload"
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.docx,.txt,.eml"
              />
              <label
                htmlFor="fileUpload"
                className="cursor-pointer text-gray-400 hover:text-gray-600 p-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  ></path>
                </svg>
              </label>
              <form
                onSubmit={handleChatSubmit}
                className="flex-grow flex relative"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message or paste a complaint..."
                  className="w-full bg-gray-100 rounded-full pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                </button>
              </form>
            </div>
            <div className="text-center text-[10px] text-gray-400 uppercase tracking-widest font-semibold mt-2">
              AI can make mistakes. Please double check the response.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
