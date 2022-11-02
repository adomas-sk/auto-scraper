import puppeteer, { Browser, Page } from 'puppeteer';
import PocketBase from 'pocketbase';
import crypto from 'crypto';

const db = new PocketBase('http://127.0.0.1:8090');

const getLink = async (searchHash: string, slug: string) => {
  try {
    const list = await db.records.getList('seen', 1, 1000, {
      filter: `search = "${searchHash}"`,
    });
    return list.items.find((i) => i.slug === slug);
  } catch (error) {
    console.log(error);
    return false;
  }
};
const updateLink = async (id: string, data: any) => {
  try {
    const response = await db.records.update('seen', id, data);
    return response;
  } catch (error) {
    console.log(error);
    return false;
  }
};
const addLink = async (data: any) => {
  try {
    const response = await db.records.create('seen', data);
    return response;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const searches = [
  'https://autoplius.lt/skelbimai/naudoti-automobiliai?make_id=44&model_id=214',
  'https://autoplius.lt/skelbimai/naudoti-automobiliai?make_id=62&model_id=596',
  'https://autoplius.lt/skelbimai/naudoti-automobiliai?make_id=68&model_id=714',
  'https://autoplius.lt/skelbimai/naudoti-automobiliai?make_id_list=68&engine_capacity_from=&engine_capacity_to=&power_from=&power_to=&kilometrage_from=&kilometrage_to=&has_damaged_id=&condition_type_id=&make_date_from=&make_date_to=&sell_price_from=&sell_price_to=&co2_from=&co2_to=&euro_id=&fk_place_countries_id=&qt=&qt_autocomplete=&number_of_seats_id=&number_of_doors_id=&gearbox_id=&steering_wheel_id=&older_not=&save_search=1&slist=1903368904&category_id=2&order_by=&order_direction=&make_id%5B68%5D=713_11814',
];

const createPageAndNavigate = async (browser: Browser, url: string) => {
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(false);
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:106.0) Gecko/20100101 Firefox/106.0');
  await page.goto(url, {
    waitUntil: 'networkidle0',
    timeout: 3000,
  });
  return page;
};

const scrapeSpecificPage = (browser: Browser, searchHash: string) => async (link: string) => {
  const page = await createPageAndNavigate(browser, link);
  try {
    const title = (await page.$eval('h1', (i) => i.innerHTML)).trim();
    const price = (await page.$eval('.price', (i) => (i as any).innerText)).trim();
    const location = (await page.$eval('.seller-contact-location', (i) => i.innerHTML)).trim();
    const reserved = Boolean(await page.$('.reservation'));
    const description = (await page.$('.announcement-description'))
      ? (await page.$eval('.announcement-description', (i) => i.innerHTML)).trim()
      : '';
    const parameters = await page.$$eval('.parameter-row', (rows) =>
      rows.reduce(
        (acc, row, index) => ({
          ...acc,
          [row.querySelector('.parameter-label')?.innerHTML.trim() || `unknown-${index}`]: row
            .querySelector('.parameter-value')
            ?.innerHTML.trim(),
        }),
        {}
      )
    );
    const slug = link.split('/').at(-1);
    const data = {
      slug,
      link,
      search: searchHash,

      title,
      price,
      location,
      reserved,
      description,
      parameters,
    };
    if (!slug) {
      return;
    }
    const item = await getLink(searchHash, slug);
    if (item) {
      await updateLink(item.id, data);
    } else {
      await addLink(data);
    }
  } catch (error) {
    console.log({ error, searchHash, link });
  }
  await page.close();
};

const main = async () => {
  // const browser = await puppeteer.launch({ headless: false });
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(false);
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:106.0) Gecko/20100101 Firefox/106.0');
  // await Promise.all(searches.map(async (search) => {
  //   const page = await createPageAndNavigate(browser, search);
  //   const searchHash = crypto.createHash('md5').update(search).digest('hex');
  //   console.log(search);

  //   // await page.waitForSelector('.auto-lists');

  //   const links = (
  //     await page.$$eval('a.announcement-item', (items) => items.map((item) => item.getAttribute('href')))
  //   ).filter(Boolean) as string[];
  //   page.close();
  //   // await Promise.all(links.map(scrapeSpecificPage(browser, searchHash)))
  //   for (const link of links) {
  //     await scrapeSpecificPage(browser, searchHash)(link);
  //   }
  // }))
  for (const search of searches) {
    const page = await createPageAndNavigate(browser, search);
    const searchHash = crypto.createHash('md5').update(search).digest('hex');

    // await page.waitForSelector('.auto-lists');

    const links = (
      await page.$$eval('a.announcement-item', (items) => items.map((item) => item.getAttribute('href')))
    ).filter(Boolean) as string[];
    page.close();
    for (const link of links) {
      await scrapeSpecificPage(browser, searchHash)(link);
    }
  }
};

main().then(() => {
  console.log('finished');
  process.exit(0);
});
