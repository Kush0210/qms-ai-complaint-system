# AI-Powered Customer Complaint Management System

## Project Overview

This repository contains a full-stack Quality Management System (QMS) module for handling customer complaints in a regulated manufacturing environment. The app uses a FastAPI backend and a React frontend to:

- Extract complaint and product details from uploaded documents
- Populate a complaint form automatically
- Enable conversational form edits using AI instructions
- Generate a structured PDF complaint report
- Provide an initial AI-driven risk assessment

## Key Features

- **Document Extraction**
  - Upload PDF or TXT complaint documents
  - AI extracts relevant fields such as product name, batch number, quantity, expiry date, and complaint description
- **AI Chat Editing**
  - Send natural language instructions to update complaint fields
  - Backend updates the complaint state and returns a friendly AI summary
- **Risk Assessment**
  - AI evaluates the complaint description and suggests severity, next action, and an initial risk summary
- **PDF Report Export**
  - Generate a printable PDF report from populated complaint data
  - Includes sanitization of smart punctuation and non-ASCII characters

## Tech Stack

- **Frontend:** React, Redux Toolkit, Tailwind CSS v4, jsPDF, Axios
- **Backend:** Python, FastAPI, PyMuPDF, LangGraph, LangChain
- **LLM:** Groq (`llama-3.3-70b-versatile`)
- **Data storage:** Local app state (Redux)

---

## Repository Structure

```text
qms-ai-complaint-system/
├── backend/
│   ├── main.py             # FastAPI app, document upload, AI workflow endpoints
│   ├── requirements.txt    # Python dependencies list
│   └── .env                # create environment variables file here
└── frontend/
    ├── package.json        # frontend dependencies and scripts
    ├── public/
    │   └── index.html      # HTML shell
    └── src/
        ├── App.js          # main React UI and business logic
        ├── index.js        # React entry point, Redux provider
        ├── output.css      # generated Tailwind CSS bundle
        ├── store/
        │   ├── store.js
        │   └── complaintSlice.js
        └── index.css       # Tailwind input file
```

## Setup and Installation

### Prerequisites

- Node.js v18 or newer
- Python 3.10 or newer
- PostgreSQL (optional, if you want to use database-backed storage)
- Groq API key

### Backend Setup

1. Open a terminal and go to the backend folder:

```bash
cd backend
```

2. Create and activate a virtual environment:

```bash
python -m venv venv
venv\Scripts\activate
```

3. Install the required Python packages:

```bash
pip install -r requirements.txt
```

4. Create a `.env` file in `backend/` with your settings:

```env
GROQ_API_KEY=your_groq_api_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/qms_db
```

> Note: The current backend code does not require `DATABASE_URL` unless you add database logic later.

### Frontend Setup

1. Open a separate terminal and go to the frontend folder:

```bash
cd frontend
```

2. Install frontend dependencies:

```bash
npm install
```

3. Configure Tailwind CSS input/output if not already created:

- `src/index.css` should import Tailwind: `@import "tailwindcss";`
- `src/index.js` already imports `./output.css`

4. Start the Tailwind compiler in watch mode:

```bash
npx @tailwindcss/cli -i ./src/index.css -o ./src/output.css --watch
```

## Running the App

You need two terminals for local development:

### Terminal 1: Backend

```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload
```

The backend runs at `http://localhost:8000`.

### Terminal 2: Frontend

```bash
cd frontend
npm start
```

The React app runs at `http://localhost:3000`.

## API Endpoints

The frontend communicates with the backend using these endpoints:

- `POST /api/upload`
  - Accepts a file upload (`multipart/form-data`)
  - Extracts text from PDF or TXT
  - Returns extracted complaint fields as JSON
- `POST /api/chat`
  - Accepts `message`, `current_data`, and `action_type`
  - Returns updated complaint data and AI summary

## Notes

- The backend currently supports PDF and TXT uploads only.
- Document extraction and chat edits are handled by the Groq-powered AI workflow.
- The frontend stores complaint state in Redux and generates PDF reports using `jspdf`.
