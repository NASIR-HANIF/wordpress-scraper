const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const { Parser } = require('json2csv');

const originalFile = "C:/Users/rehman/Desktop/wordpress-scraper/list/textaction.txt";
const baseUrl = 'https://readrey.com'; // Replace with your base URL

async function fetchPostData(url) {
    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);

        // Extracting author name
        // const publishDate = $('time.publish-date').first().text().trim(); 
        var datetime = $('.post-meta-items.meta-below.has-author-img span').eq(2).find('time').attr('datetime');

        // Extract date parts from the datetime string
        var dateParts = datetime.split('T')[0].split('-'); // ["2023", "12", "26"]

        // Format the date as MM/DD/YYYY
        var publishDate = dateParts[1] + '/' + dateParts[2] + '/' + dateParts[0];


        const authorName = $('a[rel="author"]').eq(0).text().trim(); // Selector for author name with rel="author" at 0th index
        const postContent = $('.content-spacious').text().trim(); // Replace with actual selector

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
                // Use the URL as text if no actual text is found
                const linkText = linkObj.text || linkObj.url;
                externalLinks.push({ link: linkObj.url, text: linkText });
            } else {
                internalLinks.push({ link: linkObj.url, text: linkObj.text });
            }
        });

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

async function processUrls() {
    try {
        const urls = fs.readFileSync(originalFile, 'utf8').trim().split('\n');

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

processUrls();
