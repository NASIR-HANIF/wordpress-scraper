const axios = require('axios');

// Function to extract post slug from a given URL
function extractSlug(pageUrl) {
  const parsedUrl = new URL(pageUrl);
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








  // Function to fetch post content using post ID
  async function fetchPostContentById(baseApiUrl, postId) {
    try {
      // Construct the API URL
      const apiUrl = `${baseApiUrl}/wp-json/wp/v2/posts/${postId}`;

      // Fetch the post data from the API
      const { data } = await axios.get(apiUrl);

      // Return the JSON data
      return data;
    } catch (error) {
      console.error(`Failed to fetch post content from API: ${apiUrl}`, error);
      return 'Error';
    }
  }

  // Example usage
  (async () => {
    // const postId = '123'; // Replace with the actual post ID you have
    const baseApiUrl = 'https://writingley.com'; // Replace with your WordPress site base URL

    const postContent = await fetchPostContentById(baseApiUrl, postId);

    // console.log(`Post Content for ID "${postId}":`, JSON.stringify(postContent, null, 2));
    let contentHtml = postContent.content.rendered;
    let contentDate = postContent.date;
    let contentLink = postContent.link;
    let contentAuthor = postContent.author;
    console.log(`Post Content for ID "${postId}": \n`, `Post Date = ${contentDate}\n`,`Post Link = ${contentLink}\n`  ,`Post AuthorId = ${contentAuthor}\n`  , `Post Content = `, JSON.stringify(contentHtml, null, 2));

  })();











})();
