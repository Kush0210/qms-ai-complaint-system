import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  formData: {
    complaint_source: '', customer_name: '', product_name: '',
    product_strength: '', batch_number: '', affected_quantity: '', 
    manufacturing_date: '', expiry_date: '', originating_site_block: '',
    impacted_npm: '', complaint_category: '', complaint_description: '', 
    suggested_severity: '', suggested_next_action: '', initial_risk_assessment: ''
  },
  chatHistory: [
    { type: 'system', text: 'Drop complaint files or paste text below.' }
  ],
  isLoading: false,
  progress: 0,
};

const complaintSlice = createSlice({
  name: 'complaint',
  initialState,
  reducers: {
    updateFormData: (state, action) => {
      state.formData = { ...state.formData, ...action.payload };
    },
    addChatMessage: (state, action) => {
      state.chatHistory.push(action.payload);
    },
    resetForm: (state) => {
      state.formData = initialState.formData;
      state.chatHistory = [
        { type: 'system', text: 'Drop complaint files or paste text below.' }
      ];
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setProgress: (state, action) => {
      state.progress = action.payload;
    }
  },
});

export const { updateFormData, addChatMessage, resetForm, setLoading, setProgress } = complaintSlice.actions;
export default complaintSlice.reducer;