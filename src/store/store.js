import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice"; // Your user slice
import cnicReducer from "./cnicSlice";
import profileReducer from "./profileSlice";

const store = configureStore({
  reducer: {
    user: userReducer, // Add your reducers here
    cnic: cnicReducer,
    profile: profileReducer,
  },
});

export default store;
