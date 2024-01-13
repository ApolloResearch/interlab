import warnings
from dataclasses import KW_ONLY, dataclass
from typing import Any, Callable

import numpy as np

from interlab.queries import summarize_with_limit
from treetrace import TracingNode, current_tracing_node, shorten_str

from ..list_memory import BaseMemoryItem, ListMemory

_LOG = __import__("logging").getLogger(__name__)


@dataclass(frozen=True)
class SummarizingMemoryItem(BaseMemoryItem):
    _: KW_ONLY
    level: int = 0


class SummarizingMemory(ListMemory):
    def __init__(
        self,
        model: Any,
        token_limit=2000,
        one_message_limit=500,
        summary_limit=250,
    ):
        super().__init__(count_tokens_model=model)
        self.model = model
        self.token_limit = token_limit
        self.one_message_limit = one_message_limit
        self.summary_limit = summary_limit

    def _total_tokens_ub(self) -> int:
        """Upper-bound of total tokens of the memory text (including separator newlines etc.)."""
        return sum(i.token_count + 5 for i in self.items)

    def summarize(self):
        """
        Perform one step of summarization, decreasing the total token count.

        May need to be run repeatedly.
        """
        # First, are there any non-last long level-0 items?
        for i, item in enumerate(self.items[:-1]):
            if item.level == 0 and item.token_count > self.summary_limit:
                # Found one; summarize it
                msg = (
                    f"summarize: shortening {item.token_count} token message to {self.summary_limit}: "
                    f"{shorten_str(item.memory)!r}"
                )
                _LOG.debug(msg)
                current_tracing_node().add_event(msg)
                new_text = summarize_with_limit(
                    item.memory,
                    model=self.model,
                    token_limit=self.summary_limit - 5,
                )
                self.items[i] = SummarizingMemoryItem(
                    memory=new_text,
                    token_count=self._count_tokens(new_text),
                    time=item.time,
                    level=item.level,
                )
                return

        # Find most abundant level and summarize two consecutive items of that level
        # (or that level and the following item, in sme extreme situations)
        level_counts = [0] * 20
        for i, item in enumerate(self.items[:-1]):
            level_counts[item.level] += 1
        summary_level = np.argmax(level_counts)

        # Find the first item of that level
        for i, item in enumerate(self.items[:-1]):
            if item.level == summary_level:
                i1, i2 = self.items[i : i + 2]
                msg = (
                    f"summarize: summarizing {i1.token_count} tokens (level {i1.level}) and {i2.token_count} tokens "
                    f"(level {i2.level}) messages to {self.summary_limit} tokens"
                )
                _LOG.debug(msg)
                current_tracing_node().add_event(
                    msg
                )  # This is the tracing node from add_memory()
                text = summarize_with_limit(
                    f"{i1.memory}\n\n{i2.memory}",
                    model=self.model,
                    token_limit=self.summary_limit - 5,
                )
                self.items[i : i + 2] = [
                    SummarizingMemoryItem(
                        memory=text,
                        token_count=self._count_tokens(text),
                        time=i1.time,
                        level=max(i1.level, i2.level) + 1,
                    )
                ]

                return
        raise Exception("Error: summarization failed")

    def add_memory(self, memory: str, time: Any = None, data: Any = None):
        with TracingNode(
            "SummarizingMemory.add_memory",
            inputs=dict(memory=memory, time=time),
            kind="debug",
        ) as c:
            memory = str(memory)
            if data is not None:
                warnings.warn(
                    f"{self.__class__.__name__} discards memory `data` field but got nonempty `data`."
                )

            token_count = self._count_tokens(memory)
            if token_count > self.one_message_limit:
                msg = (
                    f"add_event: shortening {token_count} token message to {self.one_message_limit}: "
                    f"{shorten_str(memory)!r}"
                )
                c.add_event(msg)
                _LOG.debug(msg)
                memory = summarize_with_limit(
                    memory,
                    model=self.model,
                    token_limit=self.one_message_limit - 5,
                )
                token_count = self._count_tokens(memory)  # Estimate for newlines etc.

            self.items.append(
                SummarizingMemoryItem(
                    memory, token_count=token_count + 5, level=0, time=time
                )
            )
            while self._total_tokens_ub() > self.token_limit:
                self.summarize()

    def format_memories(
        self,
        query: str = None,
        separator: str = "\n\n",
        formatter: Callable[[BaseMemoryItem], str] = None,
        item_limit: int = None,
        token_limit: int = None,
    ) -> str:
        if item_limit is not None:
            warnings.warn(
                f"The `item_limit` parameter of {self.__class__.__name__}.format_memories() should not be used, "
                "as the number has very different meaning in the case of this memory system."
            )
        return super().format_memories(
            query=query,
            separator=separator,
            formatter=formatter,
            item_limit=item_limit,
            token_limit=token_limit,
        )
