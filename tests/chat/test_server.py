from types import SimpleNamespace as NS

from chat import server


class FakeMessages:
    """Claude stand-in: first asks for compare_options, then answers."""
    def __init__(self):
        self.calls = []

    def create(self, **kw):
        self.calls.append(kw)
        if len(self.calls) == 1:
            use = NS(type="tool_use", id="t1", name="compare_options", input={"night": "typical", "budget_usd": 900})
            return NS(content=[use], stop_reason="tool_use")
        return NS(content=[NS(type="text", text="Add 5 nurse shifts.")], stop_reason="end_turn")


def test_chat_runs_tools_and_returns_steps_and_plan(monkeypatch):
    fake = FakeMessages()
    monkeypatch.setattr(server, "_client", NS(beta=NS(messages=fake)))
    out = server.chat("s1", "What should I do with $900 on a typical Friday?")
    assert out["reply"] == "Add 5 nurse shifts."
    assert out["steps"][0]["summary"] == "Comparing fixes for $900 on the typical Friday"
    assert out["plan"]["cost_usd"] <= 900 and out["plan"]["nurse_shifts"]
    # the tool result went back to Claude, and history is kept for the next turn
    history = server._sessions["s1"]       # user, assistant(tool_use), user(tool_result), assistant(answer)
    assert len(history) == 4 and history[2]["content"][0]["type"] == "tool_result"


def test_refusal_gives_a_polite_reply(monkeypatch):
    msgs = NS(create=lambda **kw: NS(content=[], stop_reason="refusal"))
    monkeypatch.setattr(server, "_client", NS(beta=NS(messages=msgs)))
    assert "planning" in server.chat("s2", "something off-topic")["reply"]
