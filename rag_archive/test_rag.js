//Test the RAG system
const { queryRAG } = require('../graphql/chatbot/ragService');

async function testRAG() {
    console.log('🧪 Testing RAG system...\n');
    
    const questions = [
        "What is SHPE?",
        "Tell me about the events",
        "How can I become a member?",
        "What services do you offer?",
        "What are the recent updates?"
    ];
    
    for (const question of questions) {
        console.log('❓Question: ${question}');
        try {
            const answer = await queryRAG(question);
            console.log('✅Answer: ${answer}\n');
        } catch (error) {
            console.error('❌ Error: ${error.message}\n');
        }
    }
}

// Run the test
testRAG();