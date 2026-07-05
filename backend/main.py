from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager

from simulator import simulator
from gemini_service import get_explanation

@asynccontextmanager
async def lifespan(app: FastAPI):
    simulator.start()
    print("SENTINEL cluster simulator started.")
    yield
    simulator.stop()

app = FastAPI(title="SENTINEL API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "SENTINEL online", "version": "1.0.0"}


@app.get("/nodes")
def get_nodes():
    nodes = simulator.get_nodes()
    critical = sum(1 for n in nodes if n["status"] == "CRITICAL")
    warning = sum(1 for n in nodes if n["status"] == "WARNING")
    healthy = sum(1 for n in nodes if n["status"] == "HEALTHY")
    return {
        "nodes": nodes,
        "summary": {
            "total": len(nodes),
            "critical": critical,
            "warning": warning,
            "healthy": healthy
        }
    }


@app.get("/jobs")
def get_jobs():
    jobs = simulator.get_jobs()
    overruns = [j for j in jobs if j["overrun"]]
    total_cost = sum(j["cost_so_far"] for j in jobs)
    return {
        "jobs": jobs,
        "summary": {
            "total": len(jobs),
            "overruns": len(overruns),
            "total_cost_so_far": round(total_cost, 2)
        }
    }


@app.get("/alerts")
def get_alerts(include_resolved: bool = False):
    alerts = simulator.get_alerts(include_resolved=include_resolved)
    unresolved = [a for a in alerts if not a["resolved"]]
    critical = [a for a in unresolved if a["severity"] == "CRITICAL"]
    warning = [a for a in unresolved if a["severity"] == "WARNING"]
    return {
        "alerts": alerts,
        "summary": {
            "total_unresolved": len(unresolved),
            "critical": len(critical),
            "warning": len(warning)
        }
    }


@app.post("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: int):
    success = simulator.resolve_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"resolved": True, "alert_id": alert_id}


@app.post("/alerts/{alert_id}/explain")
def explain_alert(alert_id: int):
    alerts_raw = simulator.get_alerts(include_resolved=True)
    alert = next((a for a in alerts_raw if a["id"] == alert_id), None)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    cost = simulator.get_cost_report()
    jobs = simulator.get_jobs()
    nodes = simulator.get_nodes()
    unhealthy = sum(1 for n in nodes if n["status"] != "HEALTHY")

    cluster_state = {
        "total_nodes": cost["total_nodes"],
        "unhealthy_count": unhealthy,
        "hourly_rate": cost["hourly_rate"],
        "active_jobs": len(jobs)
    }

    explanation = get_explanation(alert, cluster_state)
    simulator.set_alert_explanation(alert_id, explanation)
    return {"alert_id": alert_id, "explanation": explanation}


@app.get("/cost")
def get_cost():
    return simulator.get_cost_report()


class ScheduleRequest(BaseModel):
    team: str
    job_name: str
    gpu_required: float = 40.0

@app.post("/schedule")
def schedule_job(request: ScheduleRequest):
    result = simulator.schedule_job(
        request.team,
        request.job_name,
        request.gpu_required
    )
    if not result:
        raise HTTPException(
            status_code=503,
            detail="No healthy nodes available. All nodes are at capacity or critical."
        )
    return {
        "success": True,
        "message": f"Job '{request.job_name}' scheduled on {result['placed_on']}",
        "job": result["job"],
        "placed_on": result["placed_on"],
        "scheduling_score": result["score"]
    }


@app.get("/health")
def health():
    nodes = simulator.get_nodes()
    alerts = simulator.get_alerts()
    cost = simulator.get_cost_report()
    return {
        "status": "online",
        "nodes_healthy": sum(1 for n in nodes if n["status"] == "HEALTHY"),
        "active_alerts": len(alerts),
        "hourly_waste": cost["idle_cost_hourly"]
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")