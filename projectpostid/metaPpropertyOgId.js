const axios = require('axios');
const cheerio = require('cheerio');

async function fetchAndExtractContent(url) {
    try {
        // Fetch the HTML content from the URL
        const response = await axios.get(url);
        const htmlContent = response.data;

        // Load the HTML into cheerio for parsing
        const $ = cheerio.load(htmlContent);

        // Extract specific data, e.g., a post ID from a specific element
        const postId = $('meta[property="og:id"]').attr('content'); // Example of extracting meta tag

        // Log the post ID or any other information
        console.log('Post ID:', postId);

        return htmlContent; // Or any extracted data as needed
    } catch (error) {
        console.error('Error fetching or parsing the URL:', error.message);
        return 'Failed to fetch or parse content due to an error.';
    }
}

// Usage example:
const url = 'https://readrey.com/what-is-a-movie-tavern/';

fetchAndExtractContent(url).then(content => {
    console.log('Fetched and Extracted Content:', content);
});
