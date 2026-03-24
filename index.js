const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const {
  ApolloServerPluginDrainHttpServer,
} = require("@apollo/server/plugin/drainHttpServer");
const express = require("express");
const http = require("http");
const { json } = require("body-parser");
const mongoose = require("mongoose");
const typeDefs = require("./graphql/typeDefs.js");
const cors = require("cors");
require("dotenv").config();

const CRITICAL_CHATBOT_ENV_VARS = [
  "LITELLM_VIRTUAL_KEY",
  "GOOGLE_CALENDAR_API_KEY",
];

const OPTIONAL_CHATBOT_ENV_VARS = [
  "LITELLM_VECTOR_STORE_IDS",
];

function runChatbotEnvStartupInfo() {
  console.log("\n[chatbot] STARTUP CONFIG CHECK (non-blocking)");

  const missingCritical = [];

  CRITICAL_CHATBOT_ENV_VARS.forEach((key) => {
    const isSet = Boolean(process.env[key]);
    console.log(`[chatbot] ${key}: ${isSet ? "set" : "missing"}`);
    if (!isSet) {
      missingCritical.push(key);
    }
  });

  OPTIONAL_CHATBOT_ENV_VARS.forEach((key) => {
    const isSet = Boolean(process.env[key]);
    console.log(`[chatbot] ${key}: ${isSet ? "configured" : "not configured (RAG disabled if missing)"}`);
  });

  console.log("[chatbot] classifier model: llama-3.1-8b-instruct (config)");
  console.log("[chatbot] response model: llama-3.1-70b-instruct (config)");
  console.log("[chatbot] classifier temperature: 0.1 (config)");
  console.log("[chatbot] response temperature: 0.2 (config)");

  if (missingCritical.length) {
    console.warn(
      `[chatbot] Missing required env vars: ${missingCritical.join(", ")}`
    );
    console.warn(
      "[chatbot] Chatbot requests will fail until these are set. See CHATBOT_DEVELOPER_GUIDE.md"
    );
    console.warn("[chatbot] NOTE: Server will continue running without chatbot.");
  } else {
    console.log("[chatbot] Config status: ready");
  }
}

const port = process.env.PORT || 5000;

runChatbotEnvStartupInfo();

const resolvers = require("./graphql/resolvers");

const startApolloServer = async () => {
  const app = express();
  const httpServer = http.createServer(app);
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });
  await server.start();

  app.use(
    cors({ origin: [RegExp(process.env.CLIENT_ORIGIN)], credentials: true }),
    json(),
    expressMiddleware(server)
  );
  await new Promise((resolve) => httpServer.listen({ port }, resolve));
  const addr = httpServer.address();
  const host = addr.address === '::' ? 'localhost' : addr.address;
  const hport = addr.port;
  console.log(`SERVER RUNNING AT http://${host}:${hport}/`);
};

mongoose
  .connect(process.env.URI, {})
  .then(() => {
    console.log("\nSUCCESS: CONNECTED TO DATABASE");
    startApolloServer();
  })
  .catch((err) => {
    console.error(err);
  });
