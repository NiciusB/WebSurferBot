const puppeteer = require('puppeteer');
const twit = require('twit');
const fs = require('fs');
const util = require('util');

var config = JSON.parse(fs.readFileSync('config.json', 'utf8'))
var TClient = new twit(config);

const linkMap = {
  links: false,
  save() {
    fs.writeFileSync('map.json', JSON.stringify(this.links), 'utf8')
  },
  getLink() {
    const url = this.links.pending.shift()
    this.links.alreadyExplored.push(url)
    return url
  },
  addLink(url) {
    if (!(url in this.links.pending) && !(url in this.links.alreadyExplored)) {
      this.links.pending.push(url)
    }
  }
}

if (!fs.existsSync('map.json')) {
  linkMap.links = {
    pending: [
      'https://balbona.me'
    ],
    alreadyExplored: []
  }
} else {
  linkMap.links =  JSON.parse(fs.readFileSync('map.json', 'utf8'))
}

setTimeout(() => {
  crawlNext()
}, 30 * 60 * 1000)
crawlNext()

function crawlNext() {
  return (async () => {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.setViewport({
      width: 411,
      height: 731,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2
    })
    const url = linkMap.getLink()
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 20000
    })
    page.screenshot({path: 'img.jpg'}).then(() => {
      sendTweet(url)
      browser.close()
    })
    const links = await page.$$eval('a[href^="http"]', divs => divs.map(el => el.href))
    links.forEach(link => {
      linkMap.addLink(link)
    })
    linkMap.save()
  })();
}

function sendTweet(url) {
  TClient.post('media/upload', { media_data: b64content = fs.readFileSync('img.jpg', { encoding: 'base64' }) }, function (err, data, response) {
    if (err){
      console.log('ERROR:');
      console.log(err);
    }
    else {
      TClient.post('statuses/update', {
        media_ids: new Array(data.media_id_string),
        status: url
      },
        function(err, data, response) {
          if (err){
            console.log('ERROR:');
            console.log(err);
          }
        }
      );
    }
  });
}