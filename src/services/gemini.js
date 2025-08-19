// src/services/gemini.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize the Gemini client using the API key from your .env file
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

/**
 * This is your existing function. It synthesizes a single outfit description.
 * We will use this for the final generation step.
 * @param {Array<object>} imageFiles - Array of image file objects from multer.
 * @param {string} combinedItemsText - The text of the items the user selected.
 * @returns {Promise<string>} A single text description for a combined outfit.
 */
async function analyzeImagesWithGemini(imageFiles, combinedItemsText) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // The prompt now uses the user's selected items for more accuracy
    const prompt = `You are a fashion stylist. Create a single, complete, and stylish outfit description that creatively combines these items: ${combinedItemsText}.`;

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

/**
 * NEW: This function only identifies items and returns a list.
 * This is for the first step of the new workflow.
 * @param {Array<object>} imageFiles - Array of image file objects from multer.
 * @returns {Promise<Array<string>>} A promise that resolves to an array of item names.
 */
async function identifyItemsInImages(imageFiles) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analyze the following images and identify the primary clothing item in each one. 
    Return a simple list of the item names, separated by commas. 
    For example: "beige bomber jacket, blue denim jeans, faded denim baseball cap"`;

    const imageParts = imageFiles.map((file) => ({
      inlineData: {
        data: file.buffer.toString("base64"),
        mimeType: file.mimetype,
      },
    }));

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    // Clean up the text and split it into an array of strings
    return text
      .replace(/[*"\n]/g, "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  } catch (error) {
    console.error("Error identifying items with Gemini:", error);
    throw new Error("Failed to identify items with Gemini.");
  }
}

// Export both functions so they can be used by your routes
module.exports = { analyzeImagesWithGemini, identifyItemsInImages };
