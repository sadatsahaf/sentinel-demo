import os

_cache = {}

FALLBACK_EXPLANATIONS = {
    "OVERHEAT": (
        "This GPU node is dangerously overheating. At temperatures above 88°C, "
        "NVIDIA GPUs begin thermal throttling — slowing down to avoid permanent damage. "
        "If temperature exceeds 95°C the node will emergency-shutdown, killing all running jobs. "
        "Migrate workloads to a cooler node immediately and check physical cooling."
    ),
    "IDLE": (
        "This GPU node has been unused for an extended period while still powered on and billed. "
        "At $3.40/hr a single idle GPU costs over $2,400/month in pure waste. "
        "Deallocate this node or schedule a pending job onto it within the next 5 minutes."
    ),
    "HARDWARE_FAULT": (
        "ECC memory errors indicate physical GPU memory degradation. "
        "More than 3 errors in a monitoring window signals progressive hardware failure — "
        "jobs on this node risk silent data corruption, meaning model weights could be silently wrong. "
        "Quarantine this node from production workloads and schedule hardware replacement."
    ),
    "OVERLOAD": (
        "This GPU is running near absolute capacity. Above 93% utilization the scheduler "
        "cannot safely place new jobs and the CUDA runtime may drop compute kernels. "
        "Redistribute pending jobs to nodes with lower utilization before submitting any new work."
    ),
    "JOB_OVERRUN": (
        "This training job has exceeded its expected runtime by over 100%. "
        "Common causes: data pipeline bottleneck, memory leak causing repeated garbage collection, "
        "or network saturation in distributed training. "
        "Check job throughput metrics and consider killing and resubmitting with a larger batch size."
    ),
}

def _build_prompt(alert: dict, cluster_state: dict) -> str:
    return f"""You are SENTINEL, an AI ops assistant for a GPU compute cluster.
An engineer just received this alert.

ALERT:
- Type: {alert['type']}
- Severity: {alert['severity']}
- Node: {alert['node_name']}
- Message: {alert['message']}

CLUSTER CONTEXT:
- Total nodes: {cluster_state.get('total_nodes')}
- Unhealthy nodes: {cluster_state.get('unhealthy_count')}
- Hourly cost: ${cluster_state.get('hourly_rate')}
- Active jobs: {cluster_state.get('active_jobs')}

Respond in exactly 3 sentences:
1. What is happening right now and why it matters technically
2. The risk if no action is taken (financial or operational)
3. The single most important action the engineer must take right now

Be direct. No fluff. No markdown. No "I" statements."""

def get_explanation(alert: dict, cluster_state: dict) -> str:
    cache_key = f"{alert['type']}_{alert['node_name']}"
    if cache_key in _cache:
        return _cache[cache_key]

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("API_KEY")

    if api_key:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=_build_prompt(alert, cluster_state)
            )
            explanation = response.text.strip()
            _cache[cache_key] = explanation
            return explanation
        except Exception as e:
            print(f"Gemini error: {e}")

    fallback = FALLBACK_EXPLANATIONS.get(
        alert["type"],
        "This alert requires immediate attention. Review the node metrics and migrate workloads if the condition persists."
    )
    _cache[cache_key] = fallback
    return fallback
