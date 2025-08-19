// src/services/gemini.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize the Gemini client using the API key from your .env file
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

/**
 * Analyzes multiple clothing item images and synthesizes a single outfit description.
 * @param {Array<object>} imageFiles - Array of image file objects from multer.
 * @returns {Promise<string>} A single text description for a combined outfit.
 */
async function analyzeImagesWithGemini(imageFiles) {
  try {
    // --- UPDATED: Use the correct, current model name ---
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a fashion stylist. Analyze the clothing items in the following images. 
    First, briefly identify each item. 
    Then, describe a single, complete, and stylish outfit that creatively combines these items. 
    Be concise and descriptive. For example: "A look combining the blue oversized denim jacket with the white graphic t-shirt and black jeans."`;

    const imageParts = imageFiles.map((file) => ({
      inlineData: {
        data: file.buffer.toString("base64"),
        mimeType: file.mimetype,
      },
    }));

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    return text.replace(/[*"\n]/g, "").trim();
  } catch (error) {
    console.error("Error analyzing images with Gemini:", error);
    throw new Error("Failed to analyze images with Gemini.");
  }
}

module.exports = { analyzeImagesWithGemini };
