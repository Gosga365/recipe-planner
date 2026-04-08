import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";


const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const STORAGE_KEY = "weekly-recipe-planner-data";

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
function Card({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

function CardHeader({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

function CardContent({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

function CardTitle({ className = "", children }) {
  return <h2 className={className}>{children}</h2>;
}

function Button({ className = "", variant = "default", size = "default", children, ...props }) {
  const variantClass = variant === "outline"
    ? "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
    : variant === "ghost"
      ? "bg-transparent text-slate-700 hover:bg-slate-100"
      : "bg-slate-900 text-white hover:bg-slate-800";
  const sizeClass = size === "icon" ? "h-10 w-10 p-0" : "px-4 py-2";
  return (
    <button
      className={`${variantClass} ${sizeClass} inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full rounded-2xl border bg-white px-3 py-2 text-sm outline-none ring-0 ${className}`.trim()}
      {...props}
    />
  );
}

function Label({ className = "", children, ...props }) {
  return (
    <label className={`text-sm font-medium text-slate-900 ${className}`.trim()} {...props}>
      {children}
    </label>
  );
}

function Slider({ value = [0], min = 0, max = 100, step = 1, onValueChange, className = "" }) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      className={`h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 ${className}`.trim()}
    />
  );
}

function Badge({ className = "", variant = "default", children }) {
  const variantClass = variant === "secondary"
    ? "bg-slate-100 text-slate-700"
    : variant === "outline"
      ? "border border-slate-300 bg-white text-slate-700"
      : "bg-slate-900 text-white";
  return (
    <span className={`${variantClass} inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${className}`.trim()}>
      {children}
    </span>
  );
}
import {
  Trash2,
  Plus,
  Shuffle,
  Clock3,
  UtensilsCrossed,
  Pencil,
  Save,
  X,
  GripVertical,
  RefreshCw,
  ShoppingCart,
  BookOpen,
  ListChecks,
  Settings2,
  LogIn,
  LogOut,
  Cloud,
} from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const INGREDIENT_LOCATION_OPTIONS = [
  "Dairy",
  "Meat",
  "Produce",
  "Seasonings",
  "Frozens",
  "Pasta",
  "Oils",
  "Aisles",
];

const starterRecipes = [
  {
    id: 1,
    name: "Spaghetti Bolognese",
    rarity: 5,
    time: 35,
    ingredients: [
      { text: "1 lb ground beef", locationTag: "Meat" },
      { text: "1 jar tomato sauce", locationTag: "Aisles" },
      { text: "12 oz spaghetti", locationTag: "Pasta" },
      { text: "1 onion", locationTag: "Produce" },
      { text: "2 garlic cloves", locationTag: "Produce" },
    ],
    steps: [
      "Boil salted water and cook the spaghetti until al dente.",
      "Saute the onion and garlic until softened.",
      "Add the ground beef and cook until browned.",
      "Stir in the tomato sauce and simmer for 10 to 15 minutes.",
      "Serve the sauce over spaghetti.",
    ],
  },
  {
    id: 2,
    name: "Chicken Curry",
    rarity: 4,
    time: 40,
    ingredients: [
      { text: "2 chicken breasts", locationTag: "Meat" },
      { text: "1 onion", locationTag: "Produce" },
      { text: "2 tbsp curry paste", locationTag: "Seasonings" },
      { text: "1 can coconut milk", locationTag: "Aisles" },
      { text: "1 cup rice", locationTag: "Aisles" },
    ],
    steps: [
      "Cook the rice according to package directions.",
      "Saute the onion until soft.",
      "Add sliced chicken and cook until lightly browned.",
      "Stir in the curry paste and coconut milk.",
      "Simmer until the chicken is cooked through and serve over rice.",
    ],
  },
  {
    id: 3,
    name: "Mushroom Risotto",
    rarity: 2,
    time: 50,
    ingredients: [
      { text: "1 cup arborio rice", locationTag: "Aisles" },
      { text: "8 oz mushrooms", locationTag: "Produce" },
      { text: "1 shallot", locationTag: "Produce" },
      { text: "4 cups broth", locationTag: "Aisles" },
      { text: "1/2 cup parmesan", locationTag: "Dairy" },
    ],
    steps: [
      "Warm the broth in a saucepan.",
      "Cook the shallot and mushrooms until softened.",
      "Toast the rice for 1 to 2 minutes.",
      "Add broth gradually, stirring often until the rice is tender.",
      "Finish with parmesan and serve immediately.",
    ],
  },
];

function weightedPick(pool) {
  const totalWeight = pool.reduce((sum, recipe) => sum + recipe.rarity, 0);
  let target = Math.random() * totalWeight;
  for (const recipe of pool) {
    target -= recipe.rarity;
    if (target <= 0) return recipe;
  }
  return pool[pool.length - 1];
}

function pickSingleRecipe(recipes, excludedIds = [], remainingTime = 0) {
  const validRecipes = recipes.filter((recipe) => {
    const notExcluded = !excludedIds.includes(recipe.id);
    const validTime = remainingTime <= 0 || recipe.time <= remainingTime;
    return recipe.name.trim() && Number(recipe.rarity) > 0 && Number(recipe.time) > 0 && notExcluded && validTime;
  });
  if (validRecipes.length === 0) {
    const fallbackRecipes = recipes.filter((recipe) => recipe.name.trim() && Number(recipe.rarity) > 0 && Number(recipe.time) > 0 && !excludedIds.includes(recipe.id));
    if (fallbackRecipes.length === 0) return null;
    return weightedPick(fallbackRecipes);
  }
  return weightedPick(validRecipes);
}

function generatePlan(recipes, mealCount, maxWeeklyTime) {
  const validRecipes = recipes.filter((r) => r.name.trim() && Number(r.rarity) > 0 && Number(r.time) > 0);
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
      const withinTime = maxWeeklyTime <= 0 || projectedTime <= maxWeeklyTime || selected.length === 0;
      if (withinTime) {
        selected.push(choice);
        usedIds.add(choice.id);
        timeTotal += choice.time;
      }
    }

    const rarityScore = selected.reduce((sum, r) => sum + r.rarity, 0);
    const completenessBonus = selected.length * 100;
    const timePenalty = maxWeeklyTime > 0 && timeTotal > maxWeeklyTime ? (timeTotal - maxWeeklyTime) * 10 : 0;
    const score = completenessBonus + rarityScore - timePenalty;
    if (score > bestScore) {
      bestScore = score;
      bestPlan = selected;
    }
  }
  return bestPlan;
}

function normalizeIngredient(item) {
  if (typeof item === "string") {
    return { text: item, locationTag: "" };
  }

  const normalizedTag = INGREDIENT_LOCATION_OPTIONS.includes(item?.locationTag)
    ? item.locationTag
    : "";

  return {
    text: item?.text || "",
    locationTag: normalizedTag,
  };
}

function normalizeRecipe(recipe) {
  return {
    ...recipe,
    id: recipe.id,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map(normalizeIngredient) : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
  };
}

function toSevenDayPlan(plan, mealCount) {
  const normalized = Array.isArray(plan) ? plan.map((item) => (item ? normalizeRecipe(item) : null)) : [];
  return DAYS.map((_, index) => (index < mealCount ? normalized[index] || null : null));
}

function localFallbackState() {
  return {
    recipes: starterRecipes,
    mealCount: 5,
    maxWeeklyTime: 240,
    weeklyPlan: toSevenDayPlan(generatePlan(starterRecipes, 5, 240), 5),
    recipeServings: {},
  };
}

function loadInitialState() {
  if (typeof window === "undefined") return localFallbackState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return localFallbackState();
    const parsed = JSON.parse(raw);
    const recipes = Array.isArray(parsed.recipes) && parsed.recipes.length > 0 ? parsed.recipes.map(normalizeRecipe) : starterRecipes;
    const mealCount = Number(parsed.mealCount) || 5;
    const maxWeeklyTime = Number.isFinite(parsed.maxWeeklyTime) ? parsed.maxWeeklyTime : 240;
    const weeklyPlan = Array.isArray(parsed.weeklyPlan) ? toSevenDayPlan(parsed.weeklyPlan, mealCount) : toSevenDayPlan(generatePlan(recipes, mealCount, maxWeeklyTime), mealCount);
    const recipeServings = parsed.recipeServings && typeof parsed.recipeServings === "object" ? parsed.recipeServings : {};
    return { recipes, mealCount, maxWeeklyTime, weeklyPlan, recipeServings };
  } catch {
    return localFallbackState();
  }
}

function RecipeEditorRow({ recipe, onSave, onDelete, rarityLabel }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(recipe);

  useEffect(() => {
    setDraft(recipe);
  }, [recipe]);

  const updateIngredientField = (value) => {
    const currentTags = (draft.ingredients || []).map((item) => normalizeIngredient(item).locationTag);
    setDraft((current) => ({
      ...current,
      ingredients: value.split("\\n").map((line, index) => ({
        text: line,
        locationTag: currentTags[index] || "",
      })),
    }));
  };

  const updateSingleIngredientTag = (index, value) => {
    setDraft((current) => ({
      ...current,
      ingredients: (current.ingredients || []).map((item, itemIndex) =>
        itemIndex === index
          ? { ...normalizeIngredient(item), locationTag: value }
          : normalizeIngredient(item)
      ),
    }));
  };

  const saveChanges = () => {
    if (!draft.name.trim()) return;

    onSave({
      ...draft,
      name: draft.name.trim(),
      rarity: Math.max(1, Math.min(5, Number(draft.rarity) || 1)),
      time: Math.max(1, Number(draft.time) || 1),
      ingredients: (draft.ingredients || [])
        .map((item) => normalizeIngredient(item))
        .map((item) => ({ text: item.text.trim(), locationTag: item.locationTag.trim() }))
        .filter((item) => item.text),
      steps: (draft.steps || []).map((item) => item.trim()).filter(Boolean),
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <motion.div layout className="rounded-2xl border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1.3fr_0.7fr_0.7fr_auto] md:items-end">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={draft.name} onChange={(e) => setDraft((c) => ({ ...c, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Rarity</Label>
            <Input type="number" min={1} max={5} value={draft.rarity} onChange={(e) => setDraft((c) => ({ ...c, rarity: Math.max(1, Math.min(5, Number(e.target.value) || 1)) }))} />
          </div>
          <div className="space-y-2">
            <Label>Time (min)</Label>
            <Input type="number" min={1} value={draft.time} onChange={(e) => setDraft((c) => ({ ...c, time: Math.max(1, Number(e.target.value) || 1) }))} />
          </div>
          <div className="flex gap-2 md:justify-end">
            <Button onClick={saveChanges} className="rounded-xl"><Save className="mr-2 h-4 w-4" />Save</Button>
            <Button variant="outline" onClick={() => setIsEditing(false)} className="rounded-xl"><X className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr_1fr]">
          <div className="space-y-2">
            <Label>Ingredients (one per line)</Label>
            <textarea className="min-h-[180px] w-full rounded-2xl border bg-white px-3 py-2 text-sm outline-none ring-0" value={(draft.ingredients || []).map((item) => normalizeIngredient(item).text).join("\\n")} onChange={(e) => updateIngredientField(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Ingredient store location</Label>
            <div className="min-h-[180px] space-y-2 rounded-2xl border p-3">
              {(draft.ingredients || []).map((item, index) => {
                const ingredient = normalizeIngredient(item);
                if (!ingredient.text.trim()) return null;
                return (
                  <div key={`ingredient-tag-${index}`} className="grid gap-2 md:grid-cols-[1fr_160px] md:items-center">
                    <div className="truncate text-sm text-slate-700">{ingredient.text}</div>
                    <select className="w-full rounded-xl border bg-white px-3 py-2 text-sm" value={ingredient.locationTag} onChange={(e) => updateSingleIngredientTag(index, e.target.value)}>
                      <option value="">Select location</option>
                      {INGREDIENT_LOCATION_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Steps (one per line)</Label>
            <textarea className="min-h-[180px] w-full rounded-2xl border bg-white px-3 py-2 text-sm outline-none ring-0" value={(draft.steps || []).join("\\n")} onChange={(e) => setDraft((c) => ({ ...c, steps: e.target.value.split("\\n") }))} />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div layout className="flex flex-col gap-3 rounded-2xl border bg-white p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="font-medium text-slate-900">{recipe.name}</div>
        <div className="mt-1 flex flex-wrap gap-2 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" />{recipe.time} min</span>
          <span>Rarity: {recipe.rarity} · {rarityLabel(recipe.rarity)}</span>
          <span>Ingredients: {(recipe.ingredients || []).length}</span>
          <span>Steps: {(recipe.steps || []).length}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setIsEditing(true)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => onDelete(recipe.id)} aria-label={`Remove ${recipe.name}`}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </motion.div>
  );
}

function parseAmountToken(token) {
  if (!token) return null;
  if (token.includes("/")) {
    const parts = token.split("/");
    if (parts.length !== 2) return null;
    const numerator = Number(parts[0]);
    const denominator = Number(parts[1]);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
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
  if (parts.length === 0 || !trimmed) return { originalText: sourceText, locationTag, quantity: null, unit: "", name: "", normalizedKey: trimmed.toLowerCase() };
  const first = parseAmountToken(parts[0]);
  if (first === null) return { originalText: sourceText, locationTag, quantity: null, unit: "", name: trimmed, normalizedKey: trimmed.toLowerCase() };
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
  return { originalText: sourceText, locationTag, quantity: amount, unit: hasName ? unit : "", name, normalizedKey: `${unit.toLowerCase()}|${name.toLowerCase()}` };
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
        if (existing && existing.quantity !== null) existing.quantity += scaledQuantity;
        else if (existing) existing.texts.push(scaleIngredientLine(ingredient, servings));
        else grouped.set(key, { quantity: scaledQuantity, unit: parsed.unit, name: parsed.name, locationTag: parsed.locationTag, texts: [] });
      } else {
        const scaledText = scaleIngredientLine(ingredient, servings);
        if (existing) {
          if (!existing.texts.includes(scaledText)) existing.texts.push(scaledText);
        } else grouped.set(key, { quantity: null, unit: "", name: "", locationTag: parsed.locationTag, texts: [scaledText] });
      }
    });
  });
  return Array.from(grouped.values()).flatMap((item) => item.quantity !== null ? [{ text: [formatScaledAmount(item.quantity), item.unit, item.name].filter(Boolean).join(" "), locationTag: item.locationTag }] : item.texts.map((text) => ({ text, locationTag: item.locationTag }))).sort((a, b) => ((a.locationTag || "").localeCompare(b.locationTag || "") || a.text.localeCompare(b.text)));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div><div className="text-sm text-slate-500">Current week</div><h2 className="mt-1 text-2xl font-semibold text-slate-900">Grocery list</h2><div className="mt-2 text-sm text-slate-500">Combined ingredients from all scheduled meals using each recipe’s saved servings.</div></div>
          <Button variant="outline" className="rounded-2xl" onClick={onClose}>Close</Button>
        </div>
        <div className="mt-6 space-y-6">
          {Object.keys(groupedByTag).length === 0 ? <p className="text-sm text-slate-500">No scheduled meals yet.</p> : Object.entries(groupedByTag).map(([tag, texts]) => <div key={tag}><h3 className="text-lg font-semibold text-slate-900">{tag}</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">{texts.map((text, index) => <li key={`${tag}-${index}`}>{text}</li>)}</ul></div>)}
        </div>
      </div>
    </div>
  );
}

function MealDetailModal({ recipe, day, onClose, rarityLabel, servings, onServingsChange }) {
  if (!recipe) return null;
  const scaledIngredients = (recipe.ingredients || []).map((ingredient) => scaleIngredientLine(ingredient, servings));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div><div className="text-sm text-slate-500">{day}</div><h2 className="mt-1 text-2xl font-semibold text-slate-900">{recipe.name}</h2><div className="mt-2 text-sm text-slate-500">{recipe.time} min · rarity {recipe.rarity} · {rarityLabel(recipe.rarity)}</div></div>
          <Button variant="outline" className="rounded-2xl" onClick={onClose}>Close</Button>
        </div>
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4"><div><div className="text-sm font-medium text-slate-900">Servings</div><div className="text-sm text-slate-500">Ingredient quantities scale automatically.</div></div><Badge className="rounded-xl px-3 py-1">{servings}x</Badge></div>
            <div className="mt-4"><Slider value={[servings]} min={1} max={6} step={1} onValueChange={(value) => onServingsChange(value[0])} /></div>
          </div>
          <div><h3 className="text-lg font-semibold text-slate-900">Ingredients</h3>{scaledIngredients.length > 0 ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">{scaledIngredients.map((ingredient, index) => <li key={`${recipe.id}-ingredient-${index}`}>{ingredient}</li>)}</ul> : <p className="mt-3 text-sm text-slate-500">No ingredients added yet.</p>}</div>
          <div><h3 className="text-lg font-semibold text-slate-900">Instructions</h3>{recipe.steps && recipe.steps.length > 0 ? <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm text-slate-700">{recipe.steps.map((step, index) => <li key={`${recipe.id}-step-${index}`}>{step}</li>)}</ol> : <p className="mt-3 text-sm text-slate-500">No instructions added yet.</p>}</div>
        </div>
      </div>
    </div>
  );
}

function AuthCard({ user, authReady, onSignIn, onSignOut }) {
  return (
    <Card className="rounded-3xl border-0 shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900"><Cloud className="h-4 w-4" />Account sync</div>
          {user ? <div className="mt-2 text-sm text-slate-600">Signed in as <span className="font-medium text-slate-900">{user.email}</span>. Your recipes sync across devices.</div> : <div className="mt-2 text-sm text-slate-600">Sign in with Google to store your personal recipes and weekly plan in the cloud.</div>}
        </div>
        <div className="flex shrink-0 gap-2">{user ? <Button variant="outline" className="rounded-2xl" onClick={onSignOut}><LogOut className="mr-2 h-4 w-4" />Sign out</Button> : <Button className="rounded-2xl" onClick={onSignIn} disabled={!authReady}><LogIn className="mr-2 h-4 w-4" />Sign in with Google</Button>}</div>
      </CardContent>
    </Card>
  );
}

export default function WeeklyRecipePlannerApp() {
  const initialState = useMemo(() => loadInitialState(), []);
  const [recipes, setRecipes] = useState(initialState.recipes);
  const [mealCount, setMealCount] = useState(initialState.mealCount);
  const [maxWeeklyTime, setMaxWeeklyTime] = useState(initialState.maxWeeklyTime);
  const [newRecipe, setNewRecipe] = useState({
    name: "",
    rarity: "",
    time: "",
    ingredientsText: "",
    ingredientTags: [],
    stepsText: "",
  });
  const [weeklyPlan, setWeeklyPlan] = useState(initialState.weeklyPlan);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [draggedMealIndex, setDraggedMealIndex] = useState(null);
  const [regenDayIndex, setRegenDayIndex] = useState(0);
  const [recipeServings, setRecipeServings] = useState(initialState.recipeServings);
  const [showGroceryList, setShowGroceryList] = useState(false);
  const [activeTab, setActiveTab] = useState("planner");
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(Boolean(supabase));
  const [syncStatus, setSyncStatus] = useState("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ recipes, mealCount, maxWeeklyTime, weeklyPlan: toSevenDayPlan(weeklyPlan, mealCount), recipeServings }));
  }, [recipes, mealCount, maxWeeklyTime, weeklyPlan, recipeServings]);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    setWeeklyPlan((current) => {
      const normalized = toSevenDayPlan(current, mealCount);
      const filledCount = normalized.filter(Boolean).length;
      if (filledCount >= mealCount) return normalized;
      const existingIds = normalized.filter(Boolean).map((recipe) => recipe.id);
      const slotsToFill = mealCount - filledCount;
      const additions = [];
      let remainingTime = maxWeeklyTime > 0 ? Math.max(0, maxWeeklyTime - normalized.reduce((sum, recipe) => sum + (recipe?.time || 0), 0)) : 0;
      for (let i = 0; i < slotsToFill; i += 1) {
        const pick = pickSingleRecipe(recipes, [...existingIds, ...additions.map((item) => item.id)], remainingTime);
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

  useEffect(() => {
    if (!supabase || !user) return;
    let cancelled = false;
    const loadCloudData = async () => {
      setSyncStatus("loading");
      const { data, error } = await supabase.from("user_recipe_plans").select("recipes, meal_count, max_weekly_time, weekly_plan, recipe_servings").eq("user_id", user.id).maybeSingle();
      if (cancelled) return;
      if (error && error.code !== "PGRST116") { setSyncStatus("error"); return; }
      if (data) {
        const nextRecipes = Array.isArray(data.recipes) && data.recipes.length > 0 ? data.recipes.map(normalizeRecipe) : [];
        const nextMealCount = Number(data.meal_count) || 5;
        const nextMaxTime = Number.isFinite(data.max_weekly_time) ? data.max_weekly_time : 240;
        setRecipes(nextRecipes.length > 0 ? nextRecipes : starterRecipes);
        setMealCount(nextMealCount);
        setMaxWeeklyTime(nextMaxTime);
        setWeeklyPlan(toSevenDayPlan(data.weekly_plan || [], nextMealCount));
        setRecipeServings(data.recipe_servings && typeof data.recipe_servings === "object" ? data.recipe_servings : {});
      }
      setSyncStatus("synced");
    };
    loadCloudData();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (!supabase || !user || syncStatus === "loading") return;
    const timeout = setTimeout(async () => {
      setSyncStatus("saving");
      const payload = { user_id: user.id, recipes, meal_count: mealCount, max_weekly_time: maxWeeklyTime, weekly_plan: toSevenDayPlan(weeklyPlan, mealCount), recipe_servings: recipeServings, updated_at: new Date().toISOString() };
      const { error } = await supabase.from("user_recipe_plans").upsert(payload, { onConflict: "user_id" });
      setSyncStatus(error ? "error" : "synced");
    }, 500);
    return () => clearTimeout(timeout);
  }, [recipes, mealCount, maxWeeklyTime, weeklyPlan, recipeServings, user?.id, syncStatus]);

  const totalPlanTime = useMemo(() => weeklyPlan.reduce((sum, recipe) => sum + (recipe?.time || 0), 0), [weeklyPlan]);
  const scheduledMeals = useMemo(() => weeklyPlan.slice(0, mealCount).filter(Boolean).length, [weeklyPlan, mealCount]);
  const groceryListItems = useMemo(() => buildGroceryList(weeklyPlan.slice(0, mealCount).filter(Boolean), recipeServings), [weeklyPlan, mealCount, recipeServings]);

  const rarityLabel = (value) => value === 1 ? "Very rare" : value === 2 ? "Rare" : value === 3 ? "Balanced" : value === 4 ? "Common" : "Very common";
  const syncLabel = user ? syncStatus === "saving" ? "Saving" : syncStatus === "synced" ? "Synced" : syncStatus === "loading" ? "Loading" : "Sync issue" : "Local only";
  const getRecipeServings = (recipe) => recipe?.id ? recipeServings[recipe.id] || 1 : 1;
  const updateRecipeServings = (recipeId, nextServings) => setRecipeServings((current) => ({ ...current, [recipeId]: nextServings }));
  const signInWithGoogle = async () => { if (supabase) await supabase.auth.signInWithOAuth({ provider: "google" }); };
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); };

  const addRecipe = () => {
    if (!newRecipe.name.trim()) return;

    const parsedRarity = Math.max(1, Math.min(5, Number(newRecipe.rarity) || 1));
    const parsedTime = Math.max(1, Number(newRecipe.time) || 1);
    const ingredientLines = newRecipe.ingredientsText.split("\\n");
    const ingredients = ingredientLines
      .map((item, index) => ({
        text: item.trim(),
        locationTag: (newRecipe.ingredientTags[index] || "").trim(),
      }))
      .filter((item) => item.text);
    const steps = newRecipe.stepsText
      .split("\\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const newId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());

    setRecipes((current) => [
      ...current,
      {
        id: newId,
        name: newRecipe.name.trim(),
        rarity: parsedRarity,
        time: parsedTime,
        ingredients,
        steps,
      },
    ]);

    setRecipeServings((current) => ({ ...current, [newId]: 1 }));
    setNewRecipe({
      name: "",
      rarity: "",
      time: "",
      ingredientsText: "",
      ingredientTags: [],
      stepsText: "",
    });
    setActiveTab("recipes");
  };

  const saveRecipe = (updatedRecipe) => {
    setRecipes((current) => current.map((recipe) => (recipe.id === updatedRecipe.id ? updatedRecipe : recipe)));
    setWeeklyPlan((current) => current.map((recipe) => (recipe?.id === updatedRecipe.id ? updatedRecipe : recipe)));
    setSelectedMeal((current) => current?.recipe?.id === updatedRecipe.id ? { ...current, recipe: updatedRecipe } : current);
  };

  const removeRecipe = (id) => {
    setRecipes((current) => current.filter((recipe) => recipe.id !== id));
    setWeeklyPlan((current) => current.map((recipe) => (recipe?.id === id ? null : recipe)));
    setSelectedMeal((current) => current?.recipe?.id === id ? null : current);
    setRecipeServings((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const rerollPlan = () => setWeeklyPlan(toSevenDayPlan(generatePlan(recipes, mealCount, maxWeeklyTime), mealCount));
  const rerollSingleDay = () => {
    setWeeklyPlan((current) => {
      const currentPlan = toSevenDayPlan(current, mealCount);
      const excludedIds = currentPlan.map((recipe, index) => (index !== regenDayIndex && recipe ? recipe.id : null)).filter(Boolean);
      const usedTimeWithoutDay = currentPlan.reduce((sum, recipe, index) => index === regenDayIndex ? sum : sum + (recipe?.time || 0), 0);
      const remainingTime = maxWeeklyTime > 0 ? Math.max(0, maxWeeklyTime - usedTimeWithoutDay) : 0;
      const replacement = pickSingleRecipe(recipes, excludedIds, remainingTime);
      if (!replacement) return currentPlan;
      const updated = [...currentPlan];
      updated[regenDayIndex] = replacement;
      setSelectedMeal((selected) => selected?.day === DAYS[regenDayIndex] ? { recipe: replacement, day: DAYS[regenDayIndex] } : selected);
      return updated;
    });
  };

  const handleDragStart = (event, draggedIndex) => {
    if (!weeklyPlan[draggedIndex]) return;
    setDraggedMealIndex(draggedIndex);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(draggedIndex));
  };
  const handleDragOver = (event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; };
  const handleDrop = (targetIndex) => {
    if (draggedMealIndex === null || draggedMealIndex === targetIndex) { setDraggedMealIndex(null); return; }
    setWeeklyPlan((current) => {
      const updated = [...current];
      const sourceRecipe = updated[draggedMealIndex] || null;
      const targetRecipe = updated[targetIndex] || null;
      if (!sourceRecipe) return toSevenDayPlan(updated, mealCount);
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
    { id: "settings", label: "Settings", icon: Settings2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4 lg:p-6 xl:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">Weekly Recipe Planner</CardTitle>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">Build your recipe pool, tune how often meals appear, and generate a week that matches your available cooking time.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="rounded-xl px-3 py-1">{recipes.length} recipes saved</Badge>
                  <Badge variant="secondary" className="rounded-xl px-3 py-1">{mealCount} meals planned</Badge>
                  <Badge variant="secondary" className="rounded-xl px-3 py-1">{syncLabel}</Badge>
                  <Button onClick={() => setShowGroceryList(true)} variant="outline" className="rounded-2xl"><ShoppingCart className="mr-2 h-4 w-4" />Grocery list</Button>
                  <Button onClick={rerollPlan} className="rounded-2xl"><Shuffle className="mr-2 h-4 w-4" />Generate week</Button>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-100 p-1">
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium transition ${isActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}><Icon className="h-4 w-4" /><span>{tab.label}</span></button>;
                  })}
                </div>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        <AuthCard user={user} authReady={authReady} onSignIn={signInWithGoogle} onSignOut={signOut} />

        <div className="grid gap-4 lg:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)] lg:gap-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="order-2 lg:order-1">
            {activeTab === "settings" && <Card className="rounded-3xl border-0 shadow-sm"><CardHeader><CardTitle className="text-lg">Settings</CardTitle></CardHeader><CardContent className="space-y-6"><div className="space-y-3"><div className="flex items-center justify-between"><Label>Meals to cook</Label><Badge variant="secondary" className="rounded-xl px-3 py-1">{mealCount}</Badge></div><Slider value={[mealCount]} min={1} max={7} step={1} onValueChange={(value) => setMealCount(value[0])} /></div><div className="space-y-3"><div className="flex items-center justify-between"><Label>Max weekly cook time</Label><Badge variant="secondary" className="rounded-xl px-3 py-1">{maxWeeklyTime} min</Badge></div><Slider value={[maxWeeklyTime]} min={0} max={600} step={15} onValueChange={(value) => setMaxWeeklyTime(value[0])} /></div><div className="space-y-3 rounded-2xl border p-4"><div className="flex items-center justify-between gap-3"><Label htmlFor="regen-day">Regenerate one day</Label><Button onClick={rerollSingleDay} variant="outline" className="rounded-2xl"><RefreshCw className="mr-2 h-4 w-4" />Regenerate day</Button></div><select id="regen-day" className="w-full rounded-2xl border bg-white px-3 py-2 text-sm" value={regenDayIndex} onChange={(e) => setRegenDayIndex(Number(e.target.value))}>{DAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></div></CardContent></Card>}

            {activeTab === "add" && (
              <Card className="rounded-3xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Add recipe</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr_0.7fr] md:items-end">
                    <div className="space-y-2">
                      <Label htmlFor="recipe-name">Recipe name</Label>
                      <Input
                        id="recipe-name"
                        placeholder="e.g. Lentil soup"
                        value={newRecipe.name}
                        onChange={(e) => setNewRecipe((c) => ({ ...c, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rarity">Rarity (1-5)</Label>
                      <Input
                        id="rarity"
                        type="number"
                        min={1}
                        max={5}
                        placeholder="1-5"
                        value={newRecipe.rarity}
                        onChange={(e) =>
                          setNewRecipe((c) => ({
                            ...c,
                            rarity:
                              e.target.value === ""
                                ? ""
                                : Math.max(1, Math.min(5, Number(e.target.value) || 1)),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Cook time (min)</Label>
                      <Input
                        id="time"
                        type="number"
                        min={1}
                        placeholder="Minutes"
                        value={newRecipe.time}
                        onChange={(e) =>
                          setNewRecipe((c) => ({
                            ...c,
                            time:
                              e.target.value === ""
                                ? ""
                                : Math.max(1, Number(e.target.value) || 1),
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1fr]">
                    <div className="space-y-2">
                      <Label htmlFor="ingredients">Ingredients (one per line)</Label>
                      <textarea
                        id="ingredients"
                        className="min-h-[180px] w-full rounded-2xl border bg-white px-3 py-2 text-sm outline-none ring-0"
                        value={newRecipe.ingredientsText}
                        onChange={(e) =>
                          setNewRecipe((current) => {
                            const ingredientLines = e.target.value.split("\\n");
                            return {
                              ...current,
                              ingredientsText: e.target.value,
                              ingredientTags: ingredientLines.map(
                                (_, index) => current.ingredientTags[index] || ""
                              ),
                            };
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Ingredient store location</Label>
                      <div className="min-h-[180px] space-y-2 rounded-2xl border p-3">
                        {newRecipe.ingredientsText.split("\\n").map((line, index) => {
                          const ingredientText = line.trim();
                          if (!ingredientText) return null;

                          return (
                            <div
                              key={`new-ingredient-tag-${index}`}
                              className="grid gap-2 md:grid-cols-[1fr_160px] md:items-center"
                            >
                              <div className="truncate text-sm text-slate-700">{ingredientText}</div>
                              <select
                                className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
                                value={newRecipe.ingredientTags[index] || ""}
                                onChange={(e) =>
                                  setNewRecipe((current) => ({
                                    ...current,
                                    ingredientTags: current.ingredientsText
                                      .split("\\n")
                                      .map((_, itemIndex) =>
                                        itemIndex === index
                                          ? e.target.value
                                          : current.ingredientTags[itemIndex] || ""
                                      ),
                                  }))
                                }
                              >
                                <option value="">Select location</option>
                                {INGREDIENT_LOCATION_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="steps">Steps (one per line)</Label>
                      <textarea
                        id="steps"
                        className="min-h-[180px] w-full rounded-2xl border bg-white px-3 py-2 text-sm outline-none ring-0"
                        value={newRecipe.stepsText}
                        onChange={(e) => setNewRecipe((c) => ({ ...c, stepsText: e.target.value }))}
                      />
                    </div>
                  </div>

                  <Button onClick={addRecipe} className="rounded-2xl">
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeTab === "recipes" && <Card className="rounded-3xl border-0 shadow-sm"><CardHeader><CardTitle className="text-lg">Recipe pool</CardTitle></CardHeader><CardContent><div className="grid gap-3">{recipes.length === 0 ? <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-500">No recipes yet. Add your first recipe above.</div> : recipes.map((recipe) => <RecipeEditorRow key={recipe.id} recipe={recipe} onSave={saveRecipe} onDelete={removeRecipe} rarityLabel={rarityLabel} />)}</div></CardContent></Card>}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="order-1 lg:order-2">
            <Card className="rounded-3xl border-0 shadow-sm">
              <CardHeader><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><CardTitle className="text-lg">Weekly calendar</CardTitle><p className="mt-1 text-sm text-slate-500">Your selected meals are assigned across the full week.</p></div><div className="flex gap-2"><Badge className="rounded-xl">{scheduledMeals} scheduled</Badge>{Math.max(0, mealCount - scheduledMeals) > 0 ? <Badge variant="secondary" className="rounded-xl">{Math.max(0, mealCount - scheduledMeals)} open</Badge> : null}</div></div></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 md:grid-cols-3"><div className="rounded-2xl bg-slate-100 p-4"><div className="text-xs uppercase tracking-wide text-slate-500">Total time</div><div className="mt-1 text-2xl font-semibold">{totalPlanTime} min</div></div><div className="rounded-2xl bg-slate-100 p-4"><div className="text-xs uppercase tracking-wide text-slate-500">Time cap</div><div className="mt-1 text-2xl font-semibold">{maxWeeklyTime === 0 ? "Off" : `${maxWeeklyTime} min`}</div></div><div className="rounded-2xl bg-slate-100 p-4"><div className="text-xs uppercase tracking-wide text-slate-500">Recipes available</div><div className="mt-1 text-2xl font-semibold">{recipes.length}</div></div></div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{DAYS.map((day, index) => { const recipe = weeklyPlan[index] || null; const isOutsideMealCount = index >= mealCount; return <div key={day} className={`min-h-[160px] rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${isOutsideMealCount ? "bg-slate-50/60" : ""}`} onDragOver={handleDragOver} onDrop={() => handleDrop(index)}><div className="flex items-center justify-between"><div className="text-sm font-semibold text-slate-900">{day}</div><Badge variant="outline" className="rounded-xl">{index < mealCount ? `Meal ${index + 1}` : "Open"}</Badge></div>{recipe ? <div className="mt-4 space-y-3"><div className="flex w-full cursor-move items-start gap-3 text-left" draggable onDragStart={(event) => handleDragStart(event, index)} onDragEnd={() => setDraggedMealIndex(null)}><button type="button" className="flex flex-1 items-start gap-3 text-left" onClick={() => setSelectedMeal({ recipe, day })}><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white"><UtensilsCrossed className="h-4 w-4" /></div><div className="min-w-0"><div className="font-medium text-slate-900">{recipe.name}</div><div className="mt-1 text-sm text-slate-500">Rarity {recipe.rarity} · {rarityLabel(recipe.rarity)}</div></div></button><div className="mt-2 text-slate-400"><GripVertical className="h-4 w-4" /></div></div><div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600"><div className="flex items-center gap-2"><Clock3 className="h-4 w-4" />{recipe.time} minutes</div></div></div> : <div className="mt-4 rounded-2xl border border-dashed p-4 text-sm text-slate-400">Drop a recipe here or regenerate this day.</div>}</div>; })}</div>
                <p className="text-xs leading-5 text-slate-500">Ingredient store locations now use dropdown menus with fixed categories when creating and editing recipes.</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <MealDetailModal recipe={selectedMeal?.recipe} day={selectedMeal?.day} onClose={() => setSelectedMeal(null)} rarityLabel={rarityLabel} servings={getRecipeServings(selectedMeal?.recipe)} onServingsChange={(value) => { if (!selectedMeal?.recipe?.id) return; updateRecipeServings(selectedMeal.recipe.id, value); }} />
      <GroceryListModal items={showGroceryList ? groceryListItems : null} onClose={() => setShowGroceryList(false)} />
    </div>
  );
}
