from django.apps import AppConfig


class UniapiConfig(AppConfig):
    name = 'uniapi'

    def ready(self) -> None:
        from . import checks  # noqa: F401
