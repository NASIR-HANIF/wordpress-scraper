const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const Excel = require('exceljs');

const originalFile = "C:/Users/rehman/Desktop/wordpress-scraper/list/random.txt";
const outputFile = "C:/Users/rehman/Desktop/wordpress-scraper/output/posts.xlsx";

// Function to fetch post data
async function fetchPostData(baseUrl, url) {
    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);

        // Initialize variables with default values
        let publishDate = 'Unknown';
        let authorName = 'Unknown';

        // Extract publish date
        // Try multiple selectors for datetime
        let datetimeElement = $('.post-meta-items.meta-below.has-author-img span time').attr('datetime');
        if (!datetimeElement) {
            datetimeElement = $('meta[property="article:published_time"]').attr('content');
        }
        if (!datetimeElement) {
            datetimeElement = $('time').attr('datetime');
        }
        
        // If a datetimeElement is found, process it
        if (datetimeElement) {
            const dateParts = datetimeElement.split('T')[0].split('-');
            publishDate = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;
        } else {
            console.warn(`Publish date not found for URL: ${url}`);
        }

        // Extract author name
        // Try multiple selectors for author name
        authorName = $('a[rel="author"]').text().trim();
        // if (!authorName) {
        //     authorName = $('.author-name').text().trim(); // Common class name for author
        // }
        if (!authorName) {
            authorName = $('meta[name="author"]').attr('content');
        }

        if (!authorName) {
            console.warn(`Author name not found for URL: ${url}`);
            authorName = 'Unknown'; // Provide default value
        }

        // Check if the post contains an FAQ heading
        const containsFAQs = $('h1, h2, h3, h4, h5, h6').filter((index, element) => {
            return $(element).text().trim().toLowerCase().includes('faqs');
        }).length > 0;

        // Extract links
        const links = [];
        $('.content-spacious a').each((index, element) => {
            const href = $(element).attr('href');
            if (href && href !== '#' && !href.startsWith('#')) {
                const linkText = $(element).text().trim();
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

        // Extract baseUrl if it wasn't provided or needs to be updated
        if (!baseUrl) {
            const parsedUrl = new URL(url);
            baseUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}`;
        }

        // Create data object
        const data = {
            publishDate,
            authorName,
            externalLinks,
            internalLinks,
            requestUrl: url, // Add the original request URL
            error: null, // No error if the request is successful
            postType: containsFAQs ? "Special Post" : "Regular Post" // Determine if it's a special post
        };

        return { data, baseUrl }; // Return both data and updated baseUrl
    } catch (error) {
        // Handling the error and setting the error code in the data object
        console.error(`Error fetching ${url}: ${error.message}`);
        
        // Set default status code for network errors or unknown errors
        let statusCode = 'Network or unknown error';
        
        // If error.response is available, use its status code
        if (error.response) {
            statusCode = error.response.status;
        }

        return {
            data: {
                publishDate: null,
                authorName: null,
                externalLinks: [],
                internalLinks: [],
                requestUrl: url, // Add the original request URL
                error: statusCode,
                postType: 'Error Post' // Mark as error post in case of a failure
            },
            baseUrl // Return the existing baseUrl in case of error
        };
    }
}

// Function to process URLs from file
async function processUrls() {
    try {
        const urls = fs.readFileSync(originalFile, 'utf8').trim().split('\n');
        let baseUrl = null; // Initialize baseUrl

        const postsData = [];

        for (let url of urls) {
            url = url.trim();
            const { data, baseUrl: updatedBaseUrl } = await fetchPostData(baseUrl, url);

            // Add post data to the list
            postsData.push(data);

            // Update baseUrl if updatedBaseUrl is provided
            if (updatedBaseUrl && updatedBaseUrl !== baseUrl) {
                baseUrl = updatedBaseUrl;
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
            { header: 'Post Type', key: 'postType', width: 20 }, // Added Post Type column
            { header: 'External Link URL', key: 'externalLinkUrl', width: 50 },
            { header: 'External Link Text', key: 'externalLinkText', width: 50 },
            { header: 'Internal Link URL', key: 'internalLinkUrl', width: 50 },
            { header: 'Internal Link Text', key: 'internalLinkText', width: 50 },
            { header: 'Error', key: 'error', width: 20 } // Added Error column
        ];

        // Add rows from postsData
        postsData.forEach(data => {
            let firstRowAdded = false;

            const addLinkRows = (links, isExternal) => {
                links.forEach((link) => {
                    worksheet.addRow({
                        requestUrl: !firstRowAdded ? data.requestUrl : null,
                        publishDate: !firstRowAdded ? data.publishDate : null,
                        authorName: !firstRowAdded ? data.authorName : null,
                        postType: !firstRowAdded ? data.postType : null, // Only add post type in the first row
                        externalLinkUrl: isExternal ? { text: link.url, hyperlink: link.url } : null,
                        externalLinkText: isExternal ? link.text : null,
                        internalLinkUrl: !isExternal ? { text: link.url, hyperlink: link.url } : null,
                        internalLinkText: !isExternal ? link.text : null,
                        error: !firstRowAdded ? data.error : null // Only add error in the first row if exists
                    });
                    firstRowAdded = true; // After the first row, we don't add metadata
                });
            };

            // Add rows for external and internal links
            if (data.externalLinks.length > 0) {
                addLinkRows(data.externalLinks, true);
            }
            if (data.internalLinks.length > 0) {
                addLinkRows(data.internalLinks, false);
            }

            // If there are no links or it's an error row, add a single row with the post data and error
            if ((data.externalLinks.length === 0 && data.internalLinks.length === 0) || data.error) {
                worksheet.addRow({
                    requestUrl: data.requestUrl,
                    publishDate: data.publishDate,
                    authorName: data.authorName,
                    postType: data.postType, // Add post type
                    error: data.error // Add error status if present
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
