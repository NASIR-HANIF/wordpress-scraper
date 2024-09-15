const axios = require('axios');
const cheerio = require('cheerio');

// Function to fetch HTML and extract post ID
async function fetchAndExtractPostId(url) {
    try {
        const response = await axios.get(url);

        if (response.status !== 200) {
            console.log({
                statusCode: response.status,
                message: `Request failed with status code ${response.status}`
            });
            return null;
        }

        const htmlContent = response.data;
        const $ = cheerio.load(htmlContent);

        // Extract post ID from a specific place in the HTML
        let postId = $('meta[property="og:id"]').attr('content');
        if (!postId) {
            postId = $('article').attr('id');
        }

        console.log('Extracted Post ID:', postId);
        return postId;
    } catch (error) {
        console.error('Error fetching or parsing the URL:', error.message);
        return null;
    }
}

// Function to fetch post details from WordPress API using the post ID
async function fetchPostDetailsFromWordPressApi(postId) {
    try {
        // Assuming the WordPress REST API URL format
        const apiUrl = `https://readrey.com/wp-json/wp/v2/posts/${postId}`;

        const response = await axios.get(apiUrl);

        if (response.status === 200) {
            console.log('Post Details:', response.data);
            return response.data;
        } else {
            console.log({
                statusCode: response.status,
                message: `API request failed with status code ${response.status}`
            });
            return null;
        }
    } catch (error) {
        console.error('Error fetching post details from WordPress API:', error.message);
        return null;
    }
}

// Main function to orchestrate the steps
async function main() {
    const url = 'https://readrey.com/what-is-a-movie-tavern/';
    
    // Step 1: Fetch HTML and extract post ID
    const postId = await fetchAndExtractPostId(url);
    
    if (postId) {
        const pureFiedId = postId.split("post-")[1]
        console.log(pureFiedId)
        // Step 2: Fetch post details from WordPress API
        const postDetails = await fetchPostDetailsFromWordPressApi(pureFiedId);
        
        // Post details are already logged within the fetchPostDetailsFromWordPressApi function
    } else {
        console.log('Failed to extract post ID.');
    }
}

main();




// Usage example:
// const url = 'https://readrey.com/what-is-a-movie-tavern/';
// const url = 'https://digestley.com/is-the-access-control-card-safe/';