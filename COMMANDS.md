# Command Cheat Sheet (for the demo / viva)

The project requirements ask you to *"execute and explain basic usage commands"*.
These are the commands to show, each with a one-line explanation you can say out loud.
Run them on the **master** node as user `hadoop`.

---

## 1. Cluster health

| Command | What it does |
|---|---|
| `jps` | Lists the Java processes (Hadoop daemons) running on this machine. Master shows **NameNode, SecondaryNameNode, ResourceManager**; workers show **DataNode, NodeManager**. |
| `ssh worker1 jps` | Runs `jps` on worker1 from the master (proves password-less SSH works). |
| `hdfs dfsadmin -report` | HDFS cluster report: total capacity, used space, and the list of **live DataNodes** (should be 2). |
| `yarn node -list` | Lists the NodeManagers registered with YARN (should be worker1 and worker2). |
| `hadoop version` | Shows the installed Hadoop version. |
| `spark-submit --version` | Shows the installed Spark version. |

Web UIs (open in a browser on any PC in the network):
- HDFS NameNode: `http://master:9870` → *Datanodes* tab shows both workers
- YARN ResourceManager: `http://master:8088` → shows running / finished jobs
- MapReduce Job History: `http://master:19888`

---

## 2. HDFS file system commands

| Command | What it does |
|---|---|
| `hdfs dfs -mkdir -p /movielens/input` | Creates a directory in HDFS (`-p` = create parents too). |
| `hdfs dfs -put -f ratings.csv /movielens/input/` | Uploads a local file into HDFS (`-f` = overwrite). |
| `hdfs dfs -ls -h /movielens/input` | Lists files in HDFS with human-readable sizes. |
| `hdfs dfs -cat /movielens/input/movies.csv \| head` | Prints the first lines of a file stored in HDFS. |
| `hdfs dfs -du -h /movielens` | Disk usage of an HDFS directory. |
| `hdfs dfs -get /movielens/output/mapreduce_genre_avg ./mr_out` | Downloads a file/folder from HDFS to the local disk. |
| `hdfs dfs -rm -r /movielens/output/old` | Deletes a directory from HDFS. |
| `hdfs fsck /movielens/input/ratings.csv -files -blocks -locations` | Shows how the file is split into **blocks** and **which DataNodes** hold each replica. |
| `hdfs dfs -setrep 2 /movielens/input/ratings.csv` | Changes the replication factor of a file. |

---

## 3. Running the MapReduce job

```bash
bash mapreduce/run_mapreduce.sh
```
Inside, the key command is:
```bash
hadoop jar $HADOOP_HOME/share/hadoop/tools/lib/hadoop-streaming-*.jar \
    -files mapreduce/mapper.py,mapreduce/reducer.py,data/raw/ml-latest-small/movies.csv \
    -mapper "python3 mapper.py" -reducer "python3 reducer.py" \
    -input /movielens/input/ratings.csv -output /movielens/output/mapreduce_genre_avg
```
- **Hadoop Streaming** lets us write the mapper and reducer in Python. They talk to Hadoop through stdin/stdout.
- `-files` ships the scripts and `movies.csv` to every worker (the **distributed cache**).
- **Map:** for each rating, look up the movie's genres and emit `(genre, rating)`.
- **Shuffle & sort:** Hadoop groups all ratings of the same genre together.
- **Reduce:** sum and count per genre, then output the average.

| Command | What it does |
|---|---|
| `yarn application -list` | Lists jobs currently running on YARN. |
| `yarn application -list -appStates FINISHED` | Lists completed jobs. |
| `yarn logs -applicationId <app_id>` | Shows the logs of a job (useful for debugging). |
| `mapred job -list all` | Lists MapReduce jobs. |
| `hdfs dfs -cat /movielens/output/mapreduce_genre_avg/part-*` | Shows the MapReduce result. |

---

## 4. Running the Spark job

```bash
bash spark/run_spark.sh
```
The key command is:
```bash
spark-submit --master yarn --deploy-mode client --num-executors 2 \
    spark/movie_analysis.py --ratings hdfs://master:9000/movielens/input/ratings.csv ...
```
- `--master yarn` means Spark asks YARN for resources, and the **executors run on the worker nodes**.
- `--deploy-mode client` means the driver runs on the master, so `results.json` is written there.
- While it runs, open `http://master:8088`, click the application, then **ApplicationMaster** to see the Spark UI (jobs, stages, executors).

Interactive Spark shell (good for a live demo):
```bash
pyspark --master yarn
```
```python
r = spark.read.csv("hdfs://master:9000/movielens/input/ratings.csv", header=True, inferSchema=True)
r.count()                                  # 100836
r.groupBy("rating").count().orderBy("rating").show()
r.select("userId").distinct().count()      # 610 users
```

---

## 5. Start / stop

| Command | What it does |
|---|---|
| `hdfs namenode -format` | **First time only.** Initialises HDFS metadata (erases HDFS!). |
| `start-dfs.sh` / `stop-dfs.sh` | Starts/stops NameNode + DataNodes on all nodes (via SSH). |
| `start-yarn.sh` / `stop-yarn.sh` | Starts/stops ResourceManager + NodeManagers. |
| `mapred --daemon start historyserver` | Starts the MapReduce Job History server. |
| `hdfs dfsadmin -safemode leave` | Takes HDFS out of safe mode if it gets stuck after a restart. |
