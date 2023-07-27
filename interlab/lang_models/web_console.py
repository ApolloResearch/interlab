from typing import Optional

from ..ui.console_server import ConsoleServer
from .base import LangModelBase


class WebConsoleModel(LangModelBase):
    def __init__(self, name: str, port: Optional[int] = 0):
        self.name = name
        self.server = ConsoleServer(name, port=port)

    def query(self, prompt: str, max_tokens=1024, strip=None) -> str:
        self.server.clear()
        self.server.add_message(prompt)
        return self.server.receive()

    def display(self, width=900, height=500):
        return self.server.display(width, height)

    def __repr__(self):
        return f"<{self.__class__.__name__} name={self.name} url={self.server.url}"
