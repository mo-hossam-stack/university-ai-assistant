from django.contrib import admin
from django.urls import path, include
from django.http import HttpRequest, JsonResponse


def health_check(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"status": "healthy"})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('uniapi.urls')),
    path('health/', health_check),
]
