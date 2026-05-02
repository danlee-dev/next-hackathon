"""LangGraph orchestration for finalize endpoint.

Fan-out: content + 3 judges in parallel; fan-in: action items.
"""

from __future__ import annotations

from typing import Any, TypedDict

from app.services.content_analyzer import (
    analyze_content,
    evaluate_judge,
    generate_action_items,
)


class AnalysisState(TypedDict, total=False):
    transcript: str
    audio_metrics: dict
    visual_metrics: dict
    content_evaluation: dict
    judge_fact: dict
    judge_connect: dict
    judge_critical: dict
    strengths: list[str]
    weaknesses: list[str]
    action_items: list[str]


async def content_node(state: AnalysisState) -> dict:
    eval_ = await analyze_content(state.get("transcript") or "")
    return {"content_evaluation": eval_}


async def judge_fact_node(state: AnalysisState) -> dict:
    return {
        "judge_fact": await evaluate_judge(
            "judge-fact",
            state.get("transcript") or "",
            (state.get("audio_metrics") or {}) | (state.get("visual_metrics") or {}),
        )
    }


async def judge_connect_node(state: AnalysisState) -> dict:
    return {
        "judge_connect": await evaluate_judge(
            "judge-connect",
            state.get("transcript") or "",
            (state.get("audio_metrics") or {}) | (state.get("visual_metrics") or {}),
        )
    }


async def judge_critical_node(state: AnalysisState) -> dict:
    return {
        "judge_critical": await evaluate_judge(
            "judge-critical",
            state.get("transcript") or "",
            (state.get("audio_metrics") or {}) | (state.get("visual_metrics") or {}),
        )
    }


async def merge_node(state: AnalysisState) -> dict:
    items = await generate_action_items(state)
    return {
        "strengths": items.get("strengths", []),
        "weaknesses": items.get("weaknesses", []),
        "action_items": items.get("actions", []),
    }


def build_graph():
    from langgraph.graph import StateGraph, END

    g: StateGraph = StateGraph(AnalysisState)
    g.add_node("content", content_node)
    g.add_node("judge_fact", judge_fact_node)
    g.add_node("judge_connect", judge_connect_node)
    g.add_node("judge_critical", judge_critical_node)
    g.add_node("merge", merge_node)

    g.set_entry_point("content")
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
    transcript: str, audio_metrics: dict, visual_metrics: dict
) -> dict[str, Any]:
    graph = get_graph()
    result = await graph.ainvoke(
        {
            "transcript": transcript,
            "audio_metrics": audio_metrics,
            "visual_metrics": visual_metrics,
        }
    )
    return result
