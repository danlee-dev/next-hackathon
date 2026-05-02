"""Tavily 기반 시장·회사 fact-check.

김팩트 페르소나가 *발표 전·중·후* 실제 VC 가 하는 사전 리서치를 흉내내기 위해
사용. 발표 전사·덱에서 등장하는 *시장 규모/경쟁사/통계* 같은 주장을 추출 →
Tavily 웹 검색 → 검증된 근거 / 모순되는 데이터 반환.
"""

from __future__ import annotations

import os
from typing import Any

import httpx


async def tavily_search(query: str, max_results: int = 5) -> list[dict[str, Any]]:
    api_key = os.getenv("TAVILY_API_KEY", "")
    if not api_key or not query.strip():
        return []
    url = "https://api.tavily.com/search"
    payload = {
        "api_key": api_key,
        "query": query,
        "search_depth": "basic",
        "include_answer": False,
        "max_results": max_results,
        "include_raw_content": False,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(url, json=payload)
            if r.status_code != 200:
                return []
            data = r.json()
            return data.get("results", [])[:max_results]
    except Exception:
        return []


async def fact_check_pitch(transcript: str, deck_text: str = "") -> dict[str, Any]:
    """발표 전사 + 덱에서 *검증할 가치 있는 주장*을 LLM 이 뽑아내고
    각각을 Tavily 로 검색해 결과 묶음 반환.

    반환:
        {
          "claims": [
              {"claim": "TAM 50조 원", "results": [{"title", "url", "content"}]},
              ...
          ],
          "summary": "한 줄 요약"
        }
    """
    from app.core.openai_client import openai_client

    client = openai_client()
    if client is None or not transcript.strip():
        return {"claims": [], "summary": "검증 가능한 주장 없음"}

    # 1) LLM 으로 검증 가능한 주장 3-5개 추출
    extract_prompt = (
        "다음 IR 발표 전사 + 덱 텍스트에서 *웹 검색으로 검증 가능한* 주장 "
        "최대 4개를 뽑으세요. 시장 규모·통계·경쟁사 비교·산업 트렌드만. "
        "주관적 평가는 제외. JSON 으로만:\n"
        '{"queries": ["검색 쿼리 1", "검색 쿼리 2", ...]}'
    )
    payload = (
        f"전사:\n{transcript[:3500]}\n\n덱:\n{deck_text[:1500]}"
    )
    try:
        res = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            temperature=0.2,
            messages=[
                {"role": "system", "content": extract_prompt},
                {"role": "user", "content": payload},
            ],
        )
        import json

        data = json.loads(res.choices[0].message.content or "{}")
        queries = data.get("queries", [])[:4]
    except Exception:
        return {"claims": [], "summary": "주장 추출 실패"}

    if not queries:
        return {"claims": [], "summary": "검증 가능한 주장 없음"}

    # 2) 각 쿼리 Tavily 병렬 검색
    import asyncio

    results = await asyncio.gather(
        *[tavily_search(q, max_results=3) for q in queries]
    )
    claims = []
    for q, r in zip(queries, results):
        claims.append(
            {
                "claim": q,
                "results": [
                    {
                        "title": x.get("title", "")[:120],
                        "url": x.get("url", ""),
                        "content": (x.get("content", "") or "")[:300],
                    }
                    for x in r
                ],
            }
        )
    return {
        "claims": claims,
        "summary": f"{len(claims)} 개 주장에 대해 {sum(len(c['results']) for c in claims)} 개 출처 확인",
    }


def format_research_for_prompt(research: dict[str, Any]) -> str:
    """LLM prompt 에 박을 형식. 김팩트가 이걸 보고 평가에 활용."""
    claims = research.get("claims", [])
    if not claims:
        return ""
    lines = ["\n\n=== 외부 시장 검증 (Tavily) ===\n"]
    lines.append(
        "발표에서 등장한 주장을 웹 검색한 결과입니다. *김팩트는 이 결과를*\n"
        "*반드시 근거로 활용*해 주장의 정확성을 평가합니다 (출처 url 인용 가능).\n\n"
    )
    for c in claims:
        lines.append(f"## 주장 / 검색 쿼리: {c['claim']}")
        if not c["results"]:
            lines.append("(검색 결과 없음 — 발표자 주장의 출처 모호함)")
        for r in c["results"][:3]:
            lines.append(f"- [{r['title']}]({r['url']})")
            if r["content"]:
                lines.append(f"  {r['content'][:200]}")
        lines.append("")
    lines.append("=== 외부 검증 끝 ===\n")
    return "\n".join(lines)
