const { ApolloServer, PubSub } = require("apollo-server");
const mongoose = require("mongoose");
const typeDefs = require("./graphql/typeDefs.js")

require("dotenv").config();

const resolvers = require("./graphql/resolvers");
const pubSub = new PubSub();

const server = new ApolloServer({
  typeDefs,
  cors: {
    origin: process.env.CLIENT_ORIGIN,
    credentials: true
  },
  resolvers,
  context: ({ req }) => ({ req, pubSub })
});

const port = (process.env.PORT || 5000)

mongoose
  .connect(process.env.URI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: true })
  .then(() => {
    console.log("\nSUCCESS: CONNECTED TO DATABASE");
    return server.listen({ port: port });
  })
  .then(res => {
    console.log(`SERVER RUNNING AT ${res.url}\n`);
  })
  .catch(err => {
    console.error(err);
  });
