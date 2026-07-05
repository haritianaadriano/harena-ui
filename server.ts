/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;
const REMOTE_API_URL = "https://harena-api-ji5b.onrender.com";

// Express middlewares
app.use(express.json());

// Proxy all /api/* requests to the remote server
app.all("/api/*", async (req, res) => {
  // Strip '/api' prefix from the incoming path (e.g., /api/auth/signin -> /auth/signin)
  const targetPath = req.originalUrl.replace(/^\/api/, "");
  const targetUrl = `${REMOTE_API_URL}${targetPath}`;

  try {
    const headers: Record<string, string> = {};

    // Copy original request headers, excluding host
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined && key.toLowerCase() !== "host") {
        headers[key] = Array.isArray(value) ? value.join(", ") : value;
      }
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers: headers,
    };

    // Forward the request body if it is a write method and contains a body
    if (req.method !== "GET" && req.method !== "HEAD" && req.body !== undefined) {
      if (typeof req.body === "object") {
        fetchOptions.body = JSON.stringify(req.body);
        headers["content-type"] = "application/json";
      } else {
        fetchOptions.body = req.body;
      }
    }

    // Call the remote server
    const apiResponse = await fetch(targetUrl, fetchOptions);

    // Forward the response status
    res.status(apiResponse.status);

    // Copy relevant headers from the remote response
    apiResponse.headers.forEach((value, key) => {
      if (!["transfer-encoding", "content-encoding", "connection", "content-length"].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    if (apiResponse.status === 204) {
      res.end();
      return;
    }

    const contentType = apiResponse.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        const json = await apiResponse.json();
        res.json(json);
      } catch {
        res.end();
      }
    } else {
      const text = await apiResponse.text();
      res.send(text);
    }
  } catch (error: any) {
    console.error(`Proxy error for ${targetUrl}:`, error);
    res.status(500).json({
      type: "InternalServerException",
      message: `Failed to forward request to Harena API: ${error.message}`
    });
  }
});

// SPA Fallback & Vite Configuration
async function start() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite dev server middleware in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    // Serve production build files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Harena Full-Stack Proxy App running on port ${PORT}`);
  });
}

start();
