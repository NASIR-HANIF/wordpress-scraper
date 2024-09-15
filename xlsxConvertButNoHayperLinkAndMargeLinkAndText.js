const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const Excel = require('exceljs');

const originalFile = "C:/Users/rehman/Desktop/wordpress-scraper/list/textaction.txt";
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
        const postContent = $('.content-spacious').text().trim();

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
        const externalLinkTexts = [];
        const internalLinkTexts = [];

        links.forEach(linkObj => {
            if (linkObj.url && !linkObj.url.startsWith(baseUrl)) {
                externalLinks.push(linkObj.url);
                externalLinkTexts.push(linkObj.text || linkObj.url);
            } else {
                internalLinks.push(linkObj.url);
                internalLinkTexts.push(linkObj.text || linkObj.url);
            }
        });

        // Create data object
        const data = {
            publishDate,
            authorName,
            postContent,
            externalLinks: externalLinks.join('; '),
            externalLinkTexts: externalLinkTexts.join('; '),
            internalLinks: internalLinks.join('; '),
            internalLinkTexts: internalLinkTexts.join('; ')
        };

        return data;
    } catch (error) {
        console.error(`Error fetching ${url}: ${error.message}`);
        return null;
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
            { header: 'Publish Date', key: 'publishDate', width: 15 },
            { header: 'Author Name', key: 'authorName', width: 20 },
            { header: 'Post Content', key: 'postContent', width: 50 },
            { header: 'External Links', key: 'externalLinks', width: 50 },
            { header: 'External Link Texts', key: 'externalLinkTexts', width: 50 },
            { header: 'Internal Links', key: 'internalLinks', width: 50 },
            { header: 'Internal Link Texts', key: 'internalLinkTexts', width: 50 }
        ];

        // Add rows from postsData
        postsData.forEach(data => {
            worksheet.addRow({
                publishDate: data.publishDate,
                authorName: data.authorName,
                postContent: data.postContent,
                externalLinks: data.externalLinks,
                externalLinkTexts: data.externalLinkTexts,
                internalLinks: data.internalLinks,
                internalLinkTexts: data.internalLinkTexts
            });
        });

        // Save workbook to file
        await workbook.xlsx.writeFile(outputFile);
        console.log(`Excel file has been created: ${outputFile}`);
    } catch (error) {
        console.error('Error reading or processing urls:', error);
    }
}

processUrls();
