import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  frontImage: null,
  backImage: null,
  extractedText: "",
};

const cnicSlice = createSlice({
  name: "cnic",
  initialState,
  reducers: {
    setFrontImage: (state, action) => {
      state.frontImage = action.payload;
    },
    setBackImage: (state, action) => {
      state.backImage = action.payload;
    },
    setExtractedText: (state, action) => {
      state.extractedText = action.payload;
    },
  },
});

export const { setFrontImage, setBackImage, setExtractedText } =
  cnicSlice.actions;
export default cnicSlice.reducer;
