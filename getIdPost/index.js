const axios = require('axios');
const url = require('url');

// Function to extract post slug from a given URL
function extractSlug(pageUrl) {
  const parsedUrl = url.parse(pageUrl);
  const pathname = parsedUrl.pathname;
  const slug = pathname.split('/').filter(segment => segment).pop(); // Last part of the URL path
  return slug;
}

// Function to fetch post ID using the slug
async function fetchPostIdFromSlug(baseApiUrl, slug) {
  try {
    // Construct the API endpoint
    const apiUrl = `${baseApiUrl}/wp-json/wp/v2/posts?slug=${slug}`;
    
    // Fetch the post data from the API
    const { data } = await axios.get(apiUrl);
    
    // Check if the response contains the post
    if (data && data.length > 0) {
      return data[0].id; // Return the ID of the first matching post
    } else {
      return 'Post not found';
    }
  } catch (error) {
    console.error(`Failed to fetch post ID from API: ${apiUrl}`, error);
    return 'Error';
  }
}

// Example usage
(async () => {
  const pageUrl = 'https://writingley.com/8-tips-and-tricks-you-need-to-win-solitaire/';
  const baseApiUrl = 'https://writingley.com'; // Replace with your WordPress site base URL

  const slug = extractSlug(pageUrl);
  const postId = await fetchPostIdFromSlug(baseApiUrl, slug);

  console.log(`Post ID for URL "${pageUrl}": ${postId}`);
})();
const axios = require('axios');
const url = require('url');

// Function to extract post slug from a given URL
function extractSlug(pageUrl) {
  const parsedUrl = url.parse(pageUrl);
  const pathname = parsedUrl.pathname;
  const slug = pathname.split('/').filter(segment => segment).pop(); // Last part of the URL path
  return slug;
}

// Function to fetch post ID using the slug
async function fetchPostIdFromSlug(baseApiUrl, slug) {
  try {
    // Construct the API endpoint
    const apiUrl = `${baseApiUrl}/wp-json/wp/v2/posts?slug=${slug}`;
    
    // Fetch the post data from the API
    const { data } = await axios.get(apiUrl);
    
    // Check if the response contains the post
    if (data && data.length > 0) {
      return data[0].id; // Return the ID of the first matching post
    } else {
      return 'Post not found';
    }
  } catch (error) {
    console.error(`Failed to fetch post ID from API: ${apiUrl}`, error);
    return 'Error';
  }
}

// Example usage
(async () => {
  const pageUrl = 'https://writingley.com/8-tips-and-tricks-you-need-to-win-solitaire/';
  const baseApiUrl = 'https://writingley.com'; // Replace with your WordPress site base URL

  const slug = extractSlug(pageUrl);
  const postId = await fetchPostIdFromSlug(baseApiUrl, slug);

  console.log(`Post ID for URL "${pageUrl}": ${postId}`);
})();
