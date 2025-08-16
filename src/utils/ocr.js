import Tesseract from "tesseract.js";

// Function to extract CNIC data
const extractCnicData = async (imageUri) => {
  try {
    const {
      data: { text },
    } = await Tesseract.recognize(imageUri, "eng", {
      logger: (m) => console.log(m), // For logging OCR progress
    });

    console.log("Extracted Text:", text);

    // Here, you can extract specific data like CNIC number using regex or other methods.
    const cnicRegex = /\d{5}-\d{7}-\d{1}/; // Assuming CNIC format is like "12345-1234567-1"
    const cnicMatch = text.match(cnicRegex);

    if (cnicMatch) {
      return cnicMatch[0]; // Return extracted CNIC
    }
    return null;
  } catch (error) {
    console.error("Error during OCR:", error);
    return null;
  }
};
