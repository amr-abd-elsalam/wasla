/**
 * worker.js — Cloudflare Worker v5.2
 *
 * Routes:
 *   GET  /course/paid/:courseId  → cookie check → 302 redirect to Drive OR Paid Login Page
 *   POST /api/paid/login         → verify email + password + courseId → set cookie + redirect
 *   GET  /api/ratings            → fetch ratings (cached 5 min)
 *   POST /api/ratings            → submit rating (IP dedup server-side)
 *   *                            → pass through to origin
 *
 * Environment Secrets:
 *   APPS_SCRIPT_URL   — Google Apps Script Web App URL
 *   COOKIE_SECRET     — Random string for HMAC-SHA256 cookie signing
 *   WHATSAPP_NUMBER   — WhatsApp number for purchase contact
 *   SCRIPT_API_KEY    — Shared secret for authenticating with Google Apps Script
 *
 * Environment Variables:
 *   ALLOWED_ORIGIN    — https://waslatalent.com
 */

'use strict';

// ============================================================
// CONSTANTS
// ============================================================

const RATINGS_CACHE_TTL   = 300;               // 5 min
const PAID_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days
const MAX_BODY_SIZE        = 1024;              // bytes

const RATE_LIMITS = Object.freeze({
  PAID_LOGIN:   { window: 60, max: 5  },
  GET_RATINGS:  { window: 60, max: 30 },
  POST_RATINGS: { window: 60, max: 5  }
});

// ============================================================
// ENTRY POINT
// ============================================================

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env, ctx);
    } catch (err) {
      console.error('Unhandled error:', err);
      return jsonResponse(500, { status: 'error', message: 'Internal server error' });
    }
  }
};

// ============================================================
// ROUTER
// ============================================================

async function handleRequest(request, env, ctx) {
  const url    = new URL(request.url);
  const path   = url.pathname;
  const method = request.method;

  // ── CORS preflight ──
  if (method === 'OPTIONS' && path.startsWith('/api/')) {
    return handleCorsPreflight(env);
  }

  // ── Paid course access gate ──
  if (path.startsWith('/course/paid/')) {
    return handlePaidCourseGate(request, env, ctx);
  }

  // ── Paid login ──
  if (path === '/api/paid/login' || path === '/api/paid/login/') {
    return handlePaidLogin(request, env, ctx);
  }

  // ── Ratings ──
  if (path === '/api/ratings' || path === '/api/ratings/') {
    return handleRatings(request, env, ctx);
  }

  // ── Everything else → origin ──
  return fetch(request);
}

// ============================================================
// CORS
// ============================================================

function getCorsHeaders(env) {
  return {
    'Access-Control-Allow-Origin':  env.ALLOWED_ORIGIN || '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400'
  };
}

function handleCorsPreflight(env) {
  return new Response(null, { status: 204, headers: getCorsHeaders(env) });
}

function isOriginAllowed(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  return origin === env.ALLOWED_ORIGIN;
}

// ============================================================
// HELPERS
// ============================================================

function jsonResponse(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders }
  });
}

function _escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================
// RATE LIMITING  (Cache API — per IP per action)
// ============================================================

async function checkRateLimit(ip, action) {
  const config = RATE_LIMITS[action];
  if (!config) return { allowed: true, remaining: 999, resetAt: 0 };

  const cache    = caches.default;
  const cacheKey = new Request(`https://rate-limit.internal/${action}/${ip}`);

  let data = { count: 0, windowStart: Date.now() };

  const cached = await cache.match(cacheKey);
  if (cached) {
    try { data = await cached.json(); } catch (e) {}
  }

  const now      = Date.now();
  const windowMs = config.window * 1000;

  if (now - data.windowStart > windowMs) {
    data = { count: 0, windowStart: now };
  }

  data.count++;

  const resetAt    = data.windowStart + windowMs;
  const ttlSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));

  await cache.put(
    cacheKey,
    new Response(JSON.stringify(data), {
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': `max-age=${ttlSeconds}`
      }
    })
  );

  return {
    allowed:   data.count <= config.max,
    remaining: Math.max(0, config.max - data.count),
    resetAt
  };
}

// ============================================================
// HMAC — COOKIE SIGNING
// ============================================================

async function signPayload(payload, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifySignature(payload, signature, secret) {
  const expected = await signPayload(payload, secret);
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

// ============================================================
// PAID COOKIE  (per-course — 30 days)
// ============================================================

function paidCookieName(courseId) {
  return `__paid_${courseId}`;
}

async function createPaidCookie(courseId, email, secret) {
  const now     = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    courseId: String(courseId),
    email,
    iat: now,
    exp: now + PAID_COOKIE_MAX_AGE
  });
  const encoded   = btoa(payload);
  const signature = await signPayload(encoded, secret);
  return `${encoded}.${signature}`;
}

async function parsePaidCookie(cookieValue, secret) {
  if (!cookieValue || typeof cookieValue !== 'string') return null;
  const dotIndex = cookieValue.lastIndexOf('.');
  if (dotIndex === -1) return null;
  const encoded   = cookieValue.substring(0, dotIndex);
  const signature = cookieValue.substring(dotIndex + 1);
  const valid     = await verifySignature(encoded, signature, secret);
  if (!valid) return null;
  try {
    const data = JSON.parse(atob(encoded));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch (e) { return null; }
}

function buildPaidCookieHeader(courseId, value) {
  return [
    `${paidCookieName(courseId)}=${value}`,
    `Path=/course/paid/${courseId}`,
    `Max-Age=${PAID_COOKIE_MAX_AGE}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict'
  ].join('; ');
}

// ============================================================
// COOKIE PARSER
// ============================================================

function getCookie(request, name) {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k.trim() === name) return rest.join('=').trim();
  }
  return null;
}

// ============================================================
// DRIVE URL  (Apps Script only — never cached, never sent to browser)
// ============================================================

async function getDriveUrl(courseId, env) {
  try {
    const res = await fetchWithTimeout(env.APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        action:   'getDriveUrl',
        courseId:  String(courseId),
        apiKey:   env.SCRIPT_API_KEY
      })
    }, 8000);

    if (!res.ok) return null;

    const data = await res.json();
    return (data.driveUrl && typeof data.driveUrl === 'string')
      ? data.driveUrl
      : null;
  } catch (e) {
    console.error('getDriveUrl error:', e);
    return null;
  }
}

// ============================================================
// PAID COURSE GATE
// ============================================================

async function handlePaidCourseGate(request, env, ctx) {
  const url    = new URL(request.url);
  const parts  = url.pathname.split('/');
  // /course/paid/:courseId → parts = ['', 'course', 'paid', ':courseId']
  const courseId = parts[3] ? parseInt(parts[3], 10) : NaN;

  if (isNaN(courseId) || courseId < 1) {
    return new Response('Not Found', { status: 404 });
  }

  // ── Check cookie ──
  const cookieValue = getCookie(request, paidCookieName(courseId));

  if (cookieValue) {
    const session = await parsePaidCookie(cookieValue, env.COOKIE_SECRET);

    if (session && String(session.courseId) === String(courseId)) {
      // Valid cookie → fetch driveUrl server-side → 302 redirect
      const driveUrl = await getDriveUrl(courseId, env);

      if (!driveUrl) {
        return buildErrorPage(
          'Course Unavailable',
          'This course content is temporarily unavailable. Please contact support via WhatsApp.',
          env.WHATSAPP_NUMBER || '',
          503
        );
      }

      return new Response(null, {
        status: 302,
        headers: {
          'Location':               driveUrl,
          'Cache-Control':          'no-store, no-cache, must-revalidate',
          'Referrer-Policy':        'no-referrer',
          'X-Content-Type-Options': 'nosniff'
        }
      });
    }
  }

  // ── No valid cookie → show Login Page ──
  return buildPaidLoginPage(courseId, null, env.WHATSAPP_NUMBER || '');
}

// ============================================================
// PAID LOGIN
// ============================================================

async function handlePaidLogin(request, env, ctx) {
  if (!isOriginAllowed(request, env)) {
    return jsonResponse(403, { status: 'error', message: 'Origin not allowed' });
  }

  const cors = getCorsHeaders(env);

  if (request.method !== 'POST') {
    return jsonResponse(405, { status: 'error', message: 'Method not allowed' }, cors);
  }

  // ── Content-Type validation ──
  var ct = request.headers.get('Content-Type') || '';
  if (!ct.includes('application/json')) {
    return jsonResponse(400,
      { status: 'error', message: 'Content-Type must be application/json' },
      cors);
  }

  // ── Rate limit ──
  const ip        = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateCheck = await checkRateLimit(ip, 'PAID_LOGIN');

  if (!rateCheck.allowed) {
    return jsonResponse(429, {
      status:  'error',
      message: 'Too many attempts. Please wait a moment.'
    }, {
      ...cors,
      'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000))
    });
  }

  // ── Parse body ──
  let body;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_SIZE) {
      return jsonResponse(400, { status: 'error', message: 'Request too large' }, cors);
    }
    body = JSON.parse(raw);
  } catch (e) {
    return jsonResponse(400, { status: 'error', message: 'Invalid JSON' }, cors);
  }

  const email    = typeof body.email    === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password                   : '';
  const courseId = parseInt(body.courseId, 10);

  // ── Validate ──
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse(400, { status: 'error', message: 'Valid email address is required' }, cors);
  }
  if (!password || password.length < 4 || password.length > 128) {
    return jsonResponse(400, { status: 'error', message: 'Invalid credentials' }, cors);
  }
  if (isNaN(courseId) || courseId < 1) {
    return jsonResponse(400, { status: 'error', message: 'Invalid course' }, cors);
  }

  // ── Verify against Apps Script ──
  let scriptResult;
  try {
    const res = await fetchWithTimeout(env.APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        action:   'verifyAccess',
        email,
        password,
        courseId:  String(courseId),
        apiKey:   env.SCRIPT_API_KEY
      })
    }, 8000);

    if (!res.ok) {
      return jsonResponse(502, { status: 'error', message: 'Verification service error' }, cors);
    }

    scriptResult = await res.json();
  } catch (err) {
    console.error('Paid login error:', err);
    return jsonResponse(502, { status: 'error', message: 'Verification service unavailable' }, cors);
  }

  // ── Invalid credentials ──
  if (!scriptResult.valid) {
    return jsonResponse(401, {
      status:  'error',
      message: 'Invalid email or password, or you are not enrolled in this course.'
    }, cors);
  }

  // ── Success → set cookie ──
  const cookieValue = await createPaidCookie(courseId, email, env.COOKIE_SECRET);

  return jsonResponse(200, {
    status:   'success',
    redirect: `/course/paid/${courseId}`
  }, {
    ...cors,
    'Set-Cookie': buildPaidCookieHeader(courseId, cookieValue)
  });
}

// ============================================================
// RATINGS
// ============================================================

async function handleRatings(request, env, ctx) {
  if (!isOriginAllowed(request, env)) {
    return jsonResponse(403, { status: 'error', message: 'Origin not allowed' });
  }
  const cors = getCorsHeaders(env);
  if (request.method === 'GET')  return handleGetRatings(request, env, ctx, cors);
  if (request.method === 'POST') return handlePostRating(request, env, ctx, cors);
  return jsonResponse(405, { status: 'error', message: 'Method not allowed' }, cors);
}

async function handleGetRatings(request, env, ctx, cors) {
  // ── Rate limit ──
  const ip        = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateCheck = await checkRateLimit(ip, 'GET_RATINGS');
  if (!rateCheck.allowed) {
    return jsonResponse(429, { status: 'error', message: 'Too many requests.' }, cors);
  }

  // ── Validate courseId ──
  const url           = new URL(request.url);
  const courseIdParam = url.searchParams.get('courseId');
  if (!courseIdParam) {
    return jsonResponse(400, { status: 'error', message: 'Missing courseId' }, cors);
  }
  const courseId = parseInt(courseIdParam, 10);
  if (isNaN(courseId) || courseId < 1 || String(courseId) !== courseIdParam) {
    return jsonResponse(400, { status: 'error', message: 'Invalid courseId' }, cors);
  }

  // ── Cache check ──
  const cache    = caches.default;
  const cacheKey = new Request(`https://ratings-cache.internal/ratings/${courseId}`);
  const cached   = await cache.match(cacheKey);
  if (cached) return jsonResponse(200, await cached.json(), cors);

  // ── Fetch from Apps Script (with apiKey) ──
  let data;
  try {
    const scriptUrl = `${env.APPS_SCRIPT_URL}?action=getRatings&courseId=${encodeURIComponent(courseId)}&apiKey=${encodeURIComponent(env.SCRIPT_API_KEY)}`;
    const res = await fetchWithTimeout(
      scriptUrl,
      { method: 'GET', headers: { 'Accept': 'application/json' } },
      8000
    );
    if (!res.ok) {
      return jsonResponse(502, { status: 'error', message: 'Backend error' }, cors);
    }
    data = await res.json();
  } catch (e) {
    return jsonResponse(502, { status: 'error', message: 'Backend unavailable' }, cors);
  }

  // ── Cache result ──
  ctx.waitUntil(cache.put(
    cacheKey,
    new Response(JSON.stringify(data), {
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': `max-age=${RATINGS_CACHE_TTL}`
      }
    })
  ));

  return jsonResponse(200, data, cors);
}

async function handlePostRating(request, env, ctx, cors) {
  // ── Rate limit ──
  const ip        = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateCheck = await checkRateLimit(ip, 'POST_RATINGS');
  if (!rateCheck.allowed) {
    return jsonResponse(429, { status: 'error', message: 'Too many requests.' }, cors);
  }

  // ── Content-Type ──
  const ct = request.headers.get('Content-Type') || '';
  if (!ct.includes('application/json')) {
    return jsonResponse(400, {
      status: 'error', message: 'Content-Type must be application/json'
    }, cors);
  }

  // ── Parse body ──
  let body;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_SIZE) {
      return jsonResponse(400, { status: 'error', message: 'Request too large' }, cors);
    }
    body = JSON.parse(raw);
  } catch (e) {
    return jsonResponse(400, { status: 'error', message: 'Invalid JSON' }, cors);
  }

  // ── Validate ──
  const courseId = parseInt(body.courseId, 10);
  if (isNaN(courseId) || courseId < 1) {
    return jsonResponse(400, { status: 'error', message: 'Invalid courseId' }, cors);
  }
  const rating = parseInt(body.rating, 10);
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return jsonResponse(400, { status: 'error', message: 'Rating must be 1–5' }, cors);
  }

  // ── Send to Apps Script (IP injected server-side, apiKey included) ──
  let data;
  try {
    const res = await fetchWithTimeout(env.APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        action:  'addRating',
        courseId,
        rating,
        ip,
        apiKey:  env.SCRIPT_API_KEY
      })
    }, 8000);
    if (!res.ok) {
      return jsonResponse(502, { status: 'error', message: 'Backend error' }, cors);
    }
    data = await res.json();
  } catch (e) {
    return jsonResponse(502, { status: 'error', message: 'Backend unavailable' }, cors);
  }

  // ── Bust ratings cache on success ──
  if (data.status === 'success') {
    const cache    = caches.default;
    const cacheKey = new Request(`https://ratings-cache.internal/ratings/${courseId}`);
    ctx.waitUntil(cache.delete(cacheKey));
  }

  return jsonResponse(200, data, cors);
}

// ============================================================
// PAID LOGIN PAGE
// ============================================================

function buildPaidLoginPage(courseId, errorMessage, whatsappNumber) {
  const errBlock = errorMessage
    ? `<div class="msg error" role="alert">${_escapeHtml(errorMessage)}</div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Course Access — Sign In</title>
  <meta name="robots" content="noindex, nofollow">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'unsafe-inline';
             script-src 'unsafe-inline'; connect-src 'self'; form-action 'none';">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0a0e1a; color: #e0e7ff;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      min-height: 100vh; display: flex;
      align-items: center; justify-content: center;
      padding: 1rem; -webkit-font-smoothing: antialiased;
    }
    .card {
      background: #111827; border: 1px solid rgba(96,165,250,0.12);
      border-radius: 20px; padding: 2.5rem 2rem;
      width: 100%; max-width: 420px;
      box-shadow: 0 8px 40px rgba(96,165,250,0.08);
      animation: fadeUp .4s ease both;
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .icon {
      width: 64px; height: 64px;
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      border-radius: 16px; display: flex;
      align-items: center; justify-content: center;
      margin: 0 auto 1.5rem;
      box-shadow: 0 4px 20px rgba(96,165,250,0.2);
    }
    h1 {
      text-align: center; font-size: 1.55rem; font-weight: 800;
      background: linear-gradient(135deg, #60a5fa, #818cf8, #a78bfa);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: .4rem; letter-spacing: -.02em;
    }
    .subtitle { text-align: center; font-size: .88rem; color: #6b7f99; margin-bottom: 2rem; }
    .field { margin-bottom: 1.1rem; }
    label { display: block; font-size: .82rem; font-weight: 600; color: #93bbfd; margin-bottom: .4rem; }
    input {
      width: 100%; background: #0c1021;
      border: 2px solid rgba(96,165,250,0.1);
      border-radius: 10px; color: #e0e7ff;
      padding: .75rem 1rem; font-size: .95rem;
      font-family: inherit;
      transition: border-color .2s, box-shadow .2s; outline: none;
    }
    input::placeholder { color: #4a5c6e; }
    input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
    input.invalid { border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.12); }
    .btn {
      width: 100%; padding: .85rem;
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      color: #e0e7ff; border: none; border-radius: 10px;
      font-size: 1rem; font-weight: 700; cursor: pointer;
      transition: all .25s; font-family: inherit; margin-top: .5rem;
    }
    .btn:hover:not(:disabled) {
      box-shadow: 0 0 24px rgba(96,165,250,0.25); transform: translateY(-2px);
    }
    .btn:disabled { opacity: .6; cursor: not-allowed; transform: none; }
    .spinner {
      display: inline-block; width: 18px; height: 18px;
      border: 2.5px solid rgba(224,231,255,.3);
      border-top-color: #e0e7ff; border-radius: 50%;
      animation: spin .7s linear infinite;
      vertical-align: middle; margin-right: .5rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .msg {
      margin-top: 1rem; padding: .75rem 1rem;
      border-radius: 8px; font-size: .85rem;
      font-weight: 500; display: none;
    }
    .msg.error   {
      background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.25);
      color: #fca5a5; display: block;
    }
    .msg.success {
      background: rgba(96,165,250,.1); border: 1px solid rgba(96,165,250,.25);
      color: #93bbfd; display: block;
    }
    .wa-hint {
      margin-top: 1.25rem; padding: .85rem 1rem;
      background: rgba(96,165,250,.05);
      border: 1px solid rgba(96,165,250,.1);
      border-radius: 10px; font-size: .8rem;
      color: #4a5c6e; text-align: center; line-height: 1.6;
    }
    .wa-hint a { color: #60a5fa; text-decoration: none; font-weight: 600; }
    .wa-hint a:hover { text-decoration: underline; }
    .back {
      display: block; text-align: center;
      margin-top: 1.5rem; font-size: .82rem;
      color: #4a5c6e; text-decoration: none;
      transition: color .15s;
    }
    .back:hover { color: #60a5fa; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon" aria-hidden="true">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
           stroke="#e0e7ff" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    </div>
    <h1>Course Access</h1>
    <p class="subtitle">Enter your enrolled email and password to access the course</p>
    <form id="form" novalidate>
      <div class="field">
        <label for="emailInput">Email Address</label>
        <input type="email" id="emailInput"
               placeholder="you@gmail.com"
               autocomplete="email" inputmode="email"
               maxlength="254" required>
      </div>
      <div class="field">
        <label for="passInput">Password</label>
        <input type="password" id="passInput"
               placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
               autocomplete="current-password" required>
      </div>
      <button type="submit" class="btn" id="submitBtn">Access My Course</button>
      <div id="msg" class="msg" role="alert" aria-live="polite">${errBlock}</div>
    </form>
    <div class="wa-hint">
      Don't have access yet?
      <a href="https://wa.me/${_escapeHtml(String(whatsappNumber))}"
         target="_blank" rel="noopener noreferrer">Contact us on WhatsApp</a>
      to purchase this course.
    </div>
    <a href="/course/" class="back">&#8592; Back to Course Catalog</a>
  </div>
  <script>
  (function () {
    'use strict';
    var COURSE_ID = ${parseInt(courseId, 10)};
    var form      = document.getElementById('form');
    var emailEl   = document.getElementById('emailInput');
    var passEl    = document.getElementById('passInput');
    var btn       = document.getElementById('submitBtn');
    var msgEl     = document.getElementById('msg');

    function showMsg(text, type) {
      msgEl.textContent = text;
      msgEl.className   = 'msg ' + type;
    }
    function clearMsg() { msgEl.textContent = ''; msgEl.className = 'msg'; }
    function setLoading(on) {
      btn.disabled = on;
      while (btn.firstChild) btn.removeChild(btn.firstChild);
      if (on) {
        var sp = document.createElement('span');
        sp.className = 'spinner';
        btn.appendChild(sp);
        btn.appendChild(document.createTextNode('Verifying...'));
      } else {
        btn.textContent = 'Access My Course';
      }
    }
    function validEmail(e) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(e); }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearMsg();
      emailEl.classList.remove('invalid');
      passEl.classList.remove('invalid');

      var email = emailEl.value.trim().toLowerCase();
      var pass  = passEl.value;

      if (!email) {
        showMsg('Email address is required.', 'error');
        emailEl.classList.add('invalid'); emailEl.focus(); return;
      }
      if (!validEmail(email)) {
        showMsg('Please enter a valid email address.', 'error');
        emailEl.classList.add('invalid'); emailEl.focus(); return;
      }
      if (!pass) {
        showMsg('Password is required.', 'error');
        passEl.classList.add('invalid'); passEl.focus(); return;
      }

      setLoading(true);

      fetch('/api/paid/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email, password: pass, courseId: COURSE_ID })
      })
      .then(function (r) {
        return r.json().then(function (d) { return { status: r.status, data: d }; });
      })
      .then(function (res) {
        if (res.status === 200 && res.data.status === 'success') {
          showMsg('Access granted! Redirecting to your course...', 'success');
          btn.disabled = true;
          setTimeout(function () {
            window.location.replace(res.data.redirect);
          }, 1500);
        } else if (res.status === 429) {
          showMsg('Too many attempts. Please wait a moment.', 'error');
          setLoading(false);
        } else {
          showMsg(
            res.data.message || 'Invalid credentials. Please check your email and password.',
            'error'
          );
          setLoading(false);
        }
      })
      .catch(function () {
        showMsg('Connection error. Please check your internet and try again.', 'error');
        setLoading(false);
      });
    });
  })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type':           'text/html; charset=utf-8',
      'Cache-Control':          'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options':        'DENY',
      'Referrer-Policy':        'strict-origin-when-cross-origin'
    }
  });
}

// ============================================================
// ERROR PAGE
// ============================================================

function buildErrorPage(title, message, whatsappNumber, statusCode) {
  const waLink = whatsappNumber
    ? `<a href="https://wa.me/${_escapeHtml(String(whatsappNumber))}"
          target="_blank" rel="noopener noreferrer">Contact support on WhatsApp</a>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${_escapeHtml(title)}</title>
  <meta name="robots" content="noindex, nofollow">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0a0e1a; color: #e0e7ff;
      font-family: system-ui, sans-serif; min-height: 100vh;
      display: flex; align-items: center;
      justify-content: center; padding: 1rem;
    }
    .card {
      background: #111827; border: 1px solid rgba(239,68,68,0.2);
      border-radius: 16px; padding: 2rem;
      max-width: 420px; width: 100%; text-align: center;
    }
    h1 { color: #fca5a5; font-size: 1.3rem; margin-bottom: .75rem; }
    p  { color: #6b7f99; font-size: .9rem; line-height: 1.6; margin-bottom: 1.25rem; }
    a  {
      color: #60a5fa; text-decoration: none; font-size: .85rem;
      border: 1px solid rgba(96,165,250,.2); border-radius: 8px;
      padding: .5rem 1rem; display: inline-block;
      transition: all .2s; margin: .25rem;
    }
    a:hover { background: rgba(96,165,250,.05); }
  </style>
</head>
<body>
  <div class="card">
    <h1>${_escapeHtml(title)}</h1>
    <p>${_escapeHtml(message)}</p>
    ${waLink}
    <a href="/course/">Back to Courses</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: statusCode || 500,
    headers: {
      'Content-Type':  'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
