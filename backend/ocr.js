// Import required packages
const sharp = require("sharp");
const Tesseract = require("tesseract.js");

async function preprocessImage(inputPath, outputPath) {
  try {
    await sharp(inputPath)
      .resize({ width: 800 }) // Resize the image to improve OCR speed
      .grayscale() // Convert to grayscale
      .toFile(outputPath); // Save the preprocessed image
    console.log(`Preprocessed image saved to ${outputPath}`);
  } catch (err) {
    console.error("Error preprocessing the image:", err);
  }
}

async function extractText(inputPath) {
  try {
    const result = await Tesseract.recognize(inputPath, "eng", {
      logger: (info) => console.log(info), // Log OCR process info
      config: "--psm 6 --oem 3",
    });

    console.log("Extracted Text:", result.data.text);
  } catch (error) {
    console.error("OCR Process Failed:", error);
  }
}

// Main function to run the workflow
(async () => {
  const inputImagePath = "./nic.jpg";
  const preprocessedImagePath = "./nic_preprocessed.png";

  // Preprocess the image
  await preprocessImage(inputImagePath, preprocessedImagePath);

  // Extract text from the preprocessed image
  await extractText(preprocessedImagePath);
})();
