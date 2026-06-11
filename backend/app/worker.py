from celery import Celery
from app.config import settings
import logging

# Initialize Celery app
celery_app = Celery(
    "railsense",
    broker=settings.CELERY_BROKER_URL or "redis://localhost:6379/1",
    backend=settings.CELERY_RESULT_BACKEND or "redis://localhost:6379/2",
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # Hard time limit: 30 minutes
    task_soft_time_limit=25 * 60,  # Soft time limit: 25 minutes
    broker_connection_retry_on_startup=True,
)

logger = logging.getLogger(__name__)


@celery_app.task(name="check_subscriptions_task")
def check_subscriptions_task():
    """
    Celery Beat task that runs every 5 minutes to check SMS subscriptions
    and send alerts for trains with significant delays.
    """
    logger.info("Running check_subscriptions_task")
    # Implementation in Phase 6
    return {"status": "completed"}


@celery_app.task(name="process_platform_analysis")
def process_platform_analysis(analysis_id: str):
    """
    Background task to process platform guard analysis results
    """
    logger.info(f"Processing platform analysis {analysis_id}")
    # Implementation in Phase 5
    return {"status": "completed", "analysis_id": analysis_id}


@celery_app.task(name="process_track_analysis")
def process_track_analysis(analysis_id: str):
    """
    Background task to process track inspector analysis results
    """
    logger.info(f"Processing track analysis {analysis_id}")
    # Implementation in Phase 5
    return {"status": "completed", "analysis_id": analysis_id}
