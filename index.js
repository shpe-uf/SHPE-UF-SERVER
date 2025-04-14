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
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const resolvers = require("./graphql/resolvers");

const port = process.env.PORT || 5000;

startApolloServer = async () => {
  const app = express();
  const httpServer = http.createServer(app);

  app.use('/.well-known', express.static(path.join(__dirname, '.well-known'), {
    setHeaders: (res) => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }));

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
