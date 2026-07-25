import os
import json
import fitz  # PyMuPDF
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from typing_extensions import TypedDict

# Load environment variables from the .env file
load_dotenv()

# --- APP SETUP ---
app = FastAPI(title="QMS Complaint API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize LLM
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is missing. Please check your .env file.")

llm = ChatGroq(temperature=0, groq_api_key=GROQ_API_KEY, model_name="llama-3.3-70b-versatile")

# --- STATE & SCHEMAS ---
class AgentState(TypedDict):
    input_text: str
    action_type: str # 'extract' or 'edit'
    current_data: Dict[str, Any]
    output_data: Dict[str, Any]

# --- UTILS ---
def clean_llm_json(text: str) -> str:
    """Helper function to strip markdown and filler text from LLM JSON output."""
    clean_text = text.strip()
    if clean_text.startswith("```json"):
        clean_text = clean_text[7:]
    elif clean_text.startswith("```"):
        clean_text = clean_text[3:]
    
    if clean_text.endswith("```"):
        clean_text = clean_text[:-3]
        
    return clean_text.strip()

# --- LANGGRAPH NODES ---
def extract_details_node(state: AgentState):
    prompt = f"""
    Extract pharmaceutical complaint details from the following text and output ONLY a raw, valid JSON object matching these keys: 
    complaint_source, customer_name, product_name, product_strength, batch_number, affected_quantity, manufacturing_date, expiry_date, originating_site_block, impacted_npm, complaint_category, complaint_description, ai_summary.
    
    INSTRUCTION FOR originating_site_block: Infer or extract the relevant facility block/department (e.g. "Manufacturing", "Packaging", "Quality Assurance", "Warehouse") based on the text. Default to "Manufacturing" if unspecified.
    
    CRITICAL INSTRUCTION: Include a key called "ai_summary". This should be a friendly, first-person conversational sentence summarizing what you extracted.
    
    Do not include any markdown formatting, backticks, or explanations.
    Text: {state['input_text']}
    """
    response = llm.invoke(prompt)
    
    try:
        clean_text = clean_llm_json(response.content)
        extracted = json.loads(clean_text)
        merged = {**state['current_data'], **extracted}
        return {"output_data": merged}
    except Exception as e:
        print(f"\n--- EXTRACTION PARSING ERROR ---")
        print(f"Error: {e}")
        print(f"Raw LLM Output: {response.content}\n")
        return {"output_data": state['current_data']}

def risk_assessment_node(state: AgentState):
    data = state.get('output_data', state['current_data'])
    prompt = f"""
    Based on this pharmaceutical complaint: "{data.get('complaint_description', '')}" for product "{data.get('product_name', '')}".
    Classify the initial risk and output ONLY a raw, valid JSON object with these exactly matching keys: 
    suggested_severity, suggested_next_action, initial_risk_assessment.
    
    Make the "initial_risk_assessment" a 1-2 sentence technical summary of the risk.
    Do not include any markdown formatting, backticks, or explanations.
    """
    response = llm.invoke(prompt)
    
    try:
        clean_text = clean_llm_json(response.content)
        assessment = json.loads(clean_text)
        data.update(assessment)
        return {"output_data": data}
    except Exception as e:
        print(f"\n--- RISK ASSESSMENT PARSING ERROR ---")
        print(f"Error: {e}")
        print(f"Raw LLM Output: {response.content}\n")
        return {"output_data": data}

def edit_complaint_node(state: AgentState):
    prompt = f"""
    The user wants to edit the following current complaint data based on their instruction.
    Current Data: {state['current_data']}
    User Instruction: {state['input_text']}
    Update the relevant fields. 
    
    CRITICAL INSTRUCTION: Include a key called "ai_summary" in the JSON. This should be a friendly, first-person conversational sentence confirming what you updated (e.g., "Got it. I have updated the Batch Number to X and the Quantity to Y.").
    
    Output ONLY a raw, valid JSON object. Do not include any markdown formatting or explanations.
    """
    response = llm.invoke(prompt)
    
    try:
        clean_text = clean_llm_json(response.content)
        updated = json.loads(clean_text)
        return {"output_data": updated}
    except Exception as e:
        print(f"\n--- EDIT PARSING ERROR ---")
        print(f"Error: {e}")
        print(f"Raw LLM Output: {response.content}\n")
        return {"output_data": state['current_data']}

# --- BUILD GRAPH ---
workflow = StateGraph(AgentState)
workflow.add_node("extract", extract_details_node)
workflow.add_node("risk_assess", risk_assessment_node)
workflow.add_node("edit", edit_complaint_node)

def route_action(state: AgentState):
    if state["action_type"] == "edit":
        return "edit"
    return "extract"

workflow.set_conditional_entry_point(route_action, {"extract": "extract", "edit": "edit"})
workflow.add_edge("extract", "risk_assess")
workflow.add_edge("risk_assess", END)
workflow.add_edge("edit", "risk_assess") 
app_graph = workflow.compile()

# --- API ENDPOINTS ---
@app.post("/api/chat")
async def chat_interaction(payload: dict):
    user_input = payload.get("message")
    current_data = payload.get("current_data", {})
    action = payload.get("action_type", "extract")

    initial_state = {
        "input_text": user_input,
        "action_type": action,
        "current_data": current_data,
        "output_data": {}
    }
    
    result = app_graph.invoke(initial_state)
    return {"status": "success", "data": result["output_data"]}

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    text = ""
    if file.filename.endswith(".pdf"):
        pdf_bytes = await file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page in doc:
            text += page.get_text()
    elif file.filename.endswith(".txt"):
        text = (await file.read()).decode("utf-8")
    
    initial_state = {
        "input_text": text,
        "action_type": "extract",
        "current_data": {},
        "output_data": {}
    }
    
    result = app_graph.invoke(initial_state)
    return {"status": "success", "data": result["output_data"]}