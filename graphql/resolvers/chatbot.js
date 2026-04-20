const { queryRAG } = require('../chatbot/chatbotService');

module.exports = {
  Query: {
    chatBot: async (_, { question, persona }) => {
      const answer = await queryRAG(question, persona);
      return answer;
    }
  }
};
