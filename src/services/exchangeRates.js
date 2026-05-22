// src/services/exchangeRates.js
// Fetches GBP-based rates from frankfurter.app (free, ECB data, no API key)
// Caches in Firestore once per day to minimise external calls
// Falls back to hardcoded rates if both sources fail

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const CACHE_DOC  = "fxRatesCache";
const CACHE_COLL = "settings";
const API_URL    = "https://api.frankfurter.app/latest?from=GBP&to=AUD,ZAR,USD,EUR,SGD,SAR,QAR";

// Fallback rates — used only if API and Firestore both fail
const FALLBACK = {
  AUD: 2.01, ZAR: 23.5,  USD: 1.27,
  EUR: 1.18, SGD: 1.71,  SAR: 4.76,
  QAR: 4.63, GBP: 1,
};

/**
 * Returns rates: { AUD, ZAR, USD, EUR, SGD, SAR, QAR, GBP }
 * All rates are: 1 GBP = X foreign currency
 * Fetches fresh from API once per calendar day, caches in Firestore.
 */
export async function getExchangeRates() {
  const today = new Date().toISOString().slice(0, 10);

  // 1. Check Firestore cache first
  try {
    const snap = await getDoc(doc(db, CACHE_COLL, CACHE_DOC));
    if (snap.exists()) {
      const cached = snap.data();
      if (cached.date === today && cached.rates) {
        return { ...cached.rates, GBP: 1, _source: "cache", _date: today };
      }
    }
  } catch (e) {
    console.warn("FX cache read failed:", e.message);
  }

  // 2. Fetch fresh from frankfurter.app (free, no key, CORS-enabled, ECB data)
  try {
    const res  = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rates = { ...data.rates, GBP: 1 };

    // Write to Firestore cache
    try {
      await setDoc(doc(db, CACHE_COLL, CACHE_DOC), {
        rates,
        date: today,
        fetchedAt: new Date().toISOString(),
        source: "frankfurter.app"
      });
    } catch (e) {
      console.warn("FX cache write failed:", e.message);
    }

    return { ...rates, _source: "live", _date: today };
  } catch (e) {
    console.warn("FX live fetch failed, using fallback:", e.message);
    return { ...FALLBACK, _source: "fallback", _date: today };
  }
}

/** Convert from a foreign currency to GBP */
export function toGBP(amount, fromCurrency, rates) {
  if (fromCurrency === "GBP" || !fromCurrency) return amount;
  const rate = rates[fromCurrency];
  return rate ? amount / rate : amount;
}

/** Convert from GBP to a target currency */
export function fromGBP(amount, toCurrency, rates) {
  if (toCurrency === "GBP" || !toCurrency) return amount;
  const rate = rates[toCurrency];
  return rate ? amount * rate : amount;
}

/** Currency display symbols */
export const SYMBOLS = {
  GBP: "£", USD: "$",  EUR: "€",
  AUD: "A$", ZAR: "R", SGD: "S$",
  SAR: "SR", QAR: "QR",
};

/**
 * What currency should the "Goods value" input show for each destination?
 * Australia → AUD, South Africa → ZAR, etc.
 * For Qatar/Saudi/Singapore the result is still in their local currency.
 */
export const COUNTRY_INPUT_CURRENCY = {
  "AUSTRALIA":    "AUD",
  "SOUTH AFRICA": "ZAR",
  "SINGAPORE":    "SGD",
  "SAUDI ARABIA": "SAR",
  "KSA":          "SAR",
  "QATAR":        "QAR",
};

/** Office/user currency — used when no country-specific override applies */
export const OFFICE_CURRENCIES = {
  UK:      "GBP",
  USA:     "USD",
  GERMANY: "EUR",
};
