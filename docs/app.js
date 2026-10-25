// Movie Rating Analysis dashboard.
// Reads data/results.json (produced by spark/movie_analysis.py) and renders KPIs, charts and tables.

const fmt = new Intl.NumberFormat("en-US");
const fmt2 = (v) => Number(v).toFixed(2);
const fmt3 = (v) => Number(v).toFixed(3);
const charts = [];
let DATA = null;

// ---------- helpers ----------
function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderTable(id, columns, rows) {
  const head = "<thead><tr>" + columns.map((c) => `<th class="${c.num ? "num" : ""}">${esc(c.label)}</th>`).join("") + "</tr></thead>";
  const body = "<tbody>" + rows.map((r) =>
    "<tr>" + columns.map((c) => `<td class="${c.num ? "num" : ""}">${c.html ? c.html(r) : esc(c.value(r))}</td>`).join("") + "</tr>"
  ).join("") + "</tbody>";
  document.getElementById(id).innerHTML = head + body;
}

// ---------- chart theme ----------
function baseOptions({ horizontal = false, xTitle = "", yTitle = "" } = {}) {
  const grid = css("--grid"), muted = css("--text-muted"), secondary = css("--text-secondary");
  const axis = (title) => ({
    grid: { color: grid, drawTicks: false },
    border: { color: css("--axis") },
    ticks: { color: muted, padding: 6, font: { size: 12 } },
    title: { display: !!title, text: title, color: secondary, font: { size: 12 } },
  });
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? "y" : "x",
    animation: { duration: 300 },
    interaction: { mode: "index", intersect: false, axis: horizontal ? "y" : "x" },
    plugins: {
      legend: { display: false }, // single-series charts: the card title names the series
      tooltip: {
        backgroundColor: css("--surface"),
        titleColor: css("--text-primary"),
        bodyColor: secondary,
        borderColor: css("--border"),
        borderWidth: 1,
        padding: 10,
        displayColors: false,
      },
    },
    scales: { x: axis(xTitle), y: axis(yTitle) },
  };
}

function barDataset(label, data) {
  return {
    label, data,
    backgroundColor: css("--series-1"),
    hoverBackgroundColor: css("--series-1"),
    borderRadius: 4,
    borderSkipped: "start",
    maxBarThickness: 18,
    categoryPercentage: 0.8,
    barPercentage: 0.9,
  };
}

function makeChart(id, config) {
  const chart = new Chart(document.getElementById(id), config);
  charts.push(chart);
  return chart;
}

// ---------- sections ----------
function renderMeta(d) {
  document.getElementById("meta").textContent = `Results generated ${d.generated_at} · ${d.engine}`;
  document.getElementById("footerEngine").textContent = `Computed with: ${d.engine} · ${d.generated_at}`;
}

function renderKpis(s) {
  const tiles = [
    ["Ratings", fmt.format(s.total_ratings), "rows in ratings.csv"],
    ["Movies", fmt.format(s.total_movies), `${fmt.format(s.rated_movies)} with at least one rating`],
    ["Users", fmt.format(s.total_users), "unique raters"],
    ["Average rating", fmt2(s.avg_rating), "out of 5 stars"],
    ["Genres", s.total_genres, "distinct genres"],
    ["Time span", `${s.first_rating_year}–${s.last_rating_year}`, "years of rating activity"],
  ];
  document.getElementById("kpis").innerHTML = tiles.map(([l, v, h]) =>
    `<div class="kpi"><div class="label">${esc(l)}</div><div class="value">${esc(v)}</div><div class="hint">${esc(h)}</div></div>`
  ).join("");
}

function renderGenreCharts(genres) {
  const labels = genres.map((g) => g.genre);
  const avgs = genres.map((g) => g.avg_rating);
  const min = Math.floor((Math.min(...avgs) - 0.1) * 10) / 10;
  const max = Math.ceil((Math.max(...avgs) + 0.1) * 10) / 10;

  const avgOpts = baseOptions({ horizontal: true, xTitle: "Average rating (stars)" });
  avgOpts.scales.x.min = min;
  avgOpts.scales.x.max = max;
  avgOpts.plugins.tooltip.callbacks = {
    label: (ctx) => {
      const g = genres[ctx.dataIndex];
      return [`Average: ${fmt3(g.avg_rating)} stars`, `Ratings: ${fmt.format(g.num_ratings)}`, `Movies: ${fmt.format(g.num_movies)}`];
    },
  };
  makeChart("genreAvgChart", {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Average rating", data: avgs, showLine: false,
        pointRadius: 6, pointHoverRadius: 8, pointHitRadius: 14,
        pointBackgroundColor: css("--series-1"), pointBorderColor: css("--surface"), pointBorderWidth: 2,
      }],
    },
    options: avgOpts,
  });

  const cntOpts = baseOptions({ horizontal: true, xTitle: "Number of ratings" });
  cntOpts.plugins.tooltip.callbacks = { label: (ctx) => `Ratings: ${fmt.format(ctx.raw)}` };
  makeChart("genreCountChart", {
    type: "bar",
    data: { labels, datasets: [barDataset("Ratings", genres.map((g) => g.num_ratings))] },
    options: cntOpts,
  });
}

function renderGenreTable(genres, filter = "") {
  const f = filter.trim().toLowerCase();
  const rows = genres.filter((g) => g.genre.toLowerCase().includes(f));
  renderTable("genreTable", [
    { label: "#", value: (r) => genres.indexOf(r) + 1, num: true },
    { label: "Genre", value: (r) => r.genre },
    { label: "Avg rating", value: (r) => fmt3(r.avg_rating), num: true },
    { label: "Ratings", value: (r) => fmt.format(r.num_ratings), num: true },
    { label: "Movies", value: (r) => fmt.format(r.num_movies), num: true },
  ], rows);
}

function renderRatingCharts(d) {
  const dist = d.rating_distribution;
  const distOpts = baseOptions({ xTitle: "Stars", yTitle: "Number of ratings" });
  distOpts.plugins.tooltip.callbacks = { title: (i) => `${i[0].label} stars`, label: (ctx) => `Ratings: ${fmt.format(ctx.raw)}` };
  makeChart("distChart", {
    type: "bar",
    data: { labels: dist.map((r) => r.rating.toFixed(1)), datasets: [barDataset("Ratings", dist.map((r) => r.count))] },
    options: distOpts,
  });
  renderTable("distTable", [
    { label: "Stars", value: (r) => r.rating.toFixed(1) },
    { label: "Ratings", value: (r) => fmt.format(r.count), num: true },
    { label: "Share", value: (r) => ((r.count / d.summary.total_ratings) * 100).toFixed(1) + "%", num: true },
  ], dist);

  const years = d.ratings_per_year;
  const yearOpts = baseOptions({ yTitle: "Ratings submitted" });
  yearOpts.scales.y.beginAtZero = true;
  yearOpts.plugins.tooltip.callbacks = {
    label: (ctx) => [`Ratings: ${fmt.format(years[ctx.dataIndex].count)}`, `Avg rating: ${fmt2(years[ctx.dataIndex].avg_rating)}`],
  };
  makeChart("yearChart", {
    type: "line",
    data: {
      labels: years.map((y) => y.year),
      datasets: [{
        label: "Ratings", data: years.map((y) => y.count), borderColor: css("--series-1"), borderWidth: 2,
        pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: css("--series-1"), tension: 0,
      }],
    },
    options: yearOpts,
  });
  renderTable("yearTable", [
    { label: "Year", value: (r) => r.year },
    { label: "Ratings", value: (r) => fmt.format(r.count), num: true },
    { label: "Avg rating", value: (r) => fmt2(r.avg_rating), num: true },
  ], years);

  const dec = d.decade_stats;
  const decLabels = dec.map((r) => `${r.decade}s`);
  const decOpts = baseOptions({ xTitle: "Release decade", yTitle: "Average rating (stars)" });
  decOpts.plugins.tooltip.callbacks = {
    label: (ctx) => [`Average: ${fmt3(dec[ctx.dataIndex].avg_rating)} stars`, `Ratings: ${fmt.format(dec[ctx.dataIndex].num_ratings)}`],
  };
  makeChart("decadeChart", {
    type: "line",
    data: {
      labels: decLabels,
      datasets: [{
        label: "Average rating", data: dec.map((r) => r.avg_rating), borderColor: css("--series-1"), borderWidth: 2,
        pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: css("--series-1"),
        pointBorderColor: css("--surface"), pointBorderWidth: 2,
      }],
    },
    options: decOpts,
  });
  renderTable("decadeTable", [
    { label: "Decade", value: (r) => `${r.decade}s` },
    { label: "Movies", value: (r) => fmt.format(r.num_movies), num: true },
    { label: "Ratings", value: (r) => fmt.format(r.num_ratings), num: true },
    { label: "Avg rating", value: (r) => fmt3(r.avg_rating), num: true },
  ], dec);

  const decCntOpts = baseOptions({ xTitle: "Release decade", yTitle: "Movies" });
  decCntOpts.plugins.tooltip.callbacks = { label: (ctx) => `Movies: ${fmt.format(ctx.raw)}` };
  makeChart("decadeCountChart", {
    type: "bar",
    data: { labels: decLabels, datasets: [barDataset("Movies", dec.map((r) => r.num_movies))] },
    options: decCntOpts,
  });
}

function renderMovieTables(d) {
  const cols = [
    { label: "#", value: (_r) => "", num: true },
    { label: "Movie", html: (r) => `${esc(r.title)}<div class="genres">${esc(r.genres.replaceAll("|", " · "))}</div>` },
    { label: "Avg", value: (r) => fmt2(r.avg_rating), num: true },
    { label: "Ratings", value: (r) => fmt.format(r.num_ratings), num: true },
  ];
  const withRank = (rows) => { cols[0].value = (r) => rows.indexOf(r) + 1; return rows; };
  renderTable("topRatedTable", cols, withRank(d.top_rated_movies));
  renderTable("mostRatedTable", cols, withRank(d.most_rated_movies));
  document.getElementById("topRatedNote").textContent =
    `Highest average rating among movies with at least ${d.min_ratings_for_top} ratings.`;

  renderTable("usersTable", [
    { label: "#", value: (r) => d.top_users.indexOf(r) + 1, num: true },
    { label: "User ID", value: (r) => r.userId },
    { label: "Ratings given", value: (r) => fmt.format(r.num_ratings), num: true },
    { label: "Their avg rating", value: (r) => fmt2(r.avg_rating), num: true },
  ], d.top_users);
}

function renderVerify(d) {
  const mr = Object.fromEntries((d.mapreduce_genre_avg || []).map((r) => [r.genre, r]));
  if (!Object.keys(mr).length) {
    document.getElementById("verifyTable").outerHTML =
      '<p class="card-note">MapReduce output not found. Run mapreduce/run_mapreduce.sh before the Spark job to fill this table.</p>';
    return;
  }
  renderTable("verifyTable", [
    { label: "Genre", value: (r) => r.genre },
    { label: "MapReduce avg", value: (r) => (mr[r.genre] ? fmt3(mr[r.genre].avg_rating) : "–"), num: true },
    { label: "Spark avg", value: (r) => fmt3(r.avg_rating), num: true },
    { label: "MapReduce count", value: (r) => (mr[r.genre] ? fmt.format(mr[r.genre].num_ratings) : "–"), num: true },
    { label: "Spark count", value: (r) => fmt.format(r.num_ratings), num: true },
    {
      label: "Match", html: (r) => {
        const m = mr[r.genre];
        const ok = m && Math.abs(m.avg_rating - r.avg_rating) < 0.001 && m.num_ratings === r.num_ratings;
        return ok ? '<span class="match">✓ Same</span>' : "✗ Different";
      },
    },
  ], d.genre_stats);
}

function renderCharts() {
  charts.splice(0).forEach((c) => c.destroy());
  renderGenreCharts(DATA.genre_stats);
  renderRatingCharts(DATA);
}

// ---------- theme toggle ----------
function setupTheme() {
  const saved = localStorage.getItem("theme");
  if (saved) document.documentElement.dataset.theme = saved;
  document.getElementById("themeBtn").addEventListener("click", () => {
    const isDark = css("--surface") === "#1a1a19";
    const next = isDark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    if (DATA) renderCharts();
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => DATA && renderCharts());
}

// ---------- boot ----------
async function init() {
  setupTheme();
  try {
    const res = await fetch("data/results.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    DATA = await res.json();
  } catch (err) {
    document.getElementById("meta").textContent = "Could not load results.";
    document.getElementById("errorBox").innerHTML =
      `<div class="error"><strong>Could not load data/results.json</strong> (${esc(err.message)}).<br>
       Run the analysis first, and open this page through a web server
       (e.g. <code>cd docs &amp;&amp; python -m http.server 8000</code>), not by double-clicking the file.</div>`;
    return;
  }
  renderMeta(DATA);
  renderKpis(DATA.summary);
  renderGenreTable(DATA.genre_stats);
  document.getElementById("genreSearch").addEventListener("input", (e) => renderGenreTable(DATA.genre_stats, e.target.value));
  renderMovieTables(DATA);
  renderVerify(DATA);
  renderCharts();
}

init();
