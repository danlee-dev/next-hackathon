from app.services.filler_detector import detect_empty_phrases, detect_fillers


def test_detect_primary_fillers_with_boundary():
    # "음" 다음에 "그"가 따라오면 phrase "음 그"가 매칭되는 게 정상.
    text = "음 그러니까 저희가 어 만든 회사는"
    found = detect_fillers(text)
    words = {f["word"] for f in found}
    # 어떤 형태로든 음과 그러니까/그가 검출되면 OK
    assert ("음" in words) or ("음 그" in words)
    assert "그러니까" in words
    assert "어" in words


def test_detect_does_not_match_inside_word():
    text = "음악을 듣는 어머니"
    found = detect_fillers(text)
    words = {f["word"] for f in found}
    # 1-char fillers should not match inside Hangul words
    assert "음" not in words
    assert "어" not in words


def test_phrase_takes_precedence_over_single():
    text = "그게 이제 발표를 시작합니다"
    found = detect_fillers(text)
    words = [f["word"] for f in found]
    assert words[0] == "그게 이제"


def test_empty_phrase_detection():
    text = "혁신적인 기술로 절대적인 성과를 냈습니다"
    found = detect_empty_phrases(text)
    phrases = [f["phrase"] for f in found]
    assert "혁신적인" in phrases
    assert "절대적" in phrases
