const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const Excel = require('exceljs');

const originalFile = "C:/Users/rehman/Desktop/wordpress-scraper/list/allData.txt";
const outputFile = "C:/Users/rehman/Desktop/wordpress-scraper/output/posts.xlsx";
const baseUrl = 'https://readrey.com'; // Replace with your base URL

async function fetchPostData(url) {
    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);

        // Extracting publish date and author name
        const datetime = $('.post-meta-items.meta-below.has-author-img span').eq(2).find('time').attr('datetime');
        const dateParts = datetime.split('T')[0].split('-'); // ["2023", "12", "26"]
        const publishDate = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;

        const authorName = $('a[rel="author"]').eq(0).text().trim();

        // Checking if the post contains an FAQ heading
        const containsFAQs = $('h1, h2, h3, h4, h5, h6').filter((index, element) => {
            return $(element).text().trim().toLowerCase().includes('faqs');
        }).length > 0;

        // Extracting links
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
            if (linkObj.url && !linkObj.url.startsWith(baseUrl)) {
                externalLinks.push(linkObj);
            } else {
                internalLinks.push(linkObj);
            }
        });

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

        return data;
    } catch (error) {
        // Handling the error and setting the error code in the data object
        console.error(`Error fetching ${url}: ${error.message}`);
        const statusCode = error.response ? error.response.status : 'Network or unknown error';
        return {
            publishDate: null,
            authorName: null,
            externalLinks: [],
            internalLinks: [],
            requestUrl: url, // Add the original request URL
            error: statusCode,
            postType: 'Error Post' // Mark as error post in case of a failure
        };
    }
}

async function processUrls() {
    try {
        const urls = fs.readFileSync(originalFile, 'utf8').trim().split('\n');
        const postsData = [];

        for (let url of urls) {
            url = url.trim();
            const postData = await fetchPostData(url);
            if (postData) {
                postsData.push(postData);
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

processUrls();
