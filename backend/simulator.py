import random
import time
import threading
from datetime import datetime, timedelta

TEAMS = ["Alpha", "Beta", "Gamma", "Delta", "Sigma"]
GPU_COST_PER_HOUR = 3.40

JOB_NAMES = [
    "llm-finetune", "image-classifier", "data-pipeline",
    "bert-training", "diffusion-model", "anomaly-detector",
    "recommendation-engine", "speech-recognition", "object-detection",
    "transformer-xl", "gan-training", "reinforcement-agent",
    "nlp-preprocessing", "embedding-generator", "vision-transformer"
]

class Node:
    def __init__(self, node_id):
        self.id = node_id
        self.name = f"node-{node_id:02d}"
        self.gpu_temp = random.uniform(55, 72)
        self.gpu_util = random.uniform(30, 70)
        self.gpu_memory_used = random.uniform(10, 50)
        self.gpu_memory_total = 80.0
        self.cpu_util = random.uniform(20, 60)
        self.ram_used = random.uniform(30, 70)
        self.power_draw = random.uniform(150, 280)
        self.error_count = 0
        self.status = "HEALTHY"
        self.uptime_hours = random.uniform(100, 5000)
        self._drift = random.choice(["stable", "heating", "cooling", "idle"])
        self._idle_minutes = 0

    def tick(self):
        # Randomly change drift occasionally
        if random.random() < 0.03:
            self._drift = random.choice(["stable", "heating", "cooling", "idle", "overload"])

        if self._drift == "heating":
            self.gpu_temp += random.uniform(0.3, 1.2)
            self.gpu_util += random.uniform(0.5, 2.0)
            self.power_draw += random.uniform(1, 4)
        elif self._drift == "cooling":
            self.gpu_temp -= random.uniform(0.2, 0.8)
            self.gpu_util -= random.uniform(0.3, 1.5)
            self.power_draw -= random.uniform(0.5, 2)
        elif self._drift == "idle":
            self.gpu_util -= random.uniform(1, 4)
            self.power_draw -= random.uniform(2, 6)
            self._idle_minutes += 0.083  # ~5 seconds in minutes
        elif self._drift == "overload":
            self.gpu_temp += random.uniform(0.5, 2.0)
            self.gpu_util += random.uniform(1, 3)
            self.power_draw += random.uniform(3, 8)
            if random.random() < 0.1:
                self.error_count += 1
        else:  # stable
            self.gpu_temp += random.uniform(-0.3, 0.3)
            self.gpu_util += random.uniform(-1, 1)

        # Clamp values
        self.gpu_temp = max(40, min(98, self.gpu_temp))
        self.gpu_util = max(0, min(100, self.gpu_util))
        self.gpu_memory_used = self.gpu_util / 100 * self.gpu_memory_total * random.uniform(0.8, 1.1)
        self.gpu_memory_used = max(0, min(self.gpu_memory_total, self.gpu_memory_used))
        self.cpu_util = max(5, min(100, self.cpu_util + random.uniform(-2, 2)))
        self.ram_used = max(10, min(95, self.ram_used + random.uniform(-1, 1)))
        self.power_draw = max(80, min(420, self.power_draw))

        # Reset idle counter if utilization picks up
        if self.gpu_util > 10:
            self._idle_minutes = 0
            if self._drift == "idle":
                self._drift = "stable"

        # Determine status
        if self.gpu_temp > 90 or self.error_count > 3 or (self._drift == "overload" and self.gpu_util > 95):
            self.status = "CRITICAL"
        elif self.gpu_temp > 82 or self.gpu_util > 90 or self._idle_minutes > 15:
            self.status = "WARNING"
        else:
            self.status = "HEALTHY"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "gpu_temp": round(self.gpu_temp, 1),
            "gpu_util": round(self.gpu_util, 1),
            "gpu_memory_used": round(self.gpu_memory_used, 1),
            "gpu_memory_total": self.gpu_memory_total,
            "cpu_util": round(self.cpu_util, 1),
            "ram_used": round(self.ram_used, 1),
            "power_draw": round(self.power_draw, 1),
            "error_count": self.error_count,
            "status": self.status,
            "uptime_hours": round(self.uptime_hours, 0),
            "idle_minutes": round(self._idle_minutes, 1),
            "drift": self._drift
        }


class Job:
    def __init__(self, job_id, node_id):
        self.id = job_id
        self.name = random.choice(JOB_NAMES)
        self.team = random.choice(TEAMS)
        self.node_id = node_id
        self.expected_duration = random.uniform(1, 8)  # hours
        self.started_at = datetime.now() - timedelta(hours=random.uniform(0, self.expected_duration * 1.5))
        self.status = "RUNNING"
        self.gpu_reserved = random.uniform(20, 80)
        self.memory_reserved = random.uniform(10, 60)

    @property
    def node_name(self):
        return f"node-{self.node_id:02d}"

    @property
    def runtime_hours(self):
        return (datetime.now() - self.started_at).total_seconds() / 3600

    @property
    def cost_so_far(self):
        return self.runtime_hours * GPU_COST_PER_HOUR

    @property
    def overrun(self):
        return self.runtime_hours > self.expected_duration

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "team": self.team,
            "node_id": self.node_id,
            "node_name": f"node-{self.node_id:02d}",
            "expected_duration": round(self.expected_duration, 1),
            "runtime_hours": round(self.runtime_hours, 2),
            "cost_so_far": round(self.cost_so_far, 2),
            "overrun": self.overrun,
            "gpu_reserved": round(self.gpu_reserved, 1),
            "memory_reserved": round(self.memory_reserved, 1),
            "status": self.status,
            "started_at": self.started_at.isoformat()
        }


class Alert:
    _counter = 0

    def __init__(self, alert_type, severity, node_name, message, detail):
        Alert._counter += 1
        self.id = Alert._counter
        self.type = alert_type
        self.severity = severity
        self.node_name = node_name
        self.message = message
        self.detail = detail
        self.timestamp = datetime.now()
        self.resolved = False
        self.ai_explanation = None

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "severity": self.severity,
            "node_name": self.node_name,
            "message": self.message,
            "detail": self.detail,
            "timestamp": self.timestamp.isoformat(),
            "resolved": self.resolved,
            "ai_explanation": self.ai_explanation
        }


class ClusterSimulator:
    def __init__(self):
        self.nodes = [Node(i) for i in range(1, 7)]
        self.jobs = {}
        self.alerts = []
        self.resolved_alerts = []
        self._job_counter = 0
        self._lock = threading.Lock()
        self._running = False

        # Seed initial jobs
        for node in self.nodes[:5]:
            self._create_job(node.id)

    def _create_job(self, node_id):
        self._job_counter += 1
        job = Job(self._job_counter, node_id)
        self.jobs[self._job_counter] = job
        return job

    def _check_anomalies(self):
        for node in self.nodes:
            nd = node.to_dict()
            existing_types = {
                a.type + a.node_name
                for a in self.alerts
                if not a.resolved
            }

            key_temp = f"OVERHEAT{node.name}"
            if nd["gpu_temp"] > 88 and key_temp not in existing_types:
                self.alerts.append(Alert(
                    "OVERHEAT", "CRITICAL", node.name,
                    f"{node.name} GPU temperature critical",
                    f"Temperature at {nd['gpu_temp']}°C — hardware damage threshold approaching. Workload migration recommended immediately."
                ))

            key_idle = f"IDLE{node.name}"
            if nd["idle_minutes"] > 20 and key_idle not in existing_types:
                waste = nd["idle_minutes"] / 60 * GPU_COST_PER_HOUR
                self.alerts.append(Alert(
                    "IDLE", "WARNING", node.name,
                    f"{node.name} idle for {nd['idle_minutes']:.0f} minutes",
                    f"GPU sitting unused for {nd['idle_minutes']:.0f} min. Estimated waste: ${waste:.2f}. Consider deallocating."
                ))

            key_err = f"ERRORS{node.name}"
            if nd["error_count"] > 2 and key_err not in existing_types:
                self.alerts.append(Alert(
                    "HARDWARE_FAULT", "CRITICAL", node.name,
                    f"{node.name} reporting memory errors",
                    f"{nd['error_count']} ECC memory errors detected. Node may require maintenance."
                ))

            key_overload = f"OVERLOAD{node.name}"
            if nd["gpu_util"] > 93 and key_overload not in existing_types:
                self.alerts.append(Alert(
                    "OVERLOAD", "WARNING", node.name,
                    f"{node.name} GPU near saturation",
                    f"GPU utilization at {nd['gpu_util']}%. Scheduling additional jobs here will cause queue buildup."
                ))

        # Check job overruns
        for job in self.jobs.values():
            if job.status == "RUNNING" and job.overrun:
                key_overrun = f"OVERRUN{job.id}"
                existing = {f"OVERRUN{a.detail}" for a in self.alerts if not a.resolved}
                if key_overrun not in existing:
                    self.alerts.append(Alert(
                        "JOB_OVERRUN", "WARNING", job.node_name,
                        f"Job {job.name} ({job.team}) running {job.runtime_hours:.1f}h over expected",
                        str(job.id)
                    ))

    def tick(self):
        with self._lock:
            for node in self.nodes:
                node.tick()
            self._check_anomalies()

            # Occasionally complete and restart jobs
            for jid in list(self.jobs.keys()):
                job = self.jobs[jid]
                if job.runtime_hours > job.expected_duration * 2.5:
                    del self.jobs[jid]
                    # Restart on a random healthy node
                    healthy = [n for n in self.nodes if n.status == "HEALTHY"]
                    if healthy:
                        self._create_job(random.choice(healthy).id)

    def start(self):
        self._running = True
        def loop():
            while self._running:
                self.tick()
                time.sleep(5)
        t = threading.Thread(target=loop, daemon=True)
        t.start()

    def stop(self):
        self._running = False

    def get_nodes(self):
        with self._lock:
            return [n.to_dict() for n in self.nodes]

    def get_jobs(self):
        with self._lock:
            return [j.to_dict() for j in self.jobs.values()]

    def get_alerts(self, include_resolved=False):
        with self._lock:
            alerts = self.alerts if include_resolved else [a for a in self.alerts if not a.resolved]
            return [a.to_dict() for a in sorted(alerts, key=lambda x: x.timestamp if hasattr(x, 'timestamp') else x['timestamp'], reverse=True)]

    def resolve_alert(self, alert_id):
        with self._lock:
            for a in self.alerts:
                if a.id == alert_id:
                    a.resolved = True
                    return True
            return False

    def set_alert_explanation(self, alert_id, explanation):
        with self._lock:
            for a in self.alerts:
                if a.id == alert_id:
                    a.ai_explanation = explanation
                    return True
            return False

    def get_cost_report(self):
        with self._lock:
            nodes = [n.to_dict() for n in self.nodes]
            jobs = [j.to_dict() for j in self.jobs.values()]

            idle_nodes = [n for n in nodes if n["idle_minutes"] > 10]
            idle_cost_hourly = len(idle_nodes) * GPU_COST_PER_HOUR

            team_costs = {}
            for job in jobs:
                t = job["team"]
                if t not in team_costs:
                    team_costs[t] = {"team": t, "jobs": 0, "cost": 0.0, "runtime_hours": 0.0}
                team_costs[t]["jobs"] += 1
                team_costs[t]["cost"] += job["cost_so_far"]
                team_costs[t]["runtime_hours"] += job["runtime_hours"]

            total_gpu_cost = sum(j["cost_so_far"] for j in jobs)
            waste_weekly = idle_cost_hourly * 24 * 7
            waste_monthly = idle_cost_hourly * 24 * 30

            return {
                "total_nodes": len(nodes),
                "idle_nodes": len(idle_nodes),
                "active_nodes": len(nodes) - len(idle_nodes),
                "hourly_rate": round(GPU_COST_PER_HOUR * len(nodes), 2),
                "idle_cost_hourly": round(idle_cost_hourly, 2),
                "waste_weekly": round(waste_weekly, 2),
                "waste_monthly": round(waste_monthly, 2),
                "total_job_cost": round(total_gpu_cost, 2),
                "team_breakdown": sorted(team_costs.values(), key=lambda x: x["cost"], reverse=True),
                "idle_node_names": [n["name"] for n in idle_nodes]
            }

    def schedule_job(self, team, job_name, gpu_required):
        with self._lock:
            candidates = []
            for node in self.nodes:
                nd = node.to_dict()
                if nd["status"] != "CRITICAL" and nd["gpu_util"] < 85:
                    score = (100 - nd["gpu_util"]) * 0.5 + (90 - nd["gpu_temp"]) * 0.3 + (100 - nd["cpu_util"]) * 0.2
                    candidates.append((score, node))

            if not candidates:
                return None

            candidates.sort(key=lambda x: x[0], reverse=True)
            best_node = candidates[0][1]

            self._job_counter += 1
            job = Job(self._job_counter, best_node.id)
            job.name = job_name
            job.team = team
            job.gpu_reserved = gpu_required
            self.jobs[self._job_counter] = job
            return {"job": job.to_dict(), "placed_on": best_node.name, "score": round(candidates[0][0], 1)}


simulator = ClusterSimulator()
