import re


def clean_text(text: str) -> str:
    """
    Clean text for TF-IDF vectorizer and category classifier.
    
    Transforms text to lowercase, replaces any non-alphabetic character with space,
    and collapses multiple whitespace characters into a single space.
    """
    text = str(text).lower()
    text = re.sub(r'[^a-z\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text
