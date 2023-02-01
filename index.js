const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const mongoose = require("mongoose");
const typeDefs = require("./graphql/typeDefs.js");

require("dotenv").config();

const resolvers = require("./graphql/resolvers");

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const port = process.env.PORT || 5000;

mongoose
  .connect(process.env.URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: true,
    useCreateIndex: true,
  })
  .then(() => {
    console.log("\nSUCCESS: CONNECTED TO DATABASE");
    return startStandaloneServer(server, {
      context: async ({ req }) => ({ token: req.headers.token }),
      listen: { port },
    });
  })
  .then((res) => {
    console.log(`SERVER RUNNING AT ${res.url}\n`);
  })
  .catch((err) => {
    console.error(err);
  });
