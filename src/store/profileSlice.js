// src/store/profileSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  profileImage: null,
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    setProfileImage: (state, action) => {
      state.profileImage = action.payload;
    },
  },
});

export const { setProfileImage } = profileSlice.actions;
export default profileSlice.reducer;
