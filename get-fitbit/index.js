const express = require("express");
const axios = require("axios");
const qs = require("qs");
const fs = require("fs");
require("dotenv").config();

const app = express();
const port = 3000;

const AUTH_URL = `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${process.env.FITBIT_CLIENT_ID}&redirect_uri=http://localhost:3000/callback&scope=activity heartrate sleep&expires_in=604800`;
const TOKEN_ENDPOINT = "https://api.fitbit.com/oauth2/token";

// Utility function to save tokens to .env file (with update logic)
function saveTokensToEnv(tokens) {
  const envFilePath = ".env";
  let envContent = fs.existsSync(envFilePath)
    ? fs.readFileSync(envFilePath, "utf8")
    : "";

  const tokenMap = {
    FITBIT_ACCESS_TOKEN: tokens.access_token,
    FITBIT_REFRESH_TOKEN: tokens.refresh_token,
    FITBIT_EXPIRES_IN: tokens.expires_in,
    FITBIT_USER_ID: tokens.user_id,
  };

  for (const [key, value] of Object.entries(tokenMap)) {
    const regex = new RegExp(`^${key}=.*`, "m");
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envFilePath, envContent.trim() + "\n");
  console.log("Tokens updated in .env");
}

// Step 1: Manual authorization (one-time setup)
app.get("/auth", (req, res) => {
  res.redirect(AUTH_URL);
});

// Step 2: Handle the callback and exchange code for tokens
app.get("/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    console.error("Authorization code not found");
    res.status(400).send("Authorization code not found");
    return;
  }

  console.log("Authorization code received:", code);

  try {
    const response = await axios.post(
      TOKEN_ENDPOINT,
      qs.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: "http://localhost:3000/callback",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString("base64")}`,
        },
      },
    );

    console.log("Access Token:", response.data.access_token);
    console.log("Refresh Token:", response.data.refresh_token);
    saveTokensToEnv(response.data);

    res.send("Authorization successful! Tokens updated.");
    const activitySummary = await fetchDailyActivitySummary(
      response.data.access_token,
      response.data.user_id,
    );
    console.log("Activity Summary:", activitySummary);
  } catch (error) {
    if (error.response) {
      console.error("Error exchanging code for token:", error.response.data);
      res
        .status(500)
        .send(`Authorization failed: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error("Request error:", error.message);
      res.status(500).send("Authorization failed: Internal server error.");
    }
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(
    "Visit http://localhost:3000/auth to start the authorization process.",
  );
});

// Step 3: Refresh token and fetch data
async function refreshAccessToken() {
  const refreshToken = process.env.FITBIT_REFRESH_TOKEN;

  if (!refreshToken) {
    console.error("Refresh token not found in .env");
    return;
  }

  try {
    const response = await axios.post(
      TOKEN_ENDPOINT,
      qs.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString("base64")}`,
        },
      },
    );

    console.log("New Access Token:", response.data.access_token);
    saveTokensToEnv(response.data);
  } catch (error) {
    if (error.response) {
      console.error("Error refreshing token:", error.response.data);
    } else {
      console.error("Request error:", error.message);
    }
  }
}

async function fetchDailyActivitySummary(accessToken, userId) {
  if (!userId) {
    console.error("User ID not found in .env");
    return;
  }

  const currentDate = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD
  const apiUrl = `https://api.fitbit.com/1/user/${userId}/activities/date/${currentDate}.json`;

  try {
    const response = await axios.get(apiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(
        "Error fetching daily activity summary:",
        error.response.data,
      );
    } else {
      console.error("Request error:", error.message);
    }
  }
}

// Step 4: Headless mode execution
(async function headlessMode() {
  const accessToken = process.env.FITBIT_ACCESS_TOKEN;
  const userId = process.env.FITBIT_USER_ID;

  if (!accessToken || !userId) {
    console.log("Access token or user ID not found.");
    console.log(
      "Please visit http://localhost:3000/auth to authorize the application.",
    );
    return;
  }

  console.log("Access token and user ID found. Proceeding to fetch data...");

  try {
    await refreshAccessToken(); // Refresh token before fetching data
    const newAccessToken = process.env.FITBIT_ACCESS_TOKEN; // Reload access token after refresh
    const activitySummary = await fetchDailyActivitySummary(
      newAccessToken,
      userId,
    );
    console.log("Activity Summary:", JSON.stringify(activitySummary, null, 2));
  } catch (error) {
    console.error("An error occurred during the process:", error.message);
  }
})();
