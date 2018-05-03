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
    // get list of unique already seen domains
    const domainsAlreadyExplored = [ ...new Set(this.links.alreadyExplored.map(val => val.split('/')[0])) ]
    // try to use a never seen domain
    for (key in this.links.pending) {
      const domain = this.links.pending[key].split('/')[0]
      if (!domainsAlreadyExplored.includes(domain)) {
        return this.sendLink(key)
      }
    }
    // if no new domains, just send first link
    return this.sendLink(0)
  },
  sendLink(key) {
    const url = this.links.pending[key]
    this.links.pending.splice(key, 1)
    this.links.alreadyExplored.push(url)
    return 'https://' + url
  },
  addLink(url) {
    if (!this.links.pending.includes(url) && !this.links.alreadyExplored.includes(url)) {
      this.links.pending.push(url.replace('https://', ''))
    }
  }
}

if (!fs.existsSync('map.json')) {
  linkMap.links = {
    pending: [
      'balbona.me'
    ],
    alreadyExplored: []
  }
} else {
  linkMap.links =  JSON.parse(fs.readFileSync('map.json', 'utf8'))
}

setInterval(() => {
  crawlNext()
}, 24 * 60 * 1000)
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
    page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    }).then(() => {
      page.$$eval('a[href^="https"]', divs => divs.map(el => el.href)).then((links) => {
        links.forEach(link => {
          linkMap.addLink(link)
        })
        linkMap.save()
      })
      page.screenshot({path: 'img.jpg'}).then(() => {
        sendTweet(url)
        browser.close()
      })
    }).catch(() => {
      crawlNext() // try next one
    })
  })();
}

function sendTweet(url) {
  TClient.post('media/upload', { media_data: b64content = fs.readFileSync('img.jpg', { encoding: 'base64' }) }, function (err, data, response) {
    if (err) {
      console.error(err);
    }
    else {
      TClient.post('statuses/update', {
        media_ids: new Array(data.media_id_string),
        status: url
      },
        function(err, data, response) {
          if (err) {
            console.error(err);
          }
        }
      );
    }
  });
}