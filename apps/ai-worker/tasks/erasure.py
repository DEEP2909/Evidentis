# EvidentIS AI Worker - DPDP Erasure Tasks
# Processes queued privacy erasure requests from Redis.

import json
import logging
import os
from typing import Any, Dict

import httpx
from celery import shared_task
from redis import Redis

logger = logging.getLogger(__name__)

API_SERVICE_URL = os.getenv('API_SERVICE_URL', 'http://api:4000')
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/1')
ERASURE_QUEUE = 'erasure_jobs'


def get_internal_key() -> str:
    return os.getenv('AI_SERVICE_INTERNAL_KEY', 'internal-key-for-dev')


def get_redis_client() -> Redis:
    return Redis.from_url(REDIS_URL, decode_responses=True)


@shared_task(bind=True)
def process_erasure_job(self, job_data: dict) -> Dict[str, Any]:
    """
    Process a single DPDP erasure job by calling the API internal endpoint.
    """
    required_fields = ('tenantId', 'advocateId')
    missing = [field for field in required_fields if not job_data.get(field)]
    if missing:
        raise ValueError(f"Missing required erasure job fields: {', '.join(missing)}")

    payload = {
        'tenantId': job_data['tenantId'],
        'advocateId': job_data['advocateId'],
        'requestId': job_data.get('requestId'),
        'reason': job_data.get('reason'),
    }

    with httpx.Client(timeout=120.0) as client:
        response = client.post(
            f'{API_SERVICE_URL}/internal/dpdp/erasure',
            headers={'X-Internal-Key': get_internal_key()},
            json=payload,
        )
        response.raise_for_status()
        data = response.json()

    logger.info(
        'Processed DPDP erasure for tenant=%s advocate=%s request=%s',
        payload['tenantId'],
        payload['advocateId'],
        payload.get('requestId'),
    )
    return {
        'status': 'success',
        'requestId': payload.get('requestId'),
        'tenantId': payload['tenantId'],
        'advocateId': payload['advocateId'],
        'result': data,
    }


@shared_task(bind=True)
def process_erasure_queue(self, batch_size: int = 25) -> Dict[str, Any]:
    """
    Drain queued DPDP erasure jobs from Redis and process them in batches.
    """
    logger.info('Starting DPDP erasure queue drain')
    redis_client = get_redis_client()

    processed = 0
    failed = 0
    last_error: str | None = None

    try:
        for _ in range(batch_size):
            raw_job = redis_client.rpop(ERASURE_QUEUE)
            if not raw_job:
                break

            try:
                job_data = json.loads(raw_job)
                process_erasure_job.run(job_data)
                processed += 1
            except Exception as exc:
                failed += 1
                last_error = str(exc)
                logger.error('Failed to process erasure job: %s', exc)

        logger.info('DPDP erasure queue drain complete: processed=%s failed=%s', processed, failed)
        return {
            'status': 'success' if failed == 0 else 'partial',
            'processed': processed,
            'failed': failed,
            'last_error': last_error,
        }
    finally:
        redis_client.close()
