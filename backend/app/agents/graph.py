"""LangGraph orchestration for finalize endpoint.

새로운 흐름:
  research (Tavily) → content + 3 judges (병렬) → merge.

research 노드는 발표 전사 + 덱에서 검증 가능한 시장 주장을 뽑아 *실제 웹 검색*
으로 fact-check. 결과는 김팩트의 평가 prompt 에 명시적 외부 검증 블록으로 박힘.
"""

from __future__ import annotations

from typing import Any, TypedDict

from app.services.content_analyzer import (
    analyze_content,
    evaluate_judge,
    generate_action_items,
)
from app.services.web_research import fact_check_pitch, format_research_for_prompt


class AnalysisState(TypedDict, total=False):
    transcript: str
    audio_metrics: dict
    visual_metrics: dict
    context: dict
    research: dict  # Tavily fact-check 결과
    content_evaluation: dict
    judge_fact: dict
    judge_connect: dict
    judge_critical: dict
    strengths: list[str]
    weaknesses: list[str]
    action_items: list[str]
    insufficient_input: bool


MIN_TRANSCRIPT_CHARS = 30


async def gate_node(state: AnalysisState) -> dict:
    """입력이 평가하기에 *충분한지* 체크. 너무 짧으면 이후 노드 모두 스킵."""
    transcript = (state.get("transcript") or "").strip()
    audio = state.get("audio_metrics") or {}
    speech_seconds = audio.get("audio_chunks_seconds", 0)
    insufficient = (
        len(transcript) < MIN_TRANSCRIPT_CHARS
        and not (speech_seconds and speech_seconds > 5)
    )
    return {"insufficient_input": insufficient}


async def research_node(state: AnalysisState) -> dict:
    if state.get("insufficient_input"):
        return {"research": {"claims": [], "summary": "skipped (insufficient input)"}}
    transcript = state.get("transcript") or ""
    deck = (state.get("context") or {}).get("deck_text", "")
    research = await fact_check_pitch(transcript, deck)
    return {"research": research}


async def content_node(state: AnalysisState) -> dict:
    if state.get("insufficient_input"):
        return {
            "content_evaluation": {
                "core_message_clarity": 0,
                "argument_evidence_balance": 0,
                "empty_phrases_count": 0,
                "audience_comprehension": 0,
                "market_clarity": 0,
                "rationale": "발표 음성·전사 신호가 부족해 평가할 수 없음.",
                "weakest_logic_quote": "",
                "missing_evidence": [],
                "empty_phrase_quotes": [],
            }
        }
    eval_ = await analyze_content(
        state.get("transcript") or "",
        context=state.get("context") or {},
    )
    return {"content_evaluation": eval_}


def _judge_node_factory(judge_id: str):
    async def node(state: AnalysisState) -> dict:
        key = judge_id.replace("-", "_")
        if state.get("insufficient_input"):
            return {
                key: {
                    "score": 0,
                    "comment": "발표 신호 없음 — 평가 보류.",
                    "quote_cited": "",
                    "correction_suggestion": "",
                }
            }
        # 김팩트는 research 결과를 context에 추가로 받음
        ctx = dict(state.get("context") or {})
        if judge_id == "judge-fact":
            research_block = format_research_for_prompt(state.get("research") or {})
            if research_block:
                # 컨텍스트 dict 에 실제 외부 검증 블록을 별도 필드로 박음 — content_analyzer
                # 가 format_context_block 에서 deck_text 다음에 자동으로 보여줌
                ctx["external_research"] = research_block
        result = await evaluate_judge(
            judge_id,
            state.get("transcript") or "",
            (state.get("audio_metrics") or {}) | (state.get("visual_metrics") or {}),
            context=ctx,
        )
        return {key: result}

    node.__name__ = f"{judge_id.replace('-', '_')}_node"
    return node


async def merge_node(state: AnalysisState) -> dict:
    if state.get("insufficient_input"):
        return {
            "strengths": [],
            "weaknesses": ["발표 음성·전사 신호 부족 — 분석 불가"],
            "action_items": [
                "마이크 권한을 확인하고 30초 이상 발표를 진행해주세요.",
                "카메라 권한을 확인하고 얼굴이 화면 안에 있는지 점검해주세요.",
                "백엔드 audio-chunk 응답이 있는지 (개발자도구 Network 탭) 확인.",
            ],
            "trust_grade": "F",
            "grade_reason": "입력 신호 부족",
        }
    items = await generate_action_items(state)
    return {
        "strengths": items.get("strengths", []),
        "weaknesses": items.get("weaknesses", []),
        "action_items": items.get("actions", []),
        "trust_grade": items.get("trust_grade", "B"),
        "grade_reason": items.get("grade_reason", ""),
    }


def build_graph():
    from langgraph.graph import END, StateGraph

    g: StateGraph = StateGraph(AnalysisState)
    g.add_node("gate", gate_node)
    g.add_node("research", research_node)
    g.add_node("content", content_node)
    g.add_node("judge_fact", _judge_node_factory("judge-fact"))
    g.add_node("judge_connect", _judge_node_factory("judge-connect"))
    g.add_node("judge_critical", _judge_node_factory("judge-critical"))
    g.add_node("merge", merge_node)

    g.set_entry_point("gate")
    g.add_edge("gate", "research")
    g.add_edge("research", "content")
    g.add_edge("content", "judge_fact")
    g.add_edge("content", "judge_connect")
    g.add_edge("content", "judge_critical")
    g.add_edge("judge_fact", "merge")
    g.add_edge("judge_connect", "merge")
    g.add_edge("judge_critical", "merge")
    g.add_edge("merge", END)
    return g.compile()


_GRAPH = None


def get_graph():
    global _GRAPH
    if _GRAPH is None:
        _GRAPH = build_graph()
    return _GRAPH


async def run_analysis(
    transcript: str,
    audio_metrics: dict,
    visual_metrics: dict,
    context: dict | None = None,
) -> dict[str, Any]:
    graph = get_graph()
    result = await graph.ainvoke(
        {
            "transcript": transcript,
            "audio_metrics": audio_metrics,
            "visual_metrics": visual_metrics,
            "context": context or {},
        }
    )
    return result
