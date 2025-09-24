// graphql/chatbot/ragService.js
const axios = require('axios');

// Configuration
const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:8001';
const REQUEST_TIMEOUT = 30000; // 30 seconds


async function queryRAG(question) {
    try {
        // Validate input
        if (!question || typeof question !== 'string') {
            throw new Error('Invalid question provided');
        }

        // Make request to Python RAG API
        const response = await axios.post(
            `${RAG_API_URL}/query`,
            { question },
            {
                headers:
                {
                    'Content-Type': 'application/json'
                },
                timeout: REQUEST_TIMEOUT
            }
        );

        // Extract answer from response
        if (response.data && response.data.answer) {
            return response.data.answer;
        } else {
            throw new Error('Invalid response from RAG API');
        }
    } 
    catch (error) 
    {
        console.error('RAG Query Error:', error.message);
        
        // Handle specific error cases
        if (error.code === 'ECONNREFUSED') {
            return 'The RAG service is currently unavailable. Please ensure the Python API is running.';
        } else if (error.code === 'ETIMEDOUT') {
            return 'The request timed out. Please try again with a simpler question.';
        } else if (error.response && error.response.status === 500) {
            return 'An error occurred while processing your question. Please try again.';
        } else {
            return `Unable to process your question: ${error.message}`;
        }
    }
}

/**
* Index a single website into the RAG system
* @param {string} url - The URL to index
* @returns {Promise<object>} - Indexing result
*/
async function indexWebsite(url) {
    try {
        const response = await axios.post(
            `${RAG_API_URL}/index`,
            { url },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 60000 // 60 seconds for indexing
            }
        );

        return response.data;
    } catch (error) {
        console.error('Indexing Error:', error.message);
        throw new Error(`Failed to index ${url}: ${error.message}`);
    }
}

/**
 * Index multiple websites into the RAG system
 * @param {string[]} urls - Array of URLs to index
 * @returns {Promise<object>} - Bulk indexing results
 */
async function bulkIndexWebsites(urls) {
    try {
        const response = await axios.post(
            `${RAG_API_URL}/bulk_index`,
            { urls },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 300000 // 5 minutes for bulk indexing
            }
        );

        return response.data;
    } catch (error) {
        console.error('Bulk Indexing Error:', error.message);
        throw new Error(`Failed to bulk index websites: ${error.message}`);
    }
}

/**
 * Get RAG system statistics
 * @returns {Promise<object>} - System statistics
 */
async function getRAGStats() {
    try {
        const response = await axios.get(
            `${RAG_API_URL}/stats`,
            {
                timeout: 5000
            }
        );

        return response.data;
    } catch (error) {
        console.error('Stats Error:', error.message);
        return { error: 'Unable to fetch stats' };
    }
}

/**
 * Check if RAG API is healthy
 * @returns {Promise<boolean>} - Health status
 */
async function checkRAGHealth() {
    try {
        const response = await axios.get(
            `${RAG_API_URL}/health`,
            {
                timeout: 5000
            }
        );

        return response.status === 200;
    } catch (error) {
        console.error('Health Check Error:', error.message);
        return false;
    }
}

module.exports = {
    queryRAG,
    indexWebsite,
    bulkIndexWebsites,
    getRAGStats,
    checkRAGHealth
};