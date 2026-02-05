const axios = require('axios');

const WEBSITES = [
  'https://www.shpeuf.com',
  'https://www.shpeuf.com/about',
  'https://www.shpeuf.com/sponsors',
  'https://www.shpeuf.com/eboard',
  'https://www.shpeuf.com/alumni',
  'https://www.shpeuf.com/contactus',
  'https://www.shpeuf.com/calendar',
  'https://shpe.org',
  'https://shpe.org/career-services/'
];

const RAG_API_URL = 'http://localhost:8001';

async function indexWebsites() {
  console.log('🚀 Starting website indexing...');

  // Check if API is running
  try {
    await axios.get(`${RAG_API_URL}/health`);
    console.log('✅ RAG API is running');
  } catch (error) {
    console.error('❌ RAG API is not running. Please start it first with: python rag/rag_api.py');
    process.exit(1);
  }

  // Index websites
  try {
    console.log(`Indexing ${WEBSITES.length} websites...`);
    const response = await axios.post(
      `${RAG_API_URL}/bulk_index`,
      { urls: WEBSITES },
      { timeout: 300000 }
    );

    console.log('✅ Indexing complete!');

    if (response.data.indexed && response.data.indexed.length > 0) {
      console.log('Successfully indexed:');
      response.data.indexed.forEach(site => {
        console.log(`- ${site.url}: ${site.chunks_indexed} chunks`);
      });
    } else {
      console.log('No sites were successfully indexed.');
    }

    if (response.data.errors && response.data.errors.length > 0) {
      console.log('⚠️ Errors encountered:');
      response.data.errors.forEach(err => {
        console.log(`- ${err.url}: ${err.error}`);
      });
    }

  } catch (error) {
    console.error('❌ Indexing failed:', error.message);
  }
}

indexWebsites();
