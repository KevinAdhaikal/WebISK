const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const https = require("https")
const { JSDOM } = require("jsdom");

let levelingData = [];

function https_fetch(url, path, method, headers, body, get_headers) {
  if (body) headers["Content-Length"] = body.length
  return new Promise((resolve, reject) => {
      const req = https.request({
          hostname: url,
          path: path,
          method: method,
          headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
              'DNT': '1',
              'Sec-GPC': '1',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'none',
              'Sec-Fetch-User': '?1',
              'TE': 'trailers', 
              ...headers
          },
      }, (res) => {
          if (get_headers) resolve(res.headers)
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => resolve(data));
      });
      if (body) req.write(body)
      req.end();
  });
}


const refreshLeaderboardData = () => {
  https_fetch("lurkr.gg", "/levels/1054414599945998416", "GET")
    .then((data) => {
      const dom = new JSDOM(data)
      levelingData = dom.window.document.querySelector(
        "script#__NEXT_DATA__"
      ).textContent;
      levelingData = JSON.parse(levelingData);
      levelingData = levelingData.props.pageProps;
    })
};

refreshLeaderboardData();

setInterval(refreshLeaderboardData, 45000);

const app = express();

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "/public")));
app.use(express.static(path.join(__dirname, "/node_modules/bootstrap/dist")));
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.get("/", function (req, res) {
  res.render("home", { title: "Home", url: req.fullUrl });
});

app.get("/info", (req, res) => {
  res.render("info", { title: "Information", url: req.fullUrl });
});

app.get("/leaderboard", function (req, res) {
  let filteredData = levelingData.levels || [];

  const pageCount = Math.ceil(filteredData.length / 10);
  let page = parseInt(req.query.p) || 1;
  const usernameToSearch = req.query.username;

  if (usernameToSearch) {
    // If a username is provided in the query, filter the data based on the username
    filteredData = filteredData.filter(
      (user) => user.username && user.username.includes(usernameToSearch)
    );
  }

  if (page > pageCount) {
    page = pageCount;
  }

  const temp = { ...levelingData }; // Use the spread operator to create a shallow copy
  temp.levels = filteredData.slice((page - 1) * 10, page * 10);
  let levels = [];
  for (let i = 0; i < temp.levels.length; i++) {
    const originalIndex = levelingData.levels.indexOf(temp.levels[i]);
    levels.push(originalIndex + 1);
  }
  res.render("leaderboard", {
    title: "Leaderboard",
    levels: levels,
    levelingData: temp,
    page: page,
    pageCount: pageCount,
    url: req.fullUrl,
    searchTerm: usernameToSearch,
    url: req.fullUrl,
  });
});

const port = 8080;

app.listen(port, () => {
  console.log(`App is running on port ${port}`);
});
