"""Optional Before/After 이미지 생성 — gpt-image-1.

발표자 사진 + metric delta를 받아 '신뢰감 있는 너' 컨셉 이미지를 생성한다.
시간 남을 때만 호출. 키 없으면 즉시 None 반환.
"""

from __future__ import annotations

from app.core.openai_client import openai_client


PROMPT_TEMPLATE = (
    "{subject}을 한국어 IR 발표 무대에 서 있는 모습으로 재구성합니다. "
    "정장 차림, 정면을 바라보며 침착한 표정. 청중을 향해 자신감 있는 자세. "
    "조명은 무대 스포트라이트, 배경은 어두운 회의장. 사진풍 사실적 스타일. "
    "감정: {emotion}."
)


async def generate_before_after(emotion: str = "차분함") -> str | None:
    client = openai_client()
    if client is None:
        return None
    try:
        res = await client.images.generate(
            model="gpt-image-1",
            prompt=PROMPT_TEMPLATE.format(subject="발표자", emotion=emotion),
            size="1024x1024",
        )
        # b64_json 또는 url
        data = res.data[0] if res.data else None
        if not data:
            return None
        if hasattr(data, "url") and data.url:
            return data.url
        if hasattr(data, "b64_json") and data.b64_json:
            return f"data:image/png;base64,{data.b64_json}"
        return None
    except Exception:
        return None
