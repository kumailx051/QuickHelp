const express = require("express");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const cors = require("cors");
const path = require("path");

const app = express();

// Enable CORS for your frontend (if using React Native)
app.use(cors());

// Set up multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Store files in the 'uploads' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Use a unique filename
  },
});

const upload = multer({ storage: storage });

// Serve static files (uploaded images)
app.use("/uploads", express.static("uploads"));

// Endpoint to handle image upload and perform OCR
app.post("/extract-text", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image file uploaded" });
  }

  const imagePath = path.join(__dirname, "uploads", req.file.filename);

  // Use Tesseract.js to extract text from the uploaded image
  Tesseract.recognize(
    imagePath,
    "eng", // Language code (English)
    {
      logger: (info) => console.log(info), // Log progress
    }
  )
    .then((result) => {
      // Send extracted text back as response
      res.json({ text: result.data.text });
    })
    .catch((err) => {
      console.error("OCR error:", err);
      res.status(500).json({ message: "Failed to extract text from image" });
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
