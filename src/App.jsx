import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Clock3,
  Cloud,
  GripVertical,
  Link2,
  ListChecks,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  ShoppingCart,
  Shuffle,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { hasSupabaseConfig, supabase } from "./lib/supabase";


import Tesseract from "tesseract.js";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const STORE_LOCATION_OPTIONS = [
  "Dairy",
  "Meat",
  "Produce",
  "Seasonings",
  "Frozens",
  "Pasta",
  "Oils",
  "Aisles"
];

const STORAGE_KEY = "recipe-planner-starter-v1";

const starterRecipes = [
  {
    id: "spaghetti",
    name: "Spaghetti Bolognese",
    imageData: "",
    rarity: 5,
    time: 35,
    ingredients: [
      { text: "1 lb ground beef", locationTag: "Meat" },
      { text: "1 jar tomato sauce", locationTag: "Pasta aisle" },
      { text: "12 oz spaghetti", locationTag: "Pasta aisle" },
      { text: "1 onion", locationTag: "Produce" }
    ],
    steps: [
      "Boil water and cook the spaghetti.",
      "Brown the beef.",
      "Add sauce and simmer.",
      "Serve over pasta."
    ]
  },
  {
    id: "curry",
    name: "Chicken Curry",
    imageData: "",
    rarity: 4,
    time: 40,
    ingredients: [
      { text: "2 chicken breasts", locationTag: "Meat" },
      { text: "1 onion", locationTag: "Produce" },
      { text: "2 tbsp curry paste", locationTag: "International" },
      { text: "1 can coconut milk", locationTag: "International" }
    ],
    steps: [
      "Cook onion until soft.",
      "Add chicken and brown lightly.",
      "Add curry paste and coconut milk.",
      "Simmer until cooked through."
    ]
  }
];

function cardClass(extra = "") {
  return `card ${extra}`.trim();
}

function buttonClass(kind = "primary") {
  return kind === "secondary" ? "btn btn-secondary" : "btn btn-primary";
}

function badgeClass() {
  return "badge";
}

function inputClass() {
  return "input";
}

function textareaClass() {
  return "textarea";
}

function weightedPick(pool) {
  const totalWeight = pool.reduce((sum, recipe) => sum + recipe.rarity, 0);
  let target = Math.random() * totalWeight;
  for (const recipe of pool) {
    target -= recipe.rarity;
    if (target <= 0) return recipe;
  }
  return pool[pool.length - 1];
}

function normalizeIngredient(item) {
  if (typeof item === "string") {
    return { text: item, locationTag: "" };
  }
  return {
    text: item?.text || "",
    locationTag: item?.locationTag || ""
  };
}

const applyOcrPreviewToForm = () => {
  if (!ocrPreview) return;

  setNewRecipe((current) => ({
    ...current,
    name: ocrPreview.name || current.name,
    time: ocrPreview.time || current.time,
    ingredientsText: ocrPreview.ingredientsText || current.ingredientsText,
    ingredientTagsText:
      ocrPreview.ingredientTagsText || current.ingredientTagsText,
    stepsText: ocrPreview.stepsText || current.stepsText
  }));

  setOcrPreview(null);
  setImportStatus("Recipe preview applied to the form.");
};

const discardOcrPreview = () => {
  setOcrPreview(null);
  setImportStatus("Image import preview discarded.");
};

const updateOcrPreviewField = (field, value) => {
  setOcrPreview((current) =>
    current
      ? {
          ...current,
          [field]: value
        }
      : current
  );
};


function normalizeRecipe(recipe) {
  return {
    ...recipe,
    imageData: recipe?.imageData || "",
    ingredients: Array.isArray(recipe.ingredients)
      ? recipe.ingredients.map(normalizeIngredient)
      : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : []
  };
}

function toSevenDayPlan(plan, mealCount) {
  const normalized = Array.isArray(plan)
    ? plan.map((item) => (item ? normalizeRecipe(item) : null))
    : [];
  return DAYS.map((_, index) => (index < mealCount ? normalized[index] || null : null));
}

function preserveSevenDayPlan(plan) {
  const normalized = Array.isArray(plan)
    ? plan.map((item) => (item ? normalizeRecipe(item) : null))
    : [];

  return DAYS.map((_, index) => normalized[index] || null);
}

function parseAmountToken(token) {
  if (!token) return null;
  if (token.includes("/")) {
    const [numerator, denominator] = token.split("/").map(Number);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      return null;
    }
    return numerator / denominator;
  }
  const value = Number(token);
  return Number.isFinite(value) ? value : null;
}

function formatScaledAmount(value) {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/\.00$/, "").replace(/0$/, "");
}

function parseIngredientParts(ingredient) {
  const sourceText = typeof ingredient === "string" ? ingredient : ingredient?.text || "";
  const locationTag = typeof ingredient === "string" ? "" : ingredient?.locationTag || "";
  const trimmed = sourceText.trim();
  const parts = trimmed.split(/\s+/);

  if (!trimmed || parts.length === 0) {
    return {
      originalText: sourceText,
      locationTag,
      quantity: null,
      unit: "",
      name: "",
      normalizedKey: ""
    };
  }

  const first = parseAmountToken(parts[0]);
  if (first === null) {
    return {
      originalText: sourceText,
      locationTag,
      quantity: null,
      unit: "",
      name: trimmed,
      normalizedKey: trimmed.toLowerCase()
    };
  }

  let amount = first;
  let cursor = 1;
  const second = parseAmountToken(parts[1]);

  if (second !== null && parts[1] && parts[1].includes("/")) {
    amount += second;
    cursor = 2;
  }

  const unit = parts[cursor] || "";
  const nameParts = parts.slice(cursor + 1);
  const hasName = nameParts.length > 0;
  const name = hasName ? nameParts.join(" ") : unit;

  return {
    originalText: sourceText,
    locationTag,
    quantity: amount,
    unit: hasName ? unit : "",
    name,
    normalizedKey: `${unit.toLowerCase()}|${name.toLowerCase()}`
  };
}

function scaleIngredientLine(ingredient, multiplier) {
  const parsed = parseIngredientParts(ingredient);
  if (parsed.quantity === null) return parsed.originalText;
  const scaled = formatScaledAmount(parsed.quantity * multiplier);
  const suffix = [parsed.unit, parsed.name].filter(Boolean).join(" ");
  return suffix ? `${scaled} ${suffix}` : scaled;
}

function buildGroceryList(weeklyPlan, recipeServings, ingredientChecks = {}, getIngredientCheckKey) {
  const grouped = new Map();

  weeklyPlan.filter(Boolean).forEach((recipe, planIndex) => {
    const servings = recipeServings[recipe.id] || 1;
    const day = DAYS[planIndex];
    const checkKey =
      typeof getIngredientCheckKey === "function"
        ? getIngredientCheckKey(recipe, day, servings)
        : "";
    const checkedMap = checkKey ? ingredientChecks[checkKey] || {} : {};

    (recipe.ingredients || []).forEach((ingredient, ingredientIndex) => {
      const parsed = parseIngredientParts(ingredient);
      const keyBase = parsed.normalizedKey || parsed.originalText.toLowerCase();
      const alreadyHave = Boolean(checkedMap[ingredientIndex]);
      const key = `${alreadyHave ? "already-have" : "need"}::${keyBase}`;
      const existing = grouped.get(key);
      const effectiveLocationTag = alreadyHave ? "Already Have" : parsed.locationTag;

      if (parsed.quantity !== null) {
        const scaledQuantity = parsed.quantity * servings;
        if (existing && existing.quantity !== null) {
          existing.quantity += scaledQuantity;
        } else if (!existing) {
          grouped.set(key, {
            quantity: scaledQuantity,
            unit: parsed.unit,
            name: parsed.name,
            locationTag: effectiveLocationTag,
            texts: []
          });
        }
      } else {
        const scaledText = scaleIngredientLine(ingredient, servings);
        if (existing) {
          if (!existing.texts.includes(scaledText)) existing.texts.push(scaledText);
        } else {
          grouped.set(key, {
            quantity: null,
            unit: "",
            name: "",
            locationTag: effectiveLocationTag,
            texts: [scaledText]
          });
        }
      }
    });
  });

  return Array.from(grouped.values())
    .flatMap((item) => {
      if (item.quantity !== null) {
        return [{
          text: [formatScaledAmount(item.quantity), item.unit, item.name]
            .filter(Boolean)
            .join(" "),
          locationTag: item.locationTag
        }];
      }
      return item.texts.map((text) => ({
        text,
        locationTag: item.locationTag
      }));
    })
    .sort((a, b) => {
      if (a.locationTag === "Already Have" && b.locationTag !== "Already Have") return 1;
      if (a.locationTag !== "Already Have" && b.locationTag === "Already Have") return -1;

      const tagCompare = (a.locationTag || "").localeCompare(b.locationTag || "");
      if (tagCompare !== 0) return tagCompare;
      return a.text.localeCompare(b.text);
    });
}

function pickSingleRecipe(recipes, excludedIds = [], remainingTime = 0) {
  const validRecipes = recipes.filter((recipe) => {
    const notExcluded = !excludedIds.includes(recipe.id);
    const validTime = remainingTime <= 0 || recipe.time <= remainingTime;

    return (
      recipe.name.trim() &&
      Number(recipe.rarity) > 0 &&
      Number(recipe.time) > 0 &&
      notExcluded &&
      validTime
    );
  });

  if (validRecipes.length === 0) {
    const fallbackRecipes = recipes.filter(
      (recipe) =>
        recipe.name.trim() &&
        Number(recipe.rarity) > 0 &&
        Number(recipe.time) > 0 &&
        !excludedIds.includes(recipe.id)
    );

    if (fallbackRecipes.length === 0) return null;
    return weightedPick(fallbackRecipes);
  }

  return weightedPick(validRecipes);
}

function generatePlan(recipes, mealCount, maxWeeklyTime) {
  const validRecipes = recipes.filter(
    (r) => r.name.trim() && Number(r.rarity) > 0 && Number(r.time) > 0
  );

  if (validRecipes.length === 0) return [];

  const targetCount = Math.min(mealCount, validRecipes.length);
  let bestPlan = [];
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < 300; attempt += 1) {
    const selected = [];
    const usedIds = new Set();
    let timeTotal = 0;
    let candidatePool = [...validRecipes];

    while (selected.length < targetCount && candidatePool.length > 0) {
      const choice = weightedPick(candidatePool);
      candidatePool = candidatePool.filter((r) => r.id !== choice.id);

      if (usedIds.has(choice.id)) continue;

      const projectedTime = timeTotal + choice.time;
      const withinTime =
        maxWeeklyTime <= 0 || projectedTime <= maxWeeklyTime || selected.length === 0;

      if (withinTime) {
        selected.push(choice);
        usedIds.add(choice.id);
        timeTotal += choice.time;
      }
    }

    const rarityScore = selected.reduce((sum, r) => sum + r.rarity, 0);
    const completenessBonus = selected.length * 100;
    const timePenalty =
      maxWeeklyTime > 0 && timeTotal > maxWeeklyTime
        ? (timeTotal - maxWeeklyTime) * 10
        : 0;

    const score = completenessBonus + rarityScore - timePenalty;

    if (score > bestScore) {
      bestScore = score;
      bestPlan = selected;
    }
  }

  return bestPlan;
}

function localFallbackState() {
  return {
    recipes: starterRecipes,
    mealCount: 5,
    maxWeeklyTime: 240,
    weeklyPlan: toSevenDayPlan(generatePlan(starterRecipes, 5, 240), 5),
    recipeServings: {},
    ingredientChecks: {}
  };
}

function loadInitialState() {
  if (typeof window === "undefined") return localFallbackState();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return localFallbackState();

    const parsed = JSON.parse(raw);
    const recipes =
      Array.isArray(parsed.recipes) && parsed.recipes.length > 0
        ? parsed.recipes.map(normalizeRecipe)
        : starterRecipes;
    const mealCount = Number(parsed.mealCount) || 5;
    const maxWeeklyTime = Number.isFinite(parsed.maxWeeklyTime) ? parsed.maxWeeklyTime : 240;
    const weeklyPlan = Array.isArray(parsed.weeklyPlan)
      ? preserveSevenDayPlan(parsed.weeklyPlan)
      : toSevenDayPlan(generatePlan(recipes, mealCount, maxWeeklyTime), mealCount);
    const recipeServings =
      parsed.recipeServings && typeof parsed.recipeServings === "object"
        ? parsed.recipeServings
        : {};
    const ingredientChecks =
      parsed.ingredientChecks && typeof parsed.ingredientChecks === "object"
        ? parsed.ingredientChecks
        : {};

return { recipes, mealCount, maxWeeklyTime, weeklyPlan, recipeServings, ingredientChecks };

 
  } catch {
    return localFallbackState();
  }
}

function fileToDataUrl(
  file,
  { maxWidth = 1400, maxHeight = 1400, quality = 0.82 } = {}
) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(maxWidth / width, maxHeight / height, 1);

        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to create canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const compressed = canvas.toDataURL(
          outputType,
          outputType === "image/png" ? undefined : quality
        );

        resolve(compressed);
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = typeof reader.result === "string" ? reader.result : "";
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function firstText(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstText(item);
      if (found) return found;
    }
    return "";
  }
  if (typeof value === "object") {
    return firstText(
      value.text ||
      value.name ||
      value["@value"] ||
      value.caption ||
      value.description ||
      value.url
    );
  }
  return "";
}

function normalizeInstructionStep(step) {
  if (!step) return "";
  if (typeof step === "string") return step.trim();
  if (Array.isArray(step)) {
    return step.map(normalizeInstructionStep).filter(Boolean).join(" ").trim();
  }
  if (typeof step === "object") {
    if (step["@type"] === "HowToSection" && Array.isArray(step.itemListElement)) {
      return step.itemListElement.map(normalizeInstructionStep).filter(Boolean).join(" ").trim();
    }
    return firstText(step.text || step.name || step.itemListElement || step.description);
  }
  return "";
}

function normalizeRecipeImage(image) {
  if (!image) return "";
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return normalizeRecipeImage(image[0]);
  if (typeof image === "object") return firstText(image.url || image.contentUrl || image.thumbnailUrl);
  return "";
}

function collectRecipeCandidates(node) {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap(collectRecipeCandidates);
  if (typeof node !== "object") return [];

  const typeValue = node["@type"];
  const types = Array.isArray(typeValue) ? typeValue : [typeValue];
  let results = [];

  if (types.filter(Boolean).includes("Recipe")) {
    results.push(node);
  }

  const nestedKeys = ["@graph", "itemListElement", "mainEntity", "mainEntityOfPage", "hasPart"];
  nestedKeys.forEach((key) => {
    if (node[key]) results = results.concat(collectRecipeCandidates(node[key]));
  });

  return results;
}

function parseRecipeFromHtml(html, sourceUrl = "") {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));

  const candidates = [];
  scripts.forEach((script) => {
    try {
      const parsed = JSON.parse(script.textContent || "null");
      candidates.push(...collectRecipeCandidates(parsed));
    } catch {
      // ignore bad JSON-LD
    }
  });

  let recipeData = candidates.find((candidate) => firstText(candidate.name));

  if (!recipeData) {
    const ingredientNodes = Array.from(doc.querySelectorAll('[itemprop="recipeIngredient"]'));
    const instructionNodes = Array.from(
      doc.querySelectorAll(
        '[itemprop="recipeInstructions"] li, [itemprop="recipeInstructions"] p, .wprm-recipe-instruction-text, .instruction, .directions li'
      )
    );
    const title =
      doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
      doc.title ||
      "";

    if (ingredientNodes.length > 0 || instructionNodes.length > 0) {
      recipeData = {
        name: title,
        image: doc.querySelector('meta[property="og:image"]')?.getAttribute("content") || "",
        recipeIngredient: ingredientNodes.map((node) => node.textContent?.trim()).filter(Boolean),
        recipeInstructions: instructionNodes.map((node) => node.textContent?.trim()).filter(Boolean),
      };
    }
  }

  if (!recipeData) {
    throw new Error("Could not find a recipe on that page.");
  }

  const name = firstText(recipeData.name) || "Imported Recipe";
  const imageUrl = normalizeRecipeImage(recipeData.image);
  const ingredients = (Array.isArray(recipeData.recipeIngredient) ? recipeData.recipeIngredient : [])
    .map((item) => firstText(item))
    .filter(Boolean)
    .map((text) => ({ text, locationTag: "" }));
  const steps = (Array.isArray(recipeData.recipeInstructions) ? recipeData.recipeInstructions : [recipeData.recipeInstructions])
    .map(normalizeInstructionStep)
    .filter(Boolean);
  const totalTimeText = firstText(recipeData.totalTime || recipeData.cookTime || recipeData.prepTime);
  const timeMatch = totalTimeText.match(/(\d+)/);
  const time = timeMatch ? Math.max(1, Number(timeMatch[1])) : "";

  return {
    name,
    imageUrl,
    time,
    ingredients,
    steps,
    sourceUrl,
  };
}

async function fetchRecipeHtml(url) {
  const targets = [
    url,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];

  for (const target of targets) {
    try {
      const response = await fetch(target);
      if (!response.ok) continue;
      const text = await response.text();
      if (text && text.length > 200) return text;
    } catch {
      // try next
    }
  }

  throw new Error("Unable to fetch that recipe URL. Some recipe sites block browser imports.");
}


function cleanOcrLine(line) {
  return line
    .replace(/[•·●◦▪■]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRecipeFromImageText(rawText) {
  const text = rawText.replace(/\r/g, "");
  const lines = text
    .split("\n")
    .map(cleanOcrLine)
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("Could not read any recipe text from that image.");
  }

  const lowerLines = lines.map((line) => line.toLowerCase());

  const findSectionIndex = (keywords) =>
    lowerLines.findIndex((line) => keywords.some((keyword) => line.includes(keyword)));

  const ingredientsIndex = findSectionIndex(["ingredients"]);
  const instructionsIndex = findSectionIndex([
    "instructions",
    "directions",
    "method",
    "steps",
    "preparation"
  ]);

  let name = lines[0] || "Imported Recipe";

  const timeLine =
    lines.find((line) =>
      /(\d+)\s*(min|mins|minutes|hour|hours|hr|hrs)/i.test(line)
    ) || "";

  let time = "";
  const timeMatch = timeLine.match(/(\d+)/);
  if (timeMatch) {
    time = String(Math.max(1, Number(timeMatch[1])));
  }

  let ingredientLines = [];
  let stepLines = [];

  if (ingredientsIndex !== -1 && instructionsIndex !== -1) {
    const start = Math.min(ingredientsIndex, instructionsIndex);
    const end = Math.max(ingredientsIndex, instructionsIndex);

    if (ingredientsIndex < instructionsIndex) {
      ingredientLines = lines.slice(ingredientsIndex + 1, instructionsIndex);
      stepLines = lines.slice(instructionsIndex + 1);
    } else {
      stepLines = lines.slice(instructionsIndex + 1, ingredientsIndex);
      ingredientLines = lines.slice(ingredientsIndex + 1);
    }
  } else if (ingredientsIndex !== -1) {
    ingredientLines = lines.slice(ingredientsIndex + 1);
  } else if (instructionsIndex !== -1) {
    stepLines = lines.slice(instructionsIndex + 1);
  } else {
    const splitPoint = Math.max(2, Math.floor(lines.length * 0.45));
    ingredientLines = lines.slice(1, splitPoint);
    stepLines = lines.slice(splitPoint);
  }

  ingredientLines = ingredientLines
    .map(cleanOcrLine)
    .filter(Boolean)
    .filter((line) => !/^(ingredients|instructions|directions|method|steps)$/i.test(line));

  stepLines = stepLines
    .map((line) => line.replace(/^\d+[\.\)]\s*/, "").trim())
    .map(cleanOcrLine)
    .filter(Boolean)
    .filter((line) => !/^(ingredients|instructions|directions|method|steps)$/i.test(line));

  if (!ingredientLines.length && !stepLines.length) {
    throw new Error("Could not confidently detect ingredients or steps from that image.");
  }

  return {
    name,
    time,
    ingredientsText: ingredientLines.join("\n"),
    ingredientTagsText: ingredientLines.map(() => "").join("\n"),
    stepsText: stepLines.join("\n")
  };
}

function RecipeEditorRow({ recipe, onSave, onDelete, isSelectedForExport,onToggleSelectedForExport }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(recipe);

  useEffect(() => setDraft(recipe), [recipe]);

  const updateIngredientField = (value) => {
    const currentTags = (draft.ingredients || []).map((item) => normalizeIngredient(item).locationTag);
    setDraft((current) => ({
      ...current,
      ingredients: value.split("\n").map((line, index) => ({
        text: line,
        locationTag: currentTags[index] || ""
      }))
    }));
  };

 const updateIngredientTags = (value) => {
    const currentTexts = (draft.ingredients || []).map((item) => normalizeIngredient(item).text);
    setDraft((current) => ({
      ...current,
      ingredients: value.split("\n").map((line, index) => ({
        text: currentTexts[index] || "",
        locationTag: line
      }))
    }));
  };

  const saveChanges = () => {
    if (!draft.name.trim()) return;
    onSave({
      ...draft,
      name: draft.name.trim(),
      imageData: draft.imageData || "",
      rarity: Math.max(1, Math.min(5, Number(draft.rarity) || 1)),
      time: Math.max(1, Number(draft.time) || 1),
      ingredients: (draft.ingredients || [])
        .map(normalizeIngredient)
        .map((item) => ({ text: item.text.trim(), locationTag: item.locationTag.trim() }))
        .filter((item) => item.text),
      steps: (draft.steps || []).map((item) => item.trim()).filter(Boolean)
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <motion.div layout className={cardClass()}>
        <div className="grid-4">
          <div>
            <LabelBox>Name</LabelBox>
            <input className={inputClass()} value={draft.name} onChange={(e) => setDraft((c) => ({ ...c, name: e.target.value }))} />
          </div>
          <div>
            <LabelBox>Rarity</LabelBox>
            <input className={inputClass()} type="number" min="1" max="5" value={draft.rarity} onChange={(e) => setDraft((c) => ({ ...c, rarity: Math.max(1, Math.min(5, Number(e.target.value) || 1)) }))} />
          </div>
          <div>
            <LabelBox>Time (min)</LabelBox>
            <input className={inputClass()} type="number" min="1" value={draft.time} onChange={(e) => setDraft((c) => ({ ...c, time: Math.max(1, Number(e.target.value) || 1) }))} />
          </div>
          <div className="actions-end">
            <button className={buttonClass()} onClick={saveChanges}><Save size={16} /> Save</button>
          </div>
        </div>

        <div className="mt-16">
          <LabelBox>Meal image</LabelBox>
          {draft.imageData ? <img className="recipe-image recipe-image-preview" src={draft.imageData} alt={draft.name || "Recipe preview"} /> : null}
          <input
            className={inputClass()}
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const imageData = await fileToDataUrl(file);
              setDraft((c) => ({ ...c, imageData }));
              e.target.value = "";
            }}
          />
        </div>

        <div className="grid-3 mt-16">
          <div>
            <LabelBox>Ingredients</LabelBox>
            <textarea className={textareaClass()} value={(draft.ingredients || []).map((item) => normalizeIngredient(item).text).join("\n")} onChange={(e) => updateIngredientField(e.target.value)} />
          </div>
          <div>
            <LabelBox>Store locations</LabelBox>
            <div className="stack-8">
              {(draft.ingredients || []).map((item, index) => {
                const ingredient = normalizeIngredient(item);
                if (!ingredient.text.trim()) return null;

                return (
                  <div key={index} className="row-between gap-8">
                    <div className="muted">{ingredient.text}</div>
                    <select
                      className={inputClass()}
                      value={ingredient.locationTag || ""}
                      onChange={(e) => {
                        setDraft((current) => ({
                          ...current,
                          ingredients: (current.ingredients || []).map((ing, i) =>
                            i === index
                              ? { ...normalizeIngredient(ing), locationTag: e.target.value }
                              : normalizeIngredient(ing)
                          )
                        }));
                      }}
                    >
                      <option value="">Select</option>
                      {STORE_LOCATION_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <LabelBox>Steps</LabelBox>
            <textarea className={textareaClass()} value={(draft.steps || []).join("\n")} onChange={(e) => setDraft((c) => ({ ...c, steps: e.target.value.split("\n") }))} />
          </div>
        </div>

        <div className="row gap-8 mt-16">
          <button className={buttonClass("secondary")} onClick={() => setIsEditing(false)}>
            <X size={16} /> Cancel
          </button>
          <button className={buttonClass("secondary")} onClick={() => onDelete(recipe.id)}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div layout className={`${cardClass()} row-between wrap gap-12`}>
      <div className="row gap-10">
        <label className="recipe-select-checkbox">
          <input
            type="checkbox"
            checked={Boolean(isSelectedForExport)}
            onChange={onToggleSelectedForExport}
          />
        </label>

        <div>

            </div>
          </div>

          <div className="row gap-8">

        <div className="title-sm">{recipe.name}</div>
        <div className="muted mt-6 row wrap gap-10">
          <span className="row gap-6"><Clock3 size={16} /> {recipe.time} min</span>
          <span>Rarity: {recipe.rarity}</span>
          <span>Ingredients: {(recipe.ingredients || []).length}</span>
          <span>Steps: {(recipe.steps || []).length}</span>
        </div>
      </div>
      <div className="row gap-8">
        <button className={buttonClass("secondary")} onClick={() => setIsEditing(true)}>
          <Pencil size={16} /> Edit
        </button>
        <button className={buttonClass("secondary")} onClick={() => onDelete(recipe.id)}>
          <Trash2 size={16} /> Delete
        </button>
      </div>
    </motion.div>
  );
}

function GroceryListModal({ items, onClose }) {
  if (!items) return null;

  const groupedByTag = items.reduce((acc, item) => {
    const key = item.locationTag || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item.text);
    return acc;
  }, {});

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <div className="row-between gap-12">
          <div>
            <div className="muted">Current week</div>
            <h2 className="title-lg mt-6">Grocery list</h2>
          </div>
          <button className={buttonClass("secondary")} onClick={onClose}>Close</button>
        </div>

        <div className="stack-20 mt-20">
          {Object.keys(groupedByTag).length === 0 ? (
            <p className="muted">No scheduled meals yet.</p>
          ) : (
            Object.entries(groupedByTag).map(([tag, texts]) => (
  <div
    key={tag}
    className={tag === "Already Have" ? "grocery-section-already-have" : ""}
  >
    <h3 className="title-md">{tag}</h3>
    <ul className="list mt-10">
      {texts.map((text, index) => (
        <li key={`${tag}-${index}`}>{text}</li>
      ))}
    </ul>
  </div>
))
          )}
        </div>
      </div>
    </div>
  );
}

function MealDetailModal({
  recipe,
  day,
  onClose,
  servings,
  onServingsChange,
  checkedIngredients,
  onToggleIngredient
}) {
  if (!recipe) return null;

  const scaledIngredients = (recipe.ingredients || []).map((ingredient) =>
    scaleIngredientLine(ingredient, servings)
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <div className="row-between gap-12">
          <div>
            <div className="muted">{day}</div>
            <h2 className="title-lg mt-6">{recipe.name}</h2>
            <div className="muted mt-6">{recipe.time} min</div>
          </div>
          <button className={buttonClass("secondary")} onClick={onClose}>Close</button>
        </div>

        <div className="stack-20 mt-20">
          {recipe.imageData ? (
            <img className="recipe-image" src={recipe.imageData} alt={recipe.name} />
          ) : null}

          <div className="surface">
            <div className="row-between gap-12">
              <div>
                <div className="title-sm">Servings</div>
                <div className="muted">Ingredient quantities scale automatically.</div>
              </div>
              <span className={badgeClass()}>{servings}x</span>
            </div>
            <input
              className="slider mt-12"
              type="range"
              min="1"
              max="6"
              step="1"
              value={servings}
              onChange={(e) => onServingsChange(Number(e.target.value))}
            />
          </div>

          <div>
            <h3 className="title-md">Ingredients</h3>
            <ul className="ingredient-checklist mt-10">
              {scaledIngredients.map((ingredient, index) => {
                const isChecked = Boolean(checkedIngredients?.[index]);

                return (
                  <li
                    key={`${recipe.id}-ingredient-${index}`}
                    className="ingredient-checklist-item"
                  >
                    <label className="ingredient-checklist-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleIngredient(index)}
                      />
                      <span
                        className={
                          isChecked
                            ? "ingredient-text ingredient-text-checked"
                            : "ingredient-text"
                        }
                      >
                        {ingredient}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h3 className="title-md">Instructions</h3>
            <ol className="list-number mt-10">
              {(recipe.steps || []).map((step, index) => (
                <li key={`${recipe.id}-step-${index}`}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabelBox({ children }) {
  return <label className="label">{children}</label>;
}

function AuthCard({ user, onSignIn, onSignOut }) {
  return (
    <div className={cardClass("row-between wrap gap-12")}>
      <div>
        <div className="row gap-8 title-sm"><Cloud size={16} /> Account sync</div>
        {user ? (
          <div className="muted mt-6">
            Signed in as <strong>{user.email}</strong>. Your recipes sync across devices.
          </div>
        ) : (
          <div className="muted mt-6">
            Sign in with Google to sync your personal recipes across devices.
          </div>
        )}
      </div>

      <div>
        {user ? (
          <button className={buttonClass("secondary")} onClick={onSignOut}>
            <LogOut size={16} /> Sign out
          </button>
        ) : (
          <button className={buttonClass()} onClick={onSignIn} disabled={!hasSupabaseConfig}>
            <LogIn size={16} /> Sign in with Google
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const initialState = useMemo(() => loadInitialState(), []);
  const [recipes, setRecipes] = useState(initialState.recipes);
  const [mealCount, setMealCount] = useState(initialState.mealCount);
  const [maxWeeklyTime, setMaxWeeklyTime] = useState(initialState.maxWeeklyTime);
  const [weeklyPlan, setWeeklyPlan] = useState(initialState.weeklyPlan);
  const [recipeServings, setRecipeServings] = useState(initialState.recipeServings);
  const [activeTab, setActiveTab] = useState("planner");
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [showGroceryList, setShowGroceryList] = useState(false);
  const [draggedMealIndex, setDraggedMealIndex] = useState(null);
  const [regenDayIndex, setRegenDayIndex] = useState(0);
  const [user, setUser] = useState(null);

  const [isImportingRecipeImage, setIsImportingRecipeImage] = useState(false);
  const [ocrPreview, setOcrPreview] = useState(null);

  const [hasLoadedCloudData, setHasLoadedCloudData] = useState(false);

  const [ingredientChecks, setIngredientChecks] = useState(
  initialState.ingredientChecks || {}
);

  const [newRecipe, setNewRecipe] = useState({
    name: "",
    imageData: "",
    rarity: "",
    time: "",
    ingredientsText: "",
    ingredientTagsText: "",
    stepsText: ""
  });


const [recipeImportSummary, setRecipeImportSummary] = useState("");


const [selectedExportRecipeIds, setSelectedExportRecipeIds] = useState({});

  const [importUrl, setImportUrl] = useState("");
const [importStatus, setImportStatus] = useState("");
const [isImportingRecipe, setIsImportingRecipe] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        recipes,
        mealCount,
        maxWeeklyTime,
        weeklyPlan: preserveSevenDayPlan(weeklyPlan),
        recipeServings,
        ingredientChecks
      })
    );
  }, [recipes, mealCount, maxWeeklyTime, weeklyPlan, recipeServings, ingredientChecks]);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setHasLoadedCloudData(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !user) return;

    let cancelled = false;

    async function loadCloudData() {
  const { data, error } = await supabase
    .from("user_recipe_plans")
    .select("recipes, meal_count, max_weekly_time, weekly_plan, recipe_servings, ingredient_checks")
    .eq("user_id", user.id)
    .maybeSingle();

  if (cancelled || error) {
    if (!cancelled) setHasLoadedCloudData(true);
    return;
  }

  if (data) {
    const nextRecipes =
      Array.isArray(data.recipes) && data.recipes.length > 0
        ? data.recipes.map(normalizeRecipe)
        : starterRecipes;

    setIngredientChecks(
      data.ingredient_checks && typeof data.ingredient_checks === "object"
        ? data.ingredient_checks
        : {}
    );

    const nextMealCount = Number(data.meal_count) || 5;
    const nextMaxWeeklyTime = Number.isFinite(data.max_weekly_time)
      ? data.max_weekly_time
      : 240;

    setRecipes(nextRecipes);
    setMealCount(nextMealCount);
    setMaxWeeklyTime(nextMaxWeeklyTime);
    setWeeklyPlan(preserveSevenDayPlan(data.weekly_plan || []));
    setRecipeServings(
      data.recipe_servings && typeof data.recipe_servings === "object"
        ? data.recipe_servings
        : {}
    );
  }

  setHasLoadedCloudData(true);
}

    loadCloudData();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!supabase || !user || !hasLoadedCloudData) return;

    const timeout = setTimeout(async () => {
      await supabase.from("user_recipe_plans").upsert(
        {
          user_id: user.id,
          recipes,
          meal_count: mealCount,
          max_weekly_time: maxWeeklyTime,
          weekly_plan: preserveSevenDayPlan(weeklyPlan),
          recipe_servings: recipeServings,
          ingredient_checks: ingredientChecks,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );
    }, 500);

    return () => clearTimeout(timeout);
  }, [recipes, mealCount, maxWeeklyTime, weeklyPlan, recipeServings, ingredientChecks, user?.id]);

  useEffect(() => {
  setWeeklyPlan((current) => {
    const currentPlan = Array.isArray(current)
      ? DAYS.map((_, i) => current[i] || null)
      : DAYS.map(() => null);

    return currentPlan.map((recipe) => {
      if (!recipe) return null;

      const latestRecipe = recipes.find((r) => r.id === recipe.id);
      return latestRecipe ? latestRecipe : recipe;
    });
  });
}, [recipes]);

  const totalPlanTime = useMemo(
    () => weeklyPlan.reduce((sum, recipe) => sum + (recipe?.time || 0), 0),
    [weeklyPlan]
  );

  const scheduledMeals = useMemo(
    () => weeklyPlan.slice(0, mealCount).filter(Boolean).length,
    [weeklyPlan, mealCount]
  );

  const getRecipeServings = (recipe) => (recipe?.id ? recipeServings[recipe.id] || 1 : 1);

  const getIngredientCheckKey = (recipe, day) => {
  if (!recipe?.id || !day) return "";
  return `${recipe.id}__${day}`;
};

const getCheckedIngredients = (recipe, day) => {
  const key = getIngredientCheckKey(recipe, day);
  return key ? ingredientChecks[key] || {} : {};
};

const toggleIngredientChecked = (recipe, day, index) => {
  const key = getIngredientCheckKey(recipe, day);
  if (!key) return;

  setIngredientChecks((current) => ({
    ...current,
    [key]: {
      ...(current[key] || {}),
      [index]: !(current[key] || {})[index]
    }
  }));
};
  
  const groceryListItems = useMemo(
  () =>
    buildGroceryList(
      weeklyPlan.slice(0, mealCount),
      recipeServings,
      ingredientChecks,
      getIngredientCheckKey
    ),
  [weeklyPlan, mealCount, recipeServings, ingredientChecks]
);

  

  const updateRecipeServings = (recipeId, nextServings) => {
    setRecipeServings((current) => ({
      ...current,
      [recipeId]: nextServings
    }));
  };

  const signInWithGoogle = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

const importRecipeFromImage = async (file) => {
  if (!file) return;

  setIsImportingRecipeImage(true);
  setImportStatus("Reading recipe image...");

  try {
    const {
      data: { text }
    } = await Tesseract.recognize(file, "eng");

    const imported = parseRecipeFromImageText(text);

    setOcrPreview({
      name: imported.name || "",
      time: imported.time || "",
      ingredientsText: imported.ingredientsText || "",
      ingredientTagsText: imported.ingredientTagsText || "",
      stepsText: imported.stepsText || "",
      rawText: text || ""
    });

    setImportStatus("Recipe text extracted. Review it before applying.");
  } catch (error) {
    setImportStatus(
      error instanceof Error
        ? error.message
        : "Failed to import recipe from image."
    );
  } finally {
    setIsImportingRecipeImage(false);
  }
};


  const importRecipeFromUrl = async () => {
  const trimmedUrl = importUrl.trim();
  if (!trimmedUrl) {
    setImportStatus("Paste a recipe URL first.");
    return;
  }

  setIsImportingRecipe(true);
  setImportStatus("Importing recipe...");

  try {
    const html = await fetchRecipeHtml(trimmedUrl);
    const imported = parseRecipeFromHtml(html, trimmedUrl);
    let imageData = newRecipe.imageData;

    if (imported.imageUrl) {
      try {
        const response = await fetch(imported.imageUrl);
        if (response.ok) {
          const blob = await response.blob();
          const filename = imported.imageUrl.split("/").pop() || "recipe-image";
          const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
          imageData = await fileToDataUrl(file);
        }
      } catch {
        imageData = "";
      }
    }

    setNewRecipe((current) => ({
      ...current,
      name: imported.name || current.name,
      imageData,
      time: imported.time ? String(imported.time) : current.time,
      ingredientsText: imported.ingredients.map((item) => item.text).join("\n"),
      ingredientTagsText: imported.ingredients.map(() => "").join("\n"),
      stepsText: imported.steps.join("\n"),
    }));

    setImportStatus("Recipe imported. Review and save it when ready.");
  } catch (error) {
    setImportStatus(error instanceof Error ? error.message : "Failed to import recipe.");
  } finally {
    setIsImportingRecipe(false);
  }
};

  const addRecipe = () => {
    if (!newRecipe.name.trim()) return;

    const parsedRarity = Math.max(1, Math.min(5, Number(newRecipe.rarity) || 1));
    const parsedTime = Math.max(1, Number(newRecipe.time) || 1);
    const ingredientLines = newRecipe.ingredientsText.split("\n");
    const tagLines = newRecipe.ingredientTagsText.split("\n");

    const ingredients = ingredientLines
      .map((item, index) => ({
        text: item.trim(),
        locationTag: (tagLines[index] || "").trim()
      }))
      .filter((item) => item.text);

    const steps = newRecipe.stepsText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const newId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());

    setRecipes((current) => [
      ...current,
      {
        id: newId,
        name: newRecipe.name.trim(),
        imageData: newRecipe.imageData || "",
        rarity: parsedRarity,
        time: parsedTime,
        ingredients,
        steps
      }
    ]);

    setRecipeServings((current) => ({ ...current, [newId]: 1 }));
    setNewRecipe({
      name: "",
      imageData: "",
      rarity: "",
      time: "",
      ingredientsText: "",
      ingredientTagsText: "",
      stepsText: ""
    });
    setActiveTab("recipes");
  };

  const saveRecipe = (updatedRecipe) => {
    setRecipes((current) =>
      current.map((recipe) => (recipe.id === updatedRecipe.id ? updatedRecipe : recipe))
    );
    setWeeklyPlan((current) =>
      current.map((recipe) => (recipe?.id === updatedRecipe.id ? updatedRecipe : recipe))
    );
  };

  const removeRecipe = (id) => {
    setRecipes((current) => current.filter((recipe) => recipe.id !== id));
    setWeeklyPlan((current) => current.map((recipe) => (recipe?.id === id ? null : recipe)));
    setRecipeServings((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const toggleRecipeSelectedForExport = (recipeId) => {
  setSelectedExportRecipeIds((current) => ({
    ...current,
    [recipeId]: !current[recipeId]
  }));
};

const downloadRecipesFile = (recipesToExport, filename = "recipes-export.json") => {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    recipes: recipesToExport
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const exportAllRecipes = () => {
  downloadRecipesFile(recipes, "all-recipes.json");
};

const exportSelectedRecipes = () => {
  const selectedRecipes = recipes.filter((recipe) => selectedExportRecipeIds[recipe.id]);
  if (selectedRecipes.length === 0) return;
  downloadRecipesFile(selectedRecipes, "selected-recipes.json");
};

const importRecipesFromFile = async (file) => {
  const text = await file.text();
  const parsed = JSON.parse(text);

  const importedRecipes = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.recipes)
      ? parsed.recipes
      : [];

  if (importedRecipes.length === 0) {
    throw new Error("No recipes found in that file.");
  }

  const normalizeIngredientText = (ingredient) => {
    const text =
      typeof ingredient === "string"
        ? ingredient
        : ingredient?.text || "";

    return text.trim().toLowerCase().replace(/\s+/g, " ");
  };

  const buildDuplicateKey = (recipe) => {
    const normalizedName = (recipe.name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

    const normalizedIngredients = (recipe.ingredients || [])
      .map((ingredient) => normalizeIngredientText(ingredient))
      .filter(Boolean)
      .sort()
      .join("||");

    return `${normalizedName}__${normalizedIngredients}`;
  };

  const existingKeys = new Set(
    recipes
      .map((recipe) => normalizeRecipe(recipe))
      .map((recipe) => buildDuplicateKey(recipe))
      .filter((key) => key !== "__")
  );

  let skippedCount = 0;
  let invalidCount = 0;

  const normalizedImported = importedRecipes
    .map((recipe) => normalizeRecipe(recipe))
    .filter((recipe) => {
      const hasName = recipe.name && recipe.name.trim();
      const hasIngredients = Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0;

      if (!hasName || !hasIngredients) {
        invalidCount += 1;
        return false;
      }

      const key = buildDuplicateKey(recipe);
      if (existingKeys.has(key)) {
        skippedCount += 1;
        return false;
      }

      existingKeys.add(key);
      return true;
    })
    .map((recipe) => ({
      ...recipe,
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    }));

  if (normalizedImported.length === 0) {
    throw new Error(
      `No new recipes were imported. ${skippedCount} duplicate${skippedCount === 1 ? "" : "s"} skipped` +
      `${invalidCount ? `, ${invalidCount} invalid` : ""}.`
    );
  }

  setRecipes((current) => [...current, ...normalizedImported]);

  setRecipeServings((current) => {
    const next = { ...current };
    normalizedImported.forEach((recipe) => {
      next[recipe.id] = 1;
    });
    return next;
  });

  setRecipeImportSummary(
    `Imported ${normalizedImported.length} recipe${normalizedImported.length === 1 ? "" : "s"}. ` +
    `Skipped ${skippedCount} duplicate${skippedCount === 1 ? "" : "s"}` +
    `${invalidCount ? ` and ${invalidCount} invalid entr${invalidCount === 1 ? "y" : "ies"}` : ""}.`
  );
};


  const rerollPlan = () => {
    setWeeklyPlan(toSevenDayPlan(generatePlan(recipes, mealCount, maxWeeklyTime), mealCount));
  };

  const rerollSingleDay = () => {
    setWeeklyPlan((current) => {
      const currentPlan = Array.isArray(current)
          ? DAYS.map((_, i) => current[i] || null)
          : DAYS.map(() => null);
      const excludedIds = currentPlan
        .map((recipe, index) => (index !== regenDayIndex && recipe ? recipe.id : null))
        .filter(Boolean);

      const usedTimeWithoutDay = currentPlan.reduce(
        (sum, recipe, index) => (index === regenDayIndex ? sum : sum + (recipe?.time || 0)),
        0
      );

      const remainingTime =
        maxWeeklyTime > 0 ? Math.max(0, maxWeeklyTime - usedTimeWithoutDay) : 0;

      const replacement = pickSingleRecipe(recipes, excludedIds, remainingTime);
      if (!replacement) return currentPlan;

      const updated = [...currentPlan];
      updated[regenDayIndex] = replacement;
      return updated;
    });
  };

  const handleDragStart = (event, draggedIndex) => {
    if (!weeklyPlan[draggedIndex]) return;
    setDraggedMealIndex(draggedIndex);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(draggedIndex));
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (targetIndex) => {
    if (draggedMealIndex === null || draggedMealIndex === targetIndex) {
      setDraggedMealIndex(null);
      return;
    }

    setWeeklyPlan((current) => {
      const updated = [...current];
      const sourceRecipe = updated[draggedMealIndex] || null;
      const targetRecipe = updated[targetIndex] || null;
      if (!sourceRecipe) return updated;
      updated[targetIndex] = sourceRecipe;
      updated[draggedMealIndex] = targetRecipe;
      return updated.map((recipe) => recipe ?? null);
    });

    setDraggedMealIndex(null);
  };

  const tabs = [
    { id: "planner", label: "Planner", icon: BookOpen },
    { id: "add", label: "New Recipe", icon: Plus },
    { id: "recipes", label: "Saved Recipes", icon: ListChecks },
    { id: "settings", label: "Settings", icon: Settings2 }
  ];

  return (
    <div className="app-shell">
      <div className="container stack-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className={cardClass()}>
            <div className="row-between wrap gap-12">
              <div>
                <h1 className="hero-title">Weekly Recipe Planner</h1>
                <p className="hero-copy">
                  Plan meals, save recipes, and sync your personal data across devices.
                </p>
              </div>

              <div className="row wrap gap-8">
                <span className={badgeClass()}>{recipes.length} recipes</span>
                <span className={badgeClass()}>{mealCount} meals</span>
                <button className={buttonClass("secondary")} onClick={() => setShowGroceryList(true)}>
                  <ShoppingCart size={16} /> Grocery list
                </button>
                <button className={buttonClass()} onClick={rerollPlan}>
                  <Shuffle size={16} /> Generate week
                </button>
              </div>
            </div>

            <div className="tabbar mt-16">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`tab ${isActive ? "tab-active" : ""}`}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        <AuthCard user={user} onSignIn={signInWithGoogle} onSignOut={signOut} />

        {!hasSupabaseConfig && (
          <div className="notice">
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable Google login and cloud sync.
          </div>
        )}

        <div className="layout">
          <div className="left-col stack-16">
            {activeTab === "settings" && (
              <div className={cardClass()}>
                <h2 className="title-md">Settings</h2>

                <div className="stack-20 mt-16">
                  <div>
                    <div className="row-between">
                      <LabelBox>Meals to cook</LabelBox>
                      <span className={badgeClass()}>{mealCount}</span>
                    </div>
                    <input
                      className="slider mt-12"
                      type="range"
                      min="1"
                      max="7"
                      step="1"
                      value={mealCount}
                      onChange={(e) => setMealCount(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <div className="row-between">
                      <LabelBox>Max weekly cook time</LabelBox>
                      <span className={badgeClass()}>{maxWeeklyTime} min</span>
                    </div>
                    <input
                      className="slider mt-12"
                      type="range"
                      min="0"
                      max="600"
                      step="15"
                      value={maxWeeklyTime}
                      onChange={(e) => setMaxWeeklyTime(Number(e.target.value))}
                    />
                  </div>

                  <div className="surface">
                    <div className="row-between wrap gap-12">
                      <LabelBox>Regenerate one day</LabelBox>
                      <button className={buttonClass("secondary")} onClick={rerollSingleDay}>
                        <RefreshCw size={16} /> Regenerate
                      </button>
                    </div>
                    <select
                      className={`${inputClass()} mt-12`}
                      value={regenDayIndex}
                      onChange={(e) => setRegenDayIndex(Number(e.target.value))}
                    >
                      {DAYS.map((day, index) => (
                        <option key={day} value={index}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "add" && (
              <div className={cardClass()}>
                <h2 className="title-md">Add recipe</h2>

                <div className="grid-3 mt-16">
                  <div>
                    <LabelBox>Recipe name</LabelBox>
                    <input
                      className={inputClass()}
                      value={newRecipe.name}
                      onChange={(e) => setNewRecipe((c) => ({ ...c, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <LabelBox>Rarity (1–5)</LabelBox>
                    <input
                      className={inputClass()}
                      type="number"
                      min="1"
                      max="5"
                      value={newRecipe.rarity}
                      onChange={(e) =>
                        setNewRecipe((c) => ({
                          ...c,
                          rarity: e.target.value === "" ? "" : Math.max(1, Math.min(5, Number(e.target.value) || 1))
                        }))
                      }
                    />
                  </div>
                  <div>
                    <LabelBox>Cook time (min)</LabelBox>
                    <input
                      className={inputClass()}
                      type="number"
                      min="1"
                      value={newRecipe.time}
                      onChange={(e) =>
                        setNewRecipe((c) => ({
                          ...c,
                          time: e.target.value === "" ? "" : Math.max(1, Number(e.target.value) || 1)
                        }))
                      }
                    />
                  </div>
                </div>

                <div className={`import-status ${importStatus.includes("failed") ? "error" : "success"}`}>
                  {importStatus}
                </div>


                <div className="mt-16">
                  <LabelBox>Import from recipe URL</LabelBox>
                  <div className="row wrap gap-8">
                    <input
                      className={inputClass()}
                      type="url"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      placeholder="https://example.com/recipe"
                    />
                    <button
                      className={buttonClass("secondary")}
                      onClick={importRecipeFromUrl}
                      disabled={isImportingRecipe}
                    >
                      <Link2 size={16} /> {isImportingRecipe ? "Importing..." : "Import URL"}
                    </button>
                  </div>
                  {importStatus ? <div className="muted mt-10">{importStatus}</div> : null}
                </div>

                <div className="mt-16">
                  <LabelBox>Import from recipe picture</LabelBox>
                  <label className={`${buttonClass("secondary")} file-button-label`}>
                    <Plus size={16} /> {isImportingRecipeImage ? "Reading image..." : "Import Picture"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden-file-input"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        await importRecipeFromImage(file);
                        e.target.value = "";
                      }}
                      disabled={isImportingRecipeImage}
                    />
                  </label>
                </div>

                {ocrPreview ? (
                  <div className={`${cardClass()} mt-16`}>
                    <div className="row-between wrap gap-12">
                      <div>
                        <h3 className="title-md">Imported recipe preview</h3>
                        <p className="muted mt-6">
                          Review and edit the extracted text before applying it to the form.
                        </p>
                      </div>

                      <div className="row wrap gap-8">
                        <button
                          type="button"
                          className={buttonClass("secondary")}
                          onClick={discardOcrPreview}
                        >
                          <X size={16} /> Discard
                        </button>
                        <button
                          type="button"
                          className={buttonClass()}
                          onClick={applyOcrPreviewToForm}
                        >
                          <Save size={16} /> Apply to form
                        </button>
                      </div>
                    </div>

                    <div className="grid-3 mt-16">
                      <div>
                        <LabelBox>Recipe name</LabelBox>
                        <input
                          className={inputClass()}
                          value={ocrPreview.name}
                          onChange={(e) => updateOcrPreviewField("name", e.target.value)}
                        />
                      </div>

                      <div>
                        <LabelBox>Cook time (min)</LabelBox>
                        <input
                          className={inputClass()}
                          type="number"
                          min="1"
                          value={ocrPreview.time}
                          onChange={(e) => updateOcrPreviewField("time", e.target.value)}
                        />
                      </div>

                      <div>
                        <LabelBox>Raw OCR text</LabelBox>
                        <textarea
                          className={textareaClass()}
                          value={ocrPreview.rawText}
                          onChange={(e) => updateOcrPreviewField("rawText", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid-2 mt-16">
                      <div>
                        <LabelBox>Ingredients</LabelBox>
                        <textarea
                          className={textareaClass()}
                          value={ocrPreview.ingredientsText}
                          onChange={(e) =>
                            updateOcrPreviewField("ingredientsText", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <LabelBox>Steps</LabelBox>
                        <textarea
                          className={textareaClass()}
                          value={ocrPreview.stepsText}
                          onChange={(e) => updateOcrPreviewField("stepsText", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}


                <div className="mt-16">
                  <LabelBox>Meal image</LabelBox>
                  {newRecipe.imageData ? <img className="recipe-image recipe-image-preview" src={newRecipe.imageData} alt={newRecipe.name || "Recipe preview"} /> : null}
                  <input
                    className={inputClass()}
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const imageData = await fileToDataUrl(file);
                      setNewRecipe((c) => ({ ...c, imageData }));
                      e.target.value = "";
                    }}
                  />
                </div>

                <div className="grid-3 mt-16">
                  <div>
                    <LabelBox>Ingredients</LabelBox>
                    <textarea
                      className={textareaClass()}
                      value={newRecipe.ingredientsText}
                      onChange={(e) => setNewRecipe((c) => ({ ...c, ingredientsText: e.target.value }))}
                    />
                  </div>
                  <div>
                    <LabelBox>Store locations</LabelBox>
                    <div className="stack-8">
                      {newRecipe.ingredientsText.split("\n").map((line, index) => {
                        const ingredient = line.trim();
                        if (!ingredient) return null;

                        const tagLines = newRecipe.ingredientTagsText.split("\n");

                        return (
                          <div key={index} className="row-between gap-8">
                            <div className="muted">{ingredient}</div>
                            <select
                              className={inputClass()}
                              value={tagLines[index] || ""}
                              onChange={(e) => {
                                const updated = newRecipe.ingredientsText.split("\n").map((_, i) =>
                                  i === index ? e.target.value : tagLines[i] || ""
                                );
                                setNewRecipe((c) => ({
                                  ...c,
                                  ingredientTagsText: updated.join("\n")
                                }));
                              }}
                            >
                              <option value="">Select</option>
                              {STORE_LOCATION_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <LabelBox>Steps</LabelBox>
                    <textarea
                      className={textareaClass()}
                      value={newRecipe.stepsText}
                      onChange={(e) => setNewRecipe((c) => ({ ...c, stepsText: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="mt-16">
                  <button className={buttonClass()} onClick={addRecipe}>
                    <Plus size={16} /> Add recipe
                  </button>
                </div>
              </div>
            )}

            {activeTab === "recipes" && (
              <div className={cardClass()}>
                <h2 className="title-md">Saved recipes</h2>
                <div className="row wrap gap-8 mt-16">
                  <button className={buttonClass("secondary")} onClick={exportAllRecipes}>
                    Export all
                  </button>

                  <button className={buttonClass("secondary")} onClick={exportSelectedRecipes}>
                    Export selected
                  </button>

                  <label className={`${buttonClass("secondary")} file-button-label`}>
                    Import recipes
                    <input
                      type="file"
                      accept="application/json"
                      className="hidden-file-input"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        setRecipeImportSummary("");

                        try {
                          await importRecipesFromFile(file);
                        } catch (error) {
                          setRecipeImportSummary(
                            error instanceof Error ? error.message : "Failed to import recipes."
                          );
                        }

                        e.target.value = "";
                      }}
                    />
                  </label>

                  {recipeImportSummary ? (
                      <div className="recipe-import-summary">{recipeImportSummary}</div>
                    ) : null}
                </div>
                <div className="stack-12 mt-16">
                  {recipes.length === 0 ? (
                    <div className="notice">No recipes yet.</div>
                  ) : (
                    recipes.map((recipe) => (
                      <RecipeEditorRow
                        key={recipe.id}
                        recipe={recipe}
                        onSave={saveRecipe}
                        onDelete={removeRecipe}
                        isSelectedForExport={selectedExportRecipeIds[recipe.id]}
                        onToggleSelectedForExport={() => toggleRecipeSelectedForExport(recipe.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="right-col">
            <div className={cardClass()}>
              <div className="row-between wrap gap-12">
                <div>
                  <h2 className="title-md">Weekly calendar</h2>
                  <p className="muted mt-6">Your current meal plan.</p>
                </div>
                <div className="row gap-8">
                  <span className={badgeClass()}>{scheduledMeals} scheduled</span>
                  <span className={badgeClass()}>{Math.max(0, mealCount - scheduledMeals)} open</span>
                </div>
              </div>

              <div className="stats-grid mt-16">
                <div className="surface">
                  <div className="muted smallcaps">Total time</div>
                  <div className="stat-number">{totalPlanTime} min</div>
                </div>
                <div className="surface">
                  <div className="muted smallcaps">Time cap</div>
                  <div className="stat-number">{maxWeeklyTime === 0 ? "Off" : `${maxWeeklyTime} min`}</div>
                </div>
                <div className="surface">
                  <div className="muted smallcaps">Recipes</div>
                  <div className="stat-number">{recipes.length}</div>
                </div>
              </div>

              <div className="calendar-grid mt-16">
                {DAYS.map((day, index) => {
                  const recipe = weeklyPlan[index] || null;
                  const isOutsideMealCount = index >= mealCount;

                  return (
                    <div
                      key={day}
                      className={`day-card ${isOutsideMealCount ? "day-card-muted" : ""}`}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(index)}
                    >
                      <div className="row-between gap-8">
                        <div className="title-sm">{day}</div>

                        <button
                          type="button"
                          className="day-reroll-button"
                          onClick={(e) => {
                            e.stopPropagation();

                            setWeeklyPlan((current) => {
                              const currentPlan = Array.isArray(current)
                                ? DAYS.map((_, i) => current[i] || null)
                                : DAYS.map(() => null);

                              const excludedIds = currentPlan
                                .map((scheduledRecipe, scheduledIndex) =>
                                  scheduledIndex !== index && scheduledRecipe ? scheduledRecipe.id : null
                                )
                                .filter(Boolean);

                              const usedTimeWithoutDay = currentPlan.reduce(
                                (sum, scheduledRecipe, scheduledIndex) =>
                                  scheduledIndex === index ? sum : sum + (scheduledRecipe?.time || 0),
                                0
                              );

                              const remainingTime =
                                maxWeeklyTime > 0 ? Math.max(0, maxWeeklyTime - usedTimeWithoutDay) : 0;

                              const replacement = pickSingleRecipe(recipes, excludedIds, remainingTime);
                              if (!replacement) return currentPlan;

                              const updated = [...currentPlan];
                              updated[index] = replacement;
                              return updated;
                            });
                          }}
                          aria-label={`Regenerate ${day}`}
                          title={`Regenerate ${day}`}
                        >
                          <RefreshCw size={14} />
                        </button>

                        <span className={badgeClass()}>
                          {index < mealCount ? `Meal ${index + 1}` : "Open"}
                        </span>
                      </div>

                      {recipe ? (
                        <div className="stack-12 mt-16">
                          <div
                            className="row gap-10 drag-row"
                            draggable
                            onDragStart={(event) => handleDragStart(event, index)}
                            onDragEnd={() => setDraggedMealIndex(null)}
                          >
                            <button
                              type="button"
                              className="meal-open-button"
                              onClick={() => setSelectedMeal({ recipe, day })}
                            >
                              <div className="icon-box"><UtensilsCrossed size={16} /></div>
                              <div className="meal-copy">
                                <div className="title-sm">{recipe.name}</div>
                                <div className="muted mt-6">Rarity {recipe.rarity}</div>
                              </div>
                            </button>
                            <div className="muted drag-handle"><GripVertical size={16} /></div>
                          </div>

                          <div className="surface row gap-8 muted">
                            <Clock3 size={16} />
                            {recipe.time} minutes
                          </div>
                        </div>
                      ) : (
                        <div className="empty-slot mt-16">Drop a recipe here or regenerate this day.</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <MealDetailModal
  recipe={selectedMeal?.recipe}
  day={selectedMeal?.day}
  onClose={() => setSelectedMeal(null)}
  servings={getRecipeServings(selectedMeal?.recipe)}
  checkedIngredients={getCheckedIngredients(
  selectedMeal?.recipe,
  selectedMeal?.day
)}
onToggleIngredient={(index) => {
  if (!selectedMeal?.recipe?.id || !selectedMeal?.day) return;
  toggleIngredientChecked(
    selectedMeal.recipe,
    selectedMeal.day,
    index
  );
}}
  onServingsChange={(value) => {
    if (!selectedMeal?.recipe?.id) return;
    updateRecipeServings(selectedMeal.recipe.id, value);
  }}
/>

      <GroceryListModal
        items={showGroceryList ? groceryListItems : null}
        onClose={() => setShowGroceryList(false)}
      />
    </div>
  );
}
