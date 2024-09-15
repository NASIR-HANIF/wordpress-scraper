const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const { Parser } = require('json2csv');

const originalFile = "C:/Users/rehman/Desktop/wordpress-scraper/list/textaction.txt";
const outputFile = "C:/Users/rehman/Desktop/wordpress-scraper/output/posts.csv";
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
        links.forEach(linkObj => {
            if (linkObj.url && !linkObj.url.startsWith(baseUrl)) {
                const linkText = linkObj.text || linkObj.url;
                externalLinks.push({ link: linkObj.url, text: linkText });
            } else {
                internalLinks.push({ link: linkObj.url, text: linkObj.text });
            }
        });

        // Format links for CSV
        const externalLinksStr = externalLinks.map(link => `${link.text} (${link.link})`).join('; ');
        const internalLinksStr = internalLinks.map(link => `${link.text} (${link.link})`).join('; ');

        const result = {
            publishDate,
            authorName,
            postContent,
            externalLinks: externalLinksStr,
            internalLinks: internalLinksStr
        };

        return result;
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

        // Convert the collected data to CSV
        const parser = new Parser();
        const csv = parser.parse(postsData);

        // Save the CSV to a file
        fs.writeFileSync(outputFile, csv, 'utf8');
        console.log(`CSV file has been saved to ${outputFile}`);
    } catch (error) {
        console.error('Error reading or processing urls:', error);
    }
}

processUrls();
