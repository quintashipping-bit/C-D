// src/services/exchangeRates.js
//
// Fetches GBP-based rates using a 4-source fallback chain.
// Sources tried in order — first success wins:
//   1. open.er-api.com          (free, no key, CORS, ECB-aligned)
//   2. exchangerate-api.com v4  (free, no key, CORS)
//   3. fawazahmed0 via jsDelivr CDN (static JSON, very reliable)
//   4. fawazahmed0 via Cloudflare Pages backup
//   5. Firestore admin-set manual rates (Settings → Exchange Rates)
//   6. Hardcoded approximate fallback (app never breaks)
//
// Results are cached in Firestore once per calendar day.

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const CACHE_KEY = "fxRatesCache";
const COLL      = "settings";

const NEEDED = ["AUD", "ZAR", "USD", "EUR", "SGD", "SAR", "QAR"];

// Hardcoded last-resort fallback
const HARDCODED = {
  AUD: 2.01, ZAR: 23.50, USD: 1.27,
  EUR: 1.18, SGD: 1.71,  SAR: 4.76,
  QAR: 4.63, GBP: 1,
};

/* ── Source definitions ─────────────────────────────────── */

async function tryOpenErApi() {
  const res  = await fetch("https://open.er-api.com/v6/latest/GBP", { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`open.er-api HTTP ${res.status}`);
  const data = await res.json();
  if (data.result !== "success") throw new Error("open.er-api bad result");
  return pick(data.rates);
}

async function tryExchangeRateApi() {
  const res  = await fetch("https://api.exchangerate-api.com/v4/latest/GBP", { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`exchangerate-api HTTP ${res.status}`);
  const data = await res.json();
  return pick(data.rates);
}

async function tryFawazahmedJsDelivr() {
  const res  = await fetch(
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/gbp.min.json",
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new Error(`jsdelivr HTTP ${res.status}`);
  const data = await res.json();
  // Response: { "date": "...", "gbp": { "aud": 2.01, ... } }
  const raw = data.gbp || data.GBP;
  if (!raw) throw new Error("fawazahmed0 unexpected format");
  // Keys are lowercase — convert to uppercase
  const rates = {};
  NEEDED.forEach(c => { if (raw[c.toLowerCase()]) rates[c] = raw[c.toLowerCase()]; });
  if (Object.keys(rates).length < 3) throw new Error("fawazahmed0 insufficient rates");
  return rates;
}

async function tryFawazahmedCloudflare() {
  const res  = await fetch(
    "https://latest.currency-api.pages.dev/v1/currencies/gbp.min.json",
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new Error(`cloudflare-pages HTTP ${res.status}`);
  const data = await res.json();
  const raw  = data.gbp || data.GBP;
  if (!raw) throw new Error("cloudflare-pages unexpected format");
  const rates = {};
  NEEDED.forEach(c => { if (raw[c.toLowerCase()]) rates[c] = raw[c.toLowerCase()]; });
  if (Object.keys(rates).length < 3) throw new Error("cloudflare-pages insufficient rates");
  return rates;
}

function pick(rates) {
  const out = {};
  NEEDED.forEach(c => { if (rates[c]) out[c] = rates[c]; });
  if (Object.keys(out).length < 3) throw new Error("Insufficient rates in response");
  return out;
}

/* ── Main export ────────────────────────────────────────── */

export async function getExchangeRates() {
  const today = new Date().toISOString().slice(0, 10);

  // 1. Firestore cache (if today's rates already fetched)
  try {
    const snap = await getDoc(doc(db, COLL, CACHE_KEY));
    if (snap.exists()) {
      const d = snap.data();
      if (d.date === today && d.rates && Object.keys(d.rates).length >= 4) {
        return { ...d.rates, GBP: 1, _source: d.apiSource || "cache", _date: today, _cached: true };
      }
    }
  } catch (e) {
    console.warn("FX cache read failed:", e.message);
  }

  // 2. Try live APIs in order
  const sources = [
    { name: "open.er-api.com",     fn: tryOpenErApi          },
    { name: "exchangerate-api.com", fn: tryExchangeRateApi   },
    { name: "fawazahmed0/jsDelivr", fn: tryFawazahmedJsDelivr },
    { name: "fawazahmed0/Cloudflare", fn: tryFawazahmedCloudflare },
  ];

  for (const { name, fn } of sources) {
    try {
      const rates = await fn();
      const full  = { ...rates, GBP: 1 };

      // Cache in Firestore
      try {
        await setDoc(doc(db, COLL, CACHE_KEY), {
          rates: full,
          date: today,
          fetchedAt: new Date().toISOString(),
          apiSource: name,
        });
      } catch (e) {
        console.warn("FX cache write failed:", e.message);
      }

      return { ...full, _source: name, _date: today, _cached: false };
    } catch (e) {
      console.warn(`FX source "${name}" failed:`, e.message);
    }
  }

  // 3. Admin-set manual rates from Firestore settings
  try {
    const snap = await getDoc(doc(db, COLL, "exchangeRatesManual"));
    if (snap.exists() && snap.data().rates) {
      console.info("FX: using admin-set manual rates");
      return { ...snap.data().rates, GBP: 1, _source: "manual", _date: today };
    }
  } catch (e) {
    console.warn("FX manual rates read failed:", e.message);
  }

  // 4. Hardcoded fallback — app always works
  console.warn("FX: all sources failed, using hardcoded fallback rates");
  return { ...HARDCODED, _source: "fallback", _date: today };
}

/* ── Helpers ────────────────────────────────────────────── */

/** Convert from a foreign currency amount to GBP */
export function toGBP(amount, fromCurrency, rates) {
  if (!fromCurrency || fromCurrency === "GBP") return amount;
  const rate = rates[fromCurrency];
  return rate ? amount / rate : amount;
}

/** Convert from GBP to a target currency */
export function fromGBP(amount, toCurrency, rates) {
  if (!toCurrency || toCurrency === "GBP") return amount;
  const rate = rates[toCurrency];
  return rate ? amount * rate : amount;
}

/** Currency display symbols */
export const SYMBOLS = {
  GBP: "£", USD: "$", EUR: "€",
  AUD: "A$", ZAR: "R", SGD: "S$",
  SAR: "SR", QAR: "QR",
};

/** Input currency per destination country */
export const COUNTRY_INPUT_CURRENCY = {
  "AUSTRALIA":    "AUD",
  "SOUTH AFRICA": "ZAR",
  "SINGAPORE":    "SGD",
  "SAUDI ARABIA": "SAR",
  "KSA":          "SAR",
  "QATAR":        "QAR",
};

/** Office/home currency by user location */
export const OFFICE_CURRENCIES = {
  UK:      "GBP",
  USA:     "USD",
  GERMANY: "EUR",
};
