'use strict';

const Scraper = require('../lib/Scraper');

module.exports = exports = new Scraper();

/**
 * @this {Scraper}
 * @param browser { import("puppeteer").Browser }
 */
exports.scrape = async function (browser) {
  const page = await browser.newPage();

  await page.goto('https://in.rsdelivers.com/myaccount/myaccount?section=Orders');

  // Wait for the user to log in, and then navigate to the to order history page
  await page.waitForSelector('a.aViewOrderDetails', { timeout: 0 });
  const orderLinks = await page.$$eval('a.aViewOrderDetails', nodes => nodes.map(n => n.getAttribute('href')));
  console.log(`Found ${orderLinks.length} orders.`);

  for (const orderLink of orderLinks) {
    // The links are relative, so we cannot use page.goto directly
    await page.evaluate(link => window.location = link, orderLink);
    await page.waitForSelector('.divTotals');
    const orderData = {
      id: await page.$$eval('.spanOrderId', nodes => nodes[1].textContent.trim()),
      date: await page.$eval('.divOrderDate', node => node.textContent.trim().split(': ')[1])
    };

    this.order(orderData);

    const items = await page.$$('.tblTabularList > tbody > tr');
    let idx = 1;
    for (const item of items) {
      const cols = await item.$$eval('td', nodes => nodes.map(n => n.textContent.trim()));
      const spans = await item.$$eval('span', nodes => nodes.reduce((acc, cur) => { acc[cur.className] = cur.textContent.trim(); return acc; }, {}));
      const links = await item.$$eval('a', nodes => nodes.map(n => ({ href: n.getAttribute('href'), text: n.textContent.trim() })));

      if (cols.length < 4 || links.length < 1)
        continue;

      this.item({
        ord: orderData.id,
        dpn: spans['spanStockNumberValue'],
        idx: idx++,
        qty: cols[1],
        dsc: links[0].text,
        upr: cols[2],
        lnk: links[0].href
      });
    }
  }
};
