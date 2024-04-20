const jwt = require("jsonwebtoken");
const { AuthenticationError } = require("apollo-server");

require("dotenv").config();

module.exports = (authHeader) => {
  if (authHeader) {
    //console.log(authHeader)
    const token = authHeader.split("Bearer ")[1];

    if (token) {
      try {
        const user = jwt.verify(token, process.env.SECRET);
        return user;
      } catch (err) {
        throw new AuthenticationError("Invalid/expired token");
      }
    }
    throw new Error("Authentication token must follow the format: 'Bearer [token]'");
  }

  // throw new Error("Authorization header must be provided");
  return null;
};
