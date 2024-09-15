const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const orignilfile = "C:/Users/rehman/Desktop/wordpress-scraper/list/textaction.txt"


// Base URL to compare links against
const baseUrl = 'https://readrey.com'; // Replace with your base URL

// Function to fetch post data from a URL
async function fetchPostData(url) {
    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);

        // Extracting publish date, author name, post content
        const publishDate = $('.publish-date').text().trim(); // Replace with actual selector
        const authorName = $('.author-name').text().trim(); // Replace with actual selector
        const postContent = $('.post-content').text().trim(); // Replace with actual selector

        // Extracting all links from post content
        const links = [];
        $('a').each((index, element) => {
            const link = $(element).attr('href');
            const linkText = $(element).text().trim();
            links.push({ url: link, text: linkText });
        });

        // Filtering links based on base URL match
        const externalLinks = [];
        const internalLinks = [];
        links.forEach(linkObj => {
            if (linkObj.url && !linkObj.url.startsWith(baseUrl)) {
                externalLinks.push({ link: linkObj.url, text: linkObj.text });
            } else {
                internalLinks.push(linkObj.url);
            }
        });

        // Constructing the result object
        const result = {
            publishDate,
            authorName,
            postContent,
            externalLinks,
            internalLinks
        };

        return result;
    } catch (error) {
        console.error(`Error fetching ${url}: ${error.message}`);
        return null;
    }
}

// Function to process each URL in exemple.txt
async function processUrls() {
    try {
        const urls = fs.readFileSync(orignilfile, 'utf8').trim().split('\n');

        for (let url of urls) {
            url = url.trim();
            const postData = await fetchPostData(url);
            if (postData) {
                console.log('Post Data:', postData);
            }
        }
    } catch (error) {
        console.error('Error reading or processing urls:', error);
    }
}

// Start processing URLs
processUrls();
