# 🎬 Movie Rating Analysis using Hadoop & Spark

**Course:** CSBB 422 – Big Data Analytics (Lab Project) · NIT Delhi
**Project No. 2:** Movie Rating Analysis. Analyze the MovieLens dataset to find **average ratings per genre** using **Hadoop MapReduce** and **Apache Spark**.

🔗 **Live dashboard:** `https://YOUR-USERNAME.github.io/movie-rating-analysis/` *(replace after enabling GitHub Pages, Step 7)*

---

## 1. What this project does

1. Stores the MovieLens dataset (100,836 ratings · 9,742 movies · 610 users) in **HDFS** on a 3-PC cluster.
2. Runs a **Hadoop MapReduce** job (Python, Hadoop Streaming) that computes the **average rating per genre**.
3. Runs an **Apache Spark** job on **YARN** that computes the same genre averages and more:
   - rating distribution (0.5 – 5 stars)
   - ratings per year
   - average rating by release decade
   - top rated movies (min. 50 ratings) and most rated movies
   - most active users
4. Compares the MapReduce and Spark results to show both engines agree.
5. Shows everything on a **web dashboard** (HTML + Chart.js) hosted free on **GitHub Pages**.

### Key findings (from `docs/data/results.json`)

| Insight | Result |
|---|---|
| Highest rated genre | **Film-Noir** (3.92 ★), then War (3.81) and Documentary (3.80) |
| Lowest rated genre | **Horror** (3.26 ★) |
| Most rated genre | Drama (41,928 ratings) |
| Overall average rating | 3.50 ★ |
| Most common rating | 4.0 ★ (26,818 ratings) |
| Top rated movie (≥50 ratings) | The Shawshank Redemption (1994): 4.43 ★ |
| Most rated movie | Forrest Gump (1994): 329 ratings |
| Older movies are rated higher | 1940s movies average 3.87 ★; 1990s movies 3.43 ★ |

---

## 2. Tech stack

| Component | Version | Role |
|---|---|---|
| Ubuntu | 22.04 LTS | OS on all 3 PCs |
| Java (OpenJDK) | 11 | Required by Hadoop & Spark |
| Apache Hadoop | 3.3.6 | HDFS (storage) + YARN (resource manager) + MapReduce |
| Apache Spark | 3.5.3 | Fast in-memory analytics (PySpark), runs on YARN |
| Python | 3.10 | MapReduce mapper/reducer, PySpark job |
| HTML/CSS/JS + Chart.js | 4.4 | Dashboard UI |
| GitHub Pages | – | Free hosting for the live dashboard |

---

## 3. Architecture

```
                 ┌──────────────────────────── MASTER (PC 1) ────────────────────────────┐
 MovieLens CSV ─►│  hdfs dfs -put   NameNode · SecondaryNameNode · ResourceManager       │
                 │                  spark-submit (driver) ─► results.json ─► git push ───┼─► GitHub Pages
                 └───────────────┬───────────────────────────────────────┬───────────────┘   (Dashboard)
                                 │ HDFS blocks + YARN containers         │
                 ┌───────────────▼──────── WORKER 1 (PC 2) ┐ ┌───────────▼───── WORKER 2 (PC 3) ┐
                 │ DataNode · NodeManager                   │ │ DataNode · NodeManager           │
                 │ Map/Reduce tasks · Spark executors       │ │ Map/Reduce tasks · Spark executors│
                 └──────────────────────────────────────────┘ └──────────────────────────────────┘
```

**Data flow:** CSV → HDFS → MapReduce job + Spark job (run on the workers) → results in HDFS + `results.json` → dashboard.

### MapReduce logic (average rating per genre)

```
ratings.csv line: 1,1,4.0,964982703  (user 1 gave movie 1 = Toy Story 4.0 stars)
MAP     → (Adventure,4.0) (Animation,4.0) (Children,4.0) (Comedy,4.0) (Fantasy,4.0)
SHUFFLE → Adventure: [4.0, 3.5, 5.0, ...]   Comedy: [4.0, 2.0, ...]   ...
REDUCE  → Adventure  3.5087  24161
```

---

## 4. Repository structure

```
movie-rating-analysis/
├── README.md                  ← this guide
├── COMMANDS.md                ← Hadoop/HDFS/YARN/Spark commands to explain in the demo
├── cluster-setup/             ← install & configure the 3-node cluster
│   ├── 01_prerequisites.sh    (all nodes)  Java, SSH, Python
│   ├── 02_install_hadoop.sh   (all nodes)  Hadoop + our configs
│   ├── 03_setup_ssh.sh        (master)     password-less SSH
│   ├── 04_install_spark.sh    (master)     Spark on YARN
│   ├── 05_start_cluster.sh    (master)     format + start HDFS & YARN
│   ├── 06_stop_cluster.sh     (master)     stop everything
│   ├── hosts.example          /etc/hosts entries
│   └── hadoop-config/         core-site, hdfs-site, mapred-site, yarn-site, workers
├── data/
│   ├── download_data.sh       download MovieLens (Linux)
│   └── download_data.ps1      download MovieLens (Windows)
├── mapreduce/
│   ├── mapper.py              emits (genre, rating)
│   ├── reducer.py             averages per genre
│   └── run_mapreduce.sh       submits the Hadoop Streaming job
├── spark/
│   ├── movie_analysis.py      PySpark job: all analytics → results.json
│   └── run_spark.sh           spark-submit to YARN
├── scripts/
│   └── run_pipeline.sh        ONE command: upload → MapReduce → Spark → results
├── local/                     test everything on one laptop, no cluster needed
│   ├── run_mapreduce_local.py simulates mapper | sort | reducer
│   └── analyze_local.py       same output as the Spark job, pure Python
└── docs/                      ← the dashboard (served by GitHub Pages)
    ├── index.html · style.css · app.js
    └── data/results.json      analysis results the dashboard reads
```

---

## 5. Quick start: test on your laptop (Windows/Linux/Mac, 2 minutes)

You only need Python 3. No Hadoop or libraries required.

```bash
# 1. Download the dataset
powershell -ExecutionPolicy Bypass -File data\download_data.ps1     # Windows
bash data/download_data.sh                                           # Linux/Mac

# 2. Run the MapReduce logic locally (mapper → sort → reducer)
python local/run_mapreduce_local.py

# 3. Run the full analysis locally (writes docs/data/results.json)
python local/analyze_local.py

# 4. Open the dashboard
cd docs
python -m http.server 8000
# open http://localhost:8000 in your browser
```

> The dashboard must be opened through a web server (step 4), not by double-clicking `index.html`. Browsers block `fetch()` on `file://` pages.

---

## 6. Full cluster setup (1 master + 2 workers)

### 6.0 What you need
- **3 PCs** (or 3 virtual machines) on the **same Wi-Fi/LAN**, each with **Ubuntu 22.04**, at least 4 GB RAM and 20 GB free disk.
- If you only have Windows laptops: install **VirtualBox**, create an Ubuntu 22.04 VM on each laptop, and set the VM network adapter to **Bridged Adapter** so the VMs can reach each other.

### 6.1 Create the same user on all 3 machines
```bash
sudo adduser hadoop
sudo usermod -aG sudo hadoop
su - hadoop
```
Set the hostname on each machine (one command per machine):
```bash
sudo hostnamectl set-hostname master     # on PC 1
sudo hostnamectl set-hostname worker1    # on PC 2
sudo hostnamectl set-hostname worker2    # on PC 3
```

### 6.2 Get the project onto every machine
```bash
sudo apt install -y git
git clone https://github.com/YOUR-USERNAME/movie-rating-analysis.git
cd movie-rating-analysis
```

### 6.3 Prerequisites (ALL 3 machines)
```bash
bash cluster-setup/01_prerequisites.sh
```
Then edit `/etc/hosts` on **all 3 machines** (`sudo nano /etc/hosts`) and add the real IPs (see `cluster-setup/hosts.example`):
```
192.168.1.10   master
192.168.1.11   worker1
192.168.1.12   worker2
```
⚠️ Delete the line `127.0.1.1  master` (or `worker1`/`worker2`). Otherwise the workers cannot connect.
Check: `ping -c 2 worker1` from master.

### 6.4 Install Hadoop (ALL 3 machines)
```bash
bash cluster-setup/02_install_hadoop.sh
source ~/.bashrc
hadoop version
```

### 6.5 Password-less SSH (MASTER only)
```bash
bash cluster-setup/03_setup_ssh.sh
```

### 6.6 Install Spark (MASTER only)
```bash
bash cluster-setup/04_install_spark.sh
source ~/.bashrc
spark-submit --version
```

### 6.7 Start the cluster (MASTER)
```bash
bash cluster-setup/05_start_cluster.sh --format    # first time only
# later: bash cluster-setup/05_start_cluster.sh
```
Expected output:
- `jps` on master: **NameNode, SecondaryNameNode, ResourceManager, JobHistoryServer**
- `jps` on workers: **DataNode, NodeManager**
- `hdfs dfsadmin -report`: **Live datanodes (2)**
- Browser: `http://master:9870` (HDFS) and `http://master:8088` (YARN)

### 6.8 Run the whole project (MASTER)
```bash
bash scripts/run_pipeline.sh
```
This single script:
1. downloads MovieLens (if missing)
2. uploads `ratings.csv` and `movies.csv` to HDFS `/movielens/input`
3. runs the **MapReduce** job → `/movielens/output/mapreduce_genre_avg`
4. runs the **Spark** job on YARN → `/movielens/output/spark_genre_avg` + `docs/data/results.json`

Watch both jobs appear in the YARN UI at `http://master:8088` during the run.

Want a bigger "big data" demo? Run `bash data/download_data.sh full` first. It downloads **25 million ratings** (ml-25m) and the same pipeline works unchanged.

---

## 7. Put it on GitHub + get the live link

### 7.1 One-time setup on Windows
1. Create a free account at <https://github.com>.
2. Install Git: <https://git-scm.com/download/win> (keep the default options), then reopen VS Code / the terminal.
3. Tell Git who you are:
   ```bash
   git config --global user.name  "Your Name"
   git config --global user.email "you@example.com"
   ```

### 7.2 Create the repository on GitHub
1. Go to <https://github.com/new>.
2. Repository name: `movie-rating-analysis`, set it to **Public**, and **do not** tick "Add a README".
3. Click **Create repository**.

### 7.3 Push the project
In the project folder:
```bash
git init
git add .
git commit -m "Movie Rating Analysis - Hadoop MapReduce + Spark + Dashboard"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/movie-rating-analysis.git
git push -u origin main
```
(A browser window opens the first time so you can log in to GitHub.)

### 7.4 Turn on the live dashboard (GitHub Pages)
1. On the repository page: **Settings → Pages**.
2. **Source:** "Deploy from a branch". **Branch:** `main`, folder **`/docs`**, then **Save**.
3. Wait 1–2 minutes and refresh. The live link appears:
   **`https://YOUR-USERNAME.github.io/movie-rating-analysis/`**
4. Put that link at the top of this README (replace `YOUR-USERNAME`).

### 7.5 Update the dashboard with cluster results
After `run_pipeline.sh` finishes on the master:
```bash
git add docs/data/results.json
git commit -m "Results from 3-node cluster run"
git push
```
The live site updates within about a minute. The footer then says *"Computed with: Apache Spark 3.5.3 (master: yarn)"*.

---

## 8. Demo checklist (for evaluation)

- [ ] Show the 3 PCs and `jps` on each (master + 2 workers).
- [ ] `hdfs dfsadmin -report` → 2 live DataNodes; HDFS web UI → Datanodes tab.
- [ ] Explain and run HDFS commands: `-mkdir`, `-put`, `-ls`, `-cat`, `fsck` (see [COMMANDS.md](COMMANDS.md)).
- [ ] Explain mapper/reducer and run `bash mapreduce/run_mapreduce.sh`. Show the job in the YARN UI.
- [ ] Run `bash spark/run_spark.sh`. Show the executors on the workers in the Spark UI.
- [ ] Show results in HDFS: `hdfs dfs -cat /movielens/output/spark_genre_avg/part-*`.
- [ ] Open the live dashboard and show the "MapReduce vs Spark" table (all ✓).
- [ ] Show the GitHub repository.

---

## 9. Troubleshooting

| Problem | Fix |
|---|---|
| `Live datanodes (0)` | Wrong `/etc/hosts` (remove `127.0.1.1` line), or firewall: `sudo ufw disable` on all nodes. Check logs in `~/hadoop/logs/` on the worker. |
| DataNode doesn't start after re-formatting | Cluster ID mismatch. On workers: `rm -rf ~/hadoopdata/hdfs/datanode/*`, then restart. |
| `JAVA_HOME is not set` | Re-run `02_install_hadoop.sh`, or set `export JAVA_HOME=...` in `~/hadoop/etc/hadoop/hadoop-env.sh`. |
| `Permission denied (publickey)` on start | Re-run `03_setup_ssh.sh`; test `ssh worker1` without a password. |
| MapReduce job stuck at "ACCEPTED" | Not enough YARN memory. Lower `mapreduce.*.memory.mb` or raise `yarn.nodemanager.resource.memory-mb`. |
| `python3: not found` in map tasks | Install Python 3 on the workers (`01_prerequisites.sh`). |
| `Name node is in safe mode` | `hdfs dfsadmin -safemode leave` |
| `bad interpreter: /bin/bash^M` | The file has Windows line endings: `sed -i 's/\r$//' script.sh` |
| Dashboard shows "Could not load results" | Open it via `python -m http.server`, not by double-clicking. |

---

## 10. Team

| Name | Roll No. | Role |
|---|---|---|
| Member 1 | | Cluster setup (Hadoop/HDFS/YARN) |
| Member 2 | | MapReduce job |
| Member 3 | | Spark analytics |
| Member 4 | | Dashboard & GitHub |

---

## 11. References
- F. Maxwell Harper and Joseph A. Konstan. 2015. *The MovieLens Datasets: History and Context.* ACM TiiS 5(4). <https://grouplens.org/datasets/movielens/>
- Apache Hadoop 3.3.6 docs: <https://hadoop.apache.org/docs/r3.3.6/>
- Hadoop Streaming: <https://hadoop.apache.org/docs/r3.3.6/hadoop-streaming/HadoopStreaming.html>
- Apache Spark 3.5 docs: <https://spark.apache.org/docs/3.5.3/>
- Running Spark on YARN: <https://spark.apache.org/docs/3.5.3/running-on-yarn.html>
