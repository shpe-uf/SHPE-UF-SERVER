const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const {
  ApolloServerPluginDrainHttpServer,
} = require("@apollo/server/plugin/drainHttpServer");
const { startStandaloneServer } = require("@apollo/server/standalone");
const express = require("express");
const http = require("http");
const { json } = require("body-parser");
const mongoose = require("mongoose");
const typeDefs = require("./graphql/typeDefs.js");
const cors = require("cors");
require("dotenv").config();

const resolvers = require("./graphql/resolvers");
const checkAuth = require('./util/check-auth');

const port = process.env.PORT || 5000;

startApolloServer = async () => {
  const app = express();
  const httpServer = http.createServer(app);
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    
  });
  const {url} = await startStandaloneServer((server), {
    listen: {port},
    context: async ({ req }) => { 

      const authHeader = req.headers.authorization || '';
      const user = checkAuth(authHeader);

      return {user};
    }
  });
    console.log(`SERVER RUNNING AT localhost:${process.env.PORT}`);
}
  /*app.use(
    cors({ origin: [RegExp(process.env.CLIENT_ORIGIN)], credentials: true }),
    json(),
    expressMiddleware(server)
  );*/
  
mongoose
  .connect(process.env.URI, {})
  .then(() => {
    console.log("\nSUCCESS: CONNECTED TO DATABASE");
    startApolloServer();
  })
  .catch((err) => {
    console.error(err);
  });
