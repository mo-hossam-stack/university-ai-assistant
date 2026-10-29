from django.contrib import admin
from django.http import HttpRequest, JsonResponse
from django.urls import include, path


def health_check(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"status": "healthy"})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('uniapi.urls')),
    path('health/', health_check),
]
