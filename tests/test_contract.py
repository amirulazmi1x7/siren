import copy
from functools import lru_cache

from shared.contract import plan_key, validate_scenarios
from shared.make_fake import make_fake


@lru_cache(maxsize=1)
def _fake():
    return make_fake()


def fake():
    return copy.deepcopy(_fake())


def test_plan_key_is_order_independent():
    assert plan_key(["B-3", "A-2", "A-3"]) == "A-2,A-3,B-3"
    assert plan_key([]) == ""


def test_fake_is_valid():
    assert validate_scenarios(fake()) == []


def test_lookup_covers_all_plans_up_to_4():
    night = _fake()["nights"]["typical"]
    assert len(night["lookup"]) == 4048
    assert "" in night["lookup"]


def test_validator_catches_missing_night_field():
    d = fake()
    del d["nights"]["typical"]["calls"]
    assert any("calls" in e for e in validate_scenarios(d))


def test_validator_catches_late_id_not_in_calls():
    d = fake()
    d["nights"]["typical"]["baseline"]["late_ids"].append(10**9)
    assert validate_scenarios(d) != []


def test_validator_catches_bad_stuck_shape():
    d = fake()
    d["nights"]["heat"]["baseline"]["stuck"] = [[0] * 6, [0] * 6]
    assert any("stuck" in e for e in validate_scenarios(d))


def test_validator_catches_unsorted_lookup_key():
    d = fake()
    lk = d["nights"]["typical"]["lookup"]
    lk["B-3,A-2"] = lk.pop("A-2,B-3")
    assert validate_scenarios(d) != []


def test_ai_plan_slots_match_budget():
    night = _fake()["nights"]["typical"]
    for k in range(1, 7):
        assert len(night["ai_plans"][str(k)]["slots"]) == k


def test_more_nurses_never_more_late_in_fake():
    night = _fake()["nights"]["typical"]
    base = len(night["baseline"]["late_ids"])
    for key, res in night["lookup"].items():
        assert len(res["late_ids"]) <= base, key
