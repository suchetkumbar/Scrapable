from fastapi import APIRouter

from backend.app.api.routes.scrape import router as scrape_router
from backend.app.api.routes.system import router as system_router

api_router = APIRouter()
api_router.include_router(system_router)
api_router.include_router(scrape_router)
