const { queryRAG } = require("../chatbot/ragService");

module.exports = {
  Query: {
    chatBot: async (_, { question }) => {
      const answer = await queryRAG(question);
      return answer;
    }
  }
};
