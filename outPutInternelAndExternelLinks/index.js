const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const Excel = require('exceljs');

const originalFile = "C:/Users/rehman/Desktop/wordpress-scraper/list/random.txt";
const outputFile = "C:/Users/rehman/Desktop/wordpress-scraper/output/posts.xlsx";

// Function to fetch post data
async function fetchPostData(baseUrl, url, requestId) {
    console.log(`[${requestId}] Fetching data for URL: ${url}`);
    console.log(`[${requestId}] Current baseUrl: ${baseUrl}`);

    try {
        console.log(`[${requestId}] Making GET request to ${url}`);
        const response = await axios.get(url);
        console.log(`[${requestId}] Successfully fetched data for ${url}`);

        const html = response.data;
        const $ = cheerio.load(html);

        let publishDate = 'Unknown';
        let authorName = 'Unknown';

        // Extract publish date
        let datetimeElement = $('.post-meta-items.meta-below.has-author-img span time').attr('datetime');
        if (!datetimeElement) {
            datetimeElement = $('meta[property="article:published_time"]').attr('content');
        }
        if (!datetimeElement) {
            datetimeElement = $('time').attr('datetime');
        }

        if (datetimeElement) {
            const dateParts = datetimeElement.split('T')[0].split('-');
            publishDate = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;
        } else {
            console.warn(`[${requestId}] Publish date not found for URL: ${url}`);
        }

        // Extract author name
        authorName = $('meta[name="author"]').attr('content');
        if (!authorName) {
            authorName = $('a[rel="author"]').text().trim();
        }
        if (!authorName) {
            authorName = $('span.author-name').text().trim();
        }
        if (!authorName) {
            console.warn(`[${requestId}] Author name not found for URL: ${url}`);
            authorName = 'Unknown';
        }

        // Extract links from the post content
        const links = [];
        $('div.post-content.cf.entry-content.content-spacious a').each((index, element) => {
            const href = $(element).attr('href');
            if (href) {
                const linkText = $(element).text().trim();
                links.push({ url: href, text: linkText });
            }
        });

        // Check if the post contains an FAQ heading
        const containsFAQs = $('h1, h2, h3, h4, h5, h6').filter((index, element) => {
            return $(element).text().trim().toLowerCase().includes('faqs');
        }).length > 0;

        const externalLinks = [];
        const internalLinks = [];

        links.forEach(linkObj => {
            if (linkObj.url) {
                if (!baseUrl || !linkObj.url.startsWith(baseUrl)) {
                    externalLinks.push(linkObj);
                } else {
                    internalLinks.push(linkObj);
                }
            }
        });

        // Create data object
        const data = {
            publishDate,
            authorName,
            externalLinks,
            internalLinks,
            requestUrl: url,
            error: [], // Initialize as an empty array for no error
            postType: containsFAQs ? "Special Post" : "Regular Post"
        };

        return { data, baseUrl };
    } catch (error) {
        console.error(`[${requestId}] Error fetching ${url}: ${error.message}`);

        let statusCode = 'Network or unknown error';

        if (error.response) {
            statusCode = error.response.status;
            console.log(`[${requestId}] Response status code: ${statusCode}`);
        }

        // Return data object with error details added to the error array
        return {
            data: {
                publishDate: null,
                authorName: null,
                externalLinks: [],
                internalLinks: [],
                requestUrl: url,
                error: [{ url, statusCode }], // Push error details into the error array
                postType: 'Error Post'
            },
            baseUrl
        };
    }
}

// Function to process URLs from file
async function processUrls() {
    try {
        const urls = fs.readFileSync(originalFile, 'utf8').trim().split('\n');
        let baseUrl = null; // Initialize baseUrl

        const postsData = [];

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i].trim();
            const requestId = `Request-${i + 1}`; // Unique identifier for each request

            // Extract baseUrl from the URL if it's the first URL or needs to be updated
            if (!baseUrl) {
                const parsedUrl = new URL(url);
                baseUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}`;
                console.log(`[${requestId}] Extracted baseUrl: ${baseUrl}`);
            }

            // Fetch post data
            const { data, baseUrl: updatedBaseUrl } = await fetchPostData(baseUrl, url, requestId);

            // Add post data to the list
            postsData.push(data);

            // Update baseUrl if updatedBaseUrl is provided
            if (updatedBaseUrl && updatedBaseUrl !== baseUrl) {
                baseUrl = updatedBaseUrl;
                console.log(`[${requestId}] Updated baseUrl to: ${baseUrl}`);
            }
        }


        // Create a workbook and add a worksheet
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('Posts');

        // Define headers
        worksheet.columns = [
            { header: 'Request URL', key: 'requestUrl', width: 50 },
            { header: 'Publish Date', key: 'publishDate', width: 15 },
            { header: 'Author Name', key: 'authorName', width: 20 },
            { header: 'Post Type', key: 'postType', width: 20 },
            { header: 'External Link URL', key: 'externalLinkUrl', width: 50 },
            { header: 'External Link Text', key: 'externalLinkText', width: 50 },
            { header: 'Internal Link URL', key: 'internalLinkUrl', width: 50 },
            { header: 'Internal Link Text', key: 'internalLinkText', width: 50 },
            { header: 'Error', key: 'error', width: 100 } // Increased width to accommodate multiple error entries
        ];

        // Add rows from postsData
        postsData.forEach(data => {
            const maxLinks = Math.max(data.externalLinks.length, data.internalLinks.length);

            // Loop over the maximum number of links to ensure each row has data from both link types if available
            for (let i = 0; i < maxLinks; i++) {
                worksheet.addRow({
                    requestUrl: i === 0 ? data.requestUrl : null, // Only print the request URL in the first row for the post
                    publishDate: i === 0 ? data.publishDate : null, // Only print the publish date in the first row for the post
                    authorName: i === 0 ? data.authorName : null, // Only print the author name in the first row for the post
                    postType: i === 0 ? data.postType : null, // Only print the post type in the first row for the post
                    externalLinkUrl: data.externalLinks[i] ? { text: data.externalLinks[i].url, hyperlink: data.externalLinks[i].url } : null,
                    externalLinkText: data.externalLinks[i] ? data.externalLinks[i].text : null,
                    internalLinkUrl: data.internalLinks[i] ? { text: data.internalLinks[i].url, hyperlink: data.internalLinks[i].url } : null,
                    internalLinkText: data.internalLinks[i] ? data.internalLinks[i].text : null,
                    error: i === 0 ? (data.error.length > 0 ? data.error.map(e => `${e.url}: ${e.statusCode}`).join(', ') : null) : null // Handle empty error array
                });
            }
        });

        // Save workbook to file
        await workbook.xlsx.writeFile(outputFile);
        console.log(`Excel file has been created: ${outputFile}`);
    } catch (error) {
        console.error('Error reading or processing URLs:', error);
    }
}

// Execute the URL processing function
processUrls();
