import warnings
from typing import Any, Callable

from .base import BaseMemory, BaseMemoryItem


class ListMemory(BaseMemory):
    """
    A simple memory cosisting of a list of `BaseMemoryItem`s.
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.items = []

    def count_memories(self) -> int:
        return len(self.items)

    def add_memory(self, memory: str, time: Any = None, data: Any = None):
        self.items.append(
            BaseMemoryItem(
                memory=memory,
                time=time,
                data=data,
                token_count=self._count_tokens(memory),
            )
        )

    def format_memories(
        self,
        query: str = None,
        separator: str = "\n\n",
        formatter: Callable[[BaseMemoryItem], str] = None,
        item_limit: int = None,
        token_limit: int = None,
    ) -> str:
        if query is not None and query:
            warnings.warn(
                f"{self.__class__.__name__}.format_memories() ignores the query parameter but received one."
            )
        return self._format_memories_helper(
            self.items,
            separator=separator,
            formatter=formatter,
            item_limit=item_limit,
            token_limit=token_limit,
        )
