// src/prompts/buildPrompt.js

const constants = require("./constants"); // Import the whole module to prevent circular dependencies
const {
  normalizeRace,
  complexionDescriptor,
  ethnicFeaturesFor,
  bmiDescriptor,
  statureDescriptor,
  poseAndExpressionFor,
  hairStyleFor,
} = require("./helpers");

// Helper function to get all style-specific details, including a RANDOM accessory
function getStyleDetails(style) {
  const styleData = constants.STYLE_PROMPTS[style];

  // Default fallback for styles not yet fully defined in the constants
  if (!styleData || !styleData.base || !styleData.accessories) {
    return {
      styleLine: style, // Use the style name itself as the base description
      accessoryLine: "accessories that complement the outfit",
      makeup: "Natural and appropriate for the style.",
    };
  }

  // Randomly select one accessory from the list to ensure variety
  const randomAccessory =
    styleData.accessories[
      Math.floor(Math.random() * styleData.accessories.length)
    ];

  // Define makeup specifics separately for clarity
  const makeupSpecifics = {
    Formal:
      "Clean, professional makeup with a neutral palette and defined features.",
    Streetwear: "Natural, fresh-faced makeup or a bold graphic eyeliner look.",
    Vintage:
      "Makeup appropriate for the era, such as a classic red lip or winged eyeliner.",
    Techwear: "Minimal to no makeup, focusing on a clean, functional look.",
    Grunge:
      "Smudged eyeliner, dark lipstick, and a purposefully unpolished look.",
    Bohemian: "Natural, sun-kissed makeup with earthy tones.",
    Y2K: "Glossy lips, frosted eyeshadow, and playful, colorful accents.",
    "Dark Academia":
      "Subtle, classic makeup with an emphasis on a clean, scholarly appearance.",
    Minimal: 'Barely-there, "no-makeup" makeup look with perfect skin.',
  };

  return {
    styleLine: styleData.base,
    accessoryLine: randomAccessory,
    makeup: makeupSpecifics[style] || "Natural and appropriate for the style.",
  };
}

function buildPrompt({
  gender,
  style,
  itemText,
  heightCm,
  weightKg,
  race,
  complexion,
}) {
  const raceLabel = normalizeRace(race);
  const ethnicityLine = ethnicFeaturesFor(raceLabel, complexion);
  const complexionLine = complexionDescriptor(complexion, race);
  const buildLine = bmiDescriptor(heightCm, weightKg, gender);
  const statureLine = statureDescriptor(heightCm, gender);
  const poseLine = poseAndExpressionFor(style);
  const hairLine = hairStyleFor(gender, raceLabel);

  // --- Get all style details from our helper function ---
  const { styleLine, accessoryLine, makeup } = getStyleDetails(style);

  // 1. Define the Role, Scene, and Mood
  const roleAndScene = `Act as a professional fashion photographer directing a photoshoot. Create an ultra-realistic, full-body fashion lookbook photograph.
The scene is a professional indoor studio with a seamless, solid medium-grey background (#bbbbbb) to make the subject pop.`;

  // 2. Describe the Model in Meticulous Detail
  const modelDescription = `**The Model:** A ${String(
    gender || "Unisex"
  ).toLowerCase()} person of ${raceLabel} heritage.
- **Appearance:** ${hairLine} ${makeup}
- **Physical Build:** ${statureLine}. ${buildLine}.
- **Facial Details:** ${ethnicityLine}. ${complexionLine}.
- **Pose and Expression:** The model is ${poseLine}`;

  // 3. Specify the Clothing and Accessories with Emphasis
  const clothingDescription = `**The Outfit:** A complete head-to-toe look in a cohesive ${style} style.
- **Main Focus:** The absolute main focus of the outfit is (${itemText}:1.4). This item must be perfectly rendered.
- **Styling:** The rest of the outfit should complement the main item perfectly within the ${styleLine} aesthetic.
- **Accessories:** Styled with ${accessoryLine}.`;

  // 4. Give Precise Technical Camera and Lighting Instructions
  const technicalDetails = `**Photography Specs:**
- **Camera & Lens:** Shot on a Sony A7 IV with a sharp 85mm f/1.4 lens.
- **Lighting:** Three-point studio lighting. A large, diffused key light (softbox) is positioned at a 45-degree angle to the model, a fill light on the opposite side to soften shadows, and a subtle rim light from behind to create separation from the background.
- **Aspect Ratio:** Portrait 3:4 (or 9:16) to provide vertical headroom and footroom.
- **Composition (STRICT):** A strict full-body fashion shot in vertical orientation. The model MUST be fully inside the frame with visible head, hair, torso, arms, legs, and shoes. Do NOT crop, zoom, or cut off any body parts. There must be at least **10% empty space** above the head/hair and **10% empty space** below the shoes to prevent accidental cropping. Feet must be clearly visible touching the studio floor. Leave a slight margin on both sides so arms and bag straps are never cut off.`;

  // 5. Final Quality Control and Art Direction
  const qualityControl = `**Final Image Quality:** The final output must be an ultra-high resolution, tack-sharp, professional photograph. Ensure extreme realism in skin texture, fabric detail, and how the clothing fits the model's specified body type.`;

  // 6. Append a hard negative prompt so the model never crops or zooms in
  const negatives = `**Negative Prompt:** ${constants.NEGATIVE_PROMPT}`;

  // Combine all parts into the final prompt
  const promptParts = [
    roleAndScene,
    modelDescription,
    clothingDescription,
    technicalDetails,
    qualityControl,
    negatives,
  ];

  return promptParts.filter(Boolean).join("\n\n"); // Use double newlines for better structure
}

module.exports = { buildPrompt };