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
const User = require("./models/User.js");

const resolvers = require("./graphql/resolvers");

const port = process.env.PORT || 5000;

function coerceBoolean(value) {
  if (value === true) return true;
  if (value === false) return false;
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === '' || v === 'not graduating') return false;
    if (v === 'false' || v === 'no' || v === 'n' || v === '0') return false;
    if (v === 'true' || v === 'yes' || v === 'y' || v === '1') return true;

    return true;
  }
  return Boolean(value);
}

async function migrateGraduatingToBooleanIfNeeded() {
  if (process.env.RUN_GRADUATING_MIGRATION !== 'true') return;

  const users = await User.find();
  await Promise.all(
    users.map(async (user) => {
      const nextGraduating = coerceBoolean(user.graduating);
      if (user.graduating === nextGraduating) return;
      await User.findByIdAndUpdate(user._id, { graduating: nextGraduating });
    })
  );
}

async function updateUserYearsIfNeeded() {
  const users = await User.find();
  const currDate = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;

  await Promise.all(
    users.map(async (user) => {
      let updatedAt = currDate;
      let year = user.year;

      if (user.updatedAt) updatedAt = new Date(user.updatedAt);
      const difference = Math.round((currDate - updatedAt) / msPerDay);

      if (difference < 365) return;

      if (year === "1st Year") year = "2nd Year";
      else if (year === "2nd Year") year = "3rd Year";
      else if (year === "3rd Year") year = "4th Year";
      else if (year === "4th Year") year = "5th Year or Higher";

      await User.findByIdAndUpdate(user._id, {
        year,
        updatedAt: currDate.toISOString(),
      });
    })
  );
}

function startYearUpdateScheduler() {
  updateUserYearsIfNeeded().catch((err) => console.error(err));
  setInterval(() => {
    updateUserYearsIfNeeded().catch((err) => console.error(err));
  }, 24 * 60 * 60 * 1000);
}

startApolloServer = async () => {
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
    migrateGraduatingToBooleanIfNeeded().catch((err) => console.error(err));
    startYearUpdateScheduler();
    startApolloServer();
  })
  .catch((err) => {
    console.error(err);
  });
