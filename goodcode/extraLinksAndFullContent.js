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
        // Log before the request
        console.log(`[${requestId}] Making GET request to ${url}`);
        const response = await axios.get(url);
        console.log(`[${requestId}] Successfully fetched data for ${url}`);

        const html = response.data;
        const $ = cheerio.load(html);

        let publishDate = 'Unknown';
        let authorName = 'Unknown';
        let postContent = '';

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

        // Dynamic selection of post content element based on common tags or classes
        const possibleSelectors = ['article.post', '.entry-content', '.post-content', '.content']; // Add more as needed
        let foundContent = false;

        for (let selector of possibleSelectors) {
            if ($(selector).length > 0) {
                postContent = $(selector).html();
                foundContent = true;
                break;
            }
        }

        if (!foundContent) {
            console.warn(`[${requestId}] Post content not found for URL: ${url}`);
        }


        // Check if the post contains an FAQ heading
        const containsFAQs = $('h1, h2, h3, h4, h5, h6').filter((index, element) => {
            return $(element).text().trim().toLowerCase().includes('faqs');
        }).length > 0;

        // Extract links from postContent
        const links = [];
        const content$ = cheerio.load(postContent);

        content$('a').each((index, element) => {
            const href = content$(element).attr('href');
            if (href && href !== '#' && !href.startsWith('#')) {
                const linkText = content$(element).text().trim();
                links.push({ url: href, text: linkText });
            }
        });

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
            postContent,
            externalLinks,
            internalLinks,
            requestUrl: url,
            error: null,
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

        return {
            data: {
                publishDate: null,
                authorName: null,
                postContent: null,
                externalLinks: [],
                internalLinks: [],
                requestUrl: url,
                error: statusCode,
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
            { header: 'Post Content', key: 'postContent', width: 50 }, // Add post content header
            { header: 'External Link URL', key: 'externalLinkUrl', width: 50 },
            { header: 'External Link Text', key: 'externalLinkText', width: 50 },
            { header: 'Internal Link URL', key: 'internalLinkUrl', width: 50 },
            { header: 'Internal Link Text', key: 'internalLinkText', width: 50 },
            { header: 'Error', key: 'error', width: 20 }
        ];

        // Add rows from postsData
        postsData.forEach(data => {
            let firstRowAdded = false;

            // Define arrays to combine external and internal links into a single row
            let combinedRow = {
                requestUrl: data.requestUrl,
                publishDate: data.publishDate,
                authorName: data.authorName,
                postType: data.postType,
                postContent: data.postContent, // Add post content field
                externalLinkUrl: data.externalLinks.length > 0 ? { text: data.externalLinks[0].url, hyperlink: data.externalLinks[0].url } : null,
                externalLinkText: data.externalLinks.length > 0 ? data.externalLinks[0].text : null,
                internalLinkUrl: data.internalLinks.length > 0 ? { text: data.internalLinks[0].url, hyperlink: data.internalLinks[0].url } : null,
                internalLinkText: data.internalLinks.length > 0 ? data.internalLinks[0].text : null,
                error: data.error
            };

            worksheet.addRow(combinedRow);
            firstRowAdded = true;

            // Add remaining external links if any
            for (let i = 1; i < data.externalLinks.length; i++) {
                worksheet.addRow({
                    externalLinkUrl: { text: data.externalLinks[i].url, hyperlink: data.externalLinks[i].url },
                    externalLinkText: data.externalLinks[i].text
                });
            }

            // Add remaining internal links if any
            for (let i = 1; i < data.internalLinks.length; i++) {
                worksheet.addRow({
                    internalLinkUrl: { text: data.internalLinks[i].url, hyperlink: data.internalLinks[i].url },
                    internalLinkText: data.internalLinks[i].text
                });
            }

            // If there are no links or it's an error row, ensure single row with post data and error
            if ((data.externalLinks.length === 0 && data.internalLinks.length === 0) || data.error) {
                worksheet.addRow({
                    requestUrl: data.requestUrl,
                    publishDate: data.publishDate,
                    authorName: data.authorName,
                    postType: data.postType,
                    postContent: data.postContent, // Add post content field
                    error: data.error
                });
            }
        });

        // Save workbook to file
        await workbook.xlsx.writeFile(outputFile);
        console.log(`Excel file has been created: ${outputFile}`);
    } catch (error) {
        console.error('Error reading or processing urls:', error);
    }
}

// Execute the URL processing function
processUrls();
