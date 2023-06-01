import re

from .utils import QueryFailure


class ParsingFailure(QueryFailure):
    pass


def parse_tag(tag: str, text: str, required=False) -> str | None:
    if len(re.findall(f"<{tag}>", text)) > 1 or len(re.findall(f"</{tag}>", text)) > 1:
        raise ParsingFailure(
            "Multiple occurences of '<{tag}>' or '</{tag}>' found in parsed text"
        )
    r = re.search(f"<{tag}>(.*)</{tag}>", text, re.MULTILINE | re.DOTALL)
    if not r or not r.groups():
        if required:
            raise ParsingFailure("Tags '<{tag}>...</{tag}>' not found in parsed text")
        return None
    return r.groups()[0]