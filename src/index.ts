import puppeteer from 'puppeteer';
import PocketBase from 'pocketbase';

const db = new PocketBase('http://127.0.0.1:8090');

const isLinkSeen = async (link: string) => {
  const list = await db.records.getList('seen', 1, 10, {
    filter: `link == "${link}"`,
  });
  return list.totalItems > 0;
};

const main = async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  page.setJavaScriptEnabled(false);

  await page.goto('https://autoplius.lt/skelbimai/naudoti-automobiliai?make_id=44&model_id=214');
  await page.$('.auto-lists');

  const allItems = await page.$$('a.announcement-item');
  const itemsConfig = (
    await Promise.all(
      allItems.map(async (item) => {
        const titleElement = await item.$('.announcement-title');
        const link = await page.evaluate((el) => el.getAttribute('href'), item);
        if (link) {
          const seen = await isLinkSeen(link);
          if (titleElement && !seen) {
            const title = await page.evaluate((el) => el.textContent, titleElement);
            return {
              title: title?.trim(),
              link,
            };
          }
        }
        return null;
      })
    )
  ).filter(Boolean);
  console.log(itemsConfig);
};

main().then(() => {
  console.log('finished');
  process.exit(0);
});
