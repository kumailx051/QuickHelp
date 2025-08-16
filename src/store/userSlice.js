import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  name: "",
  fatherName: "",
  cnic: "",
  dob: "",
  gender: "",
  country: "",
  temporaryAddress: "",
  permanentAddress: "",
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    updateField: (state, action) => {
      const { field, value } = action.payload;
      state[field] = value;
    },
    saveUserData: (state) => {
      const userData = { ...state };

      // Save user data to AsyncStorage for mobile apps
      AsyncStorage.setItem("userFormData", JSON.stringify(userData))
        .then(() => {
          console.log("User data saved");
        })
        .catch((error) => {
          console.error("Failed to save user data", error);
        });
    },
  },
});

export const { updateField, saveUserData } = userSlice.actions;
export default userSlice.reducer;
