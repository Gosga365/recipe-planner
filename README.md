# Weekly Recipe Planner

A React + Vite meal planning app for:
- building a personal recipe library
- generating a weekly meal plan
- adjusting servings per recipe
- creating a combined grocery list
- signing in with Google
- syncing your personal recipes and weekly plan across devices

This project is designed to deploy easily on **Vercel** as a **Vite** app. Vercel supports Vite directly, and Vite client environment variables must use the `VITE_` prefix. :contentReference[oaicite:0]{index=0}

It uses **Supabase** for:
- Google authentication
- database storage
- per-user access control with Row Level Security (RLS) :contentReference[oaicite:1]{index=1}

---

## Features

- Weekly planner with 7-day calendar
- Recipe rarity weighting
- Cook-time budgeting
- Drag-and-drop rescheduling
- Per-recipe servings memory
- Grocery list generation
- Hidden ingredient location tags for grocery-store sections
- Google sign-in
- Cross-device sync for each signed-in user

---

## Tech stack

- React
- Vite
- Supabase Auth
- Supabase Postgres
- Vercel

---

## Local development

### 1. Install dependencies

```bash
npm install