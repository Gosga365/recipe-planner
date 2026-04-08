import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Clock3,
  Cloud,
  GripVertical,
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

function buildGroceryList(weeklyPlan, recipeServings) {
  const grouped = new Map();

  weeklyPlan.filter(Boolean).forEach((recipe) => {
    const servings = recipeServings[recipe.id] || 1;
    (recipe.ingredients || []).forEach((ingredient) => {
      const parsed = parseIngredientParts(ingredient);
      const key = parsed.normalizedKey || parsed.originalText.toLowerCase();
      const existing = grouped.get(key);

      if (parsed.quantity !== null) {
        const scaledQuantity = parsed.quantity * servings;
        if (existing && existing.quantity !== null) {
          existing.quantity += scaledQuantity;
        } else if (!existing) {
          grouped.set(key, {
            quantity: scaledQuantity,
            unit: parsed.unit,
            name: parsed.name,
            locationTag: parsed.locationTag,
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
            locationTag: parsed.locationTag,
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
    recipeServings: {}
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
      ? toSevenDayPlan(parsed.weeklyPlan, mealCount)
      : toSevenDayPlan(generatePlan(recipes, mealCount, maxWeeklyTime), mealCount);
    const recipeServings =
      parsed.recipeServings && typeof parsed.recipeServings === "object"
        ? parsed.recipeServings
        : {};

    return { recipes, mealCount, maxWeeklyTime, weeklyPlan, recipeServings };
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

function RecipeEditorRow({ recipe, onSave, onDelete }) {
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
      <div>
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
              <div key={tag}>
                <h3 className="title-md">{tag}</h3>
                <ul className="list mt-10">
                  {texts.map((text, index) => <li key={`${tag}-${index}`}>{text}</li>)}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function MealDetailModal({ recipe, day, onClose, servings, onServingsChange }) {
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
            <ul className="list mt-10">
              {scaledIngredients.map((ingredient, index) => (
                <li key={`${recipe.id}-ingredient-${index}`}>{ingredient}</li>
              ))}
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

  const [newRecipe, setNewRecipe] = useState({
    name: "",
    imageData: "",
    rarity: "",
    time: "",
    ingredientsText: "",
    ingredientTagsText: "",
    stepsText: ""
  });

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        recipes,
        mealCount,
        maxWeeklyTime,
        weeklyPlan: toSevenDayPlan(weeklyPlan, mealCount),
        recipeServings
      })
    );
  }, [recipes, mealCount, maxWeeklyTime, weeklyPlan, recipeServings]);

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
        .select("recipes, meal_count, max_weekly_time, weekly_plan, recipe_servings")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled || error) return;

      if (data) {
        const nextRecipes =
          Array.isArray(data.recipes) && data.recipes.length > 0
            ? data.recipes.map(normalizeRecipe)
            : starterRecipes;

        const nextMealCount = Number(data.meal_count) || 5;
        const nextMaxWeeklyTime = Number.isFinite(data.max_weekly_time)
          ? data.max_weekly_time
          : 240;

        setRecipes(nextRecipes);
        setMealCount(nextMealCount);
        setMaxWeeklyTime(nextMaxWeeklyTime);
        setWeeklyPlan(toSevenDayPlan(data.weekly_plan || [], nextMealCount));
        setRecipeServings(
          data.recipe_servings && typeof data.recipe_servings === "object"
            ? data.recipe_servings
            : {}
        );
      }
    }

    loadCloudData();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!supabase || !user) return;

    const timeout = setTimeout(async () => {
      await supabase.from("user_recipe_plans").upsert(
        {
          user_id: user.id,
          recipes,
          meal_count: mealCount,
          max_weekly_time: maxWeeklyTime,
          weekly_plan: toSevenDayPlan(weeklyPlan, mealCount),
          recipe_servings: recipeServings,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );
    }, 500);

    return () => clearTimeout(timeout);
  }, [recipes, mealCount, maxWeeklyTime, weeklyPlan, recipeServings, user?.id]);

  useEffect(() => {
    setWeeklyPlan((current) => {
      const normalized = toSevenDayPlan(current, mealCount);
      const filledCount = normalized.filter(Boolean).length;

      if (filledCount >= mealCount) return normalized;

      const existingIds = normalized.filter(Boolean).map((recipe) => recipe.id);
      const slotsToFill = mealCount - filledCount;
      const additions = [];
      let remainingTime =
        maxWeeklyTime > 0
          ? Math.max(0, maxWeeklyTime - normalized.reduce((sum, recipe) => sum + (recipe?.time || 0), 0))
          : 0;

      for (let i = 0; i < slotsToFill; i += 1) {
        const pick = pickSingleRecipe(
          recipes,
          [...existingIds, ...additions.map((item) => item.id)],
          remainingTime
        );
        if (!pick) break;
        additions.push(pick);
        if (maxWeeklyTime > 0) remainingTime = Math.max(0, remainingTime - pick.time);
      }

      let addIndex = 0;
      return normalized.map((recipe, index) => {
        if (index < mealCount && !recipe && additions[addIndex]) {
          const next = additions[addIndex];
          addIndex += 1;
          return next;
        }
        return recipe;
      });
    });
  }, [mealCount, maxWeeklyTime, recipes]);

  const totalPlanTime = useMemo(
    () => weeklyPlan.reduce((sum, recipe) => sum + (recipe?.time || 0), 0),
    [weeklyPlan]
  );

  const scheduledMeals = useMemo(
    () => weeklyPlan.slice(0, mealCount).filter(Boolean).length,
    [weeklyPlan, mealCount]
  );

  const groceryListItems = useMemo(
    () => buildGroceryList(weeklyPlan.slice(0, mealCount).filter(Boolean), recipeServings),
    [weeklyPlan, mealCount, recipeServings]
  );

  const getRecipeServings = (recipe) => (recipe?.id ? recipeServings[recipe.id] || 1 : 1);

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

  const rerollPlan = () => {
    setWeeklyPlan(toSevenDayPlan(generatePlan(recipes, mealCount, maxWeeklyTime), mealCount));
  };

  const rerollSingleDay = () => {
    setWeeklyPlan((current) => {
      const currentPlan = toSevenDayPlan(current, mealCount);
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
