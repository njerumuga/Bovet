from fastapi import APIRouter
from app.api.endpoints.auth import router as auth_router
from app.api.endpoints.customers import router as customers_router
from app.api.endpoints.products import router as products_router
from app.api.endpoints.invoices import router as invoices_router
from app.api.endpoints.dashboard import router as dashboard_router
from app.api.endpoints.reports import router as reports_router
from app.api.endpoints.admin import router as admin_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(customers_router)
api_router.include_router(products_router)
api_router.include_router(invoices_router)
api_router.include_router(dashboard_router)
api_router.include_router(reports_router)
api_router.include_router(admin_router)
