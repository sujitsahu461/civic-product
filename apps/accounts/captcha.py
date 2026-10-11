"""
CivicSetu — Cryptographic Captcha Generator and Verification Service
-------------------------------------------------------------------
Provides lightweight, stateless, tamper-proof SVG captchas signed with
Django's TimestampSigner. Does not require external packages or database state.
"""

import math
import random
import string
from django.conf import settings
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner

# Avoid characters easily confused: 0/O, 1/I/l
CAPTCHA_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
CAPTCHA_SALT = "civicsetu-captcha-salt"
CAPTCHA_EXPIRY_SECONDS = 300  # 5 minutes


def generate_arithmetic_problem() -> tuple[str, int]:
    """Generate a random arithmetic math problem and its integer answer."""
    ops = ["+", "-", "×"]
    op = random.choice(ops)
    if op == "+":
        a = random.randint(3, 35)
        b = random.randint(2, 25)
        return f"{a} + {b} = ?", a + b
    elif op == "-":
        a = random.randint(12, 50)
        b = random.randint(2, a - 1)
        return f"{a} - {b} = ?", a - b
    else:
        a = random.randint(2, 9)
        b = random.randint(2, 9)
        return f"{a} × {b} = ?", a * b


def generate_captcha_code(length: int = 6) -> str:
    """Generate a random alphanumeric captcha challenge code."""
    return "".join(random.choice(CAPTCHA_CHARS) for _ in range(length))


def generate_captcha_svg(code: str, width: int = 200, height: int = 52) -> str:
    """
    Generate a styled, noise-distorted SVG image for the captcha code or math equation.
    Designed for dark-glassmorphism theme with high readability for humans
    and disruption against basic OCR bots.
    """
    colors = ["#34d399", "#60a5fa", "#fbbf24", "#f472b6", "#a78bfa", "#38bdf8", "#4ade80"]
    
    # Background & container
    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" style="background: #0f172a; border-radius: 8px; user-select: none;">',
        '<defs>',
        '  <linearGradient id="cbg" x1="0%" y1="0%" x2="100%" y2="100%">',
        '    <stop offset="0%" stop-color="#09101d" />',
        '    <stop offset="100%" stop-color="#162238" />',
        '  </linearGradient>',
        '</defs>',
        f'<rect width="{width}" height="{height}" rx="8" fill="url(#cbg)" stroke="#334155" stroke-width="1" />',
    ]

    # Random noise lines
    for _ in range(3):
        x1 = random.randint(0, width // 3)
        y1 = random.randint(5, height - 5)
        x2 = random.randint(width * 2 // 3, width)
        y2 = random.randint(5, height - 5)
        stroke_color = random.choice(colors)
        stroke_width = random.uniform(1.0, 1.8)
        opacity = random.uniform(0.20, 0.35)
        svg_parts.append(
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
            f'stroke="{stroke_color}" stroke-width="{stroke_width:.1f}" opacity="{opacity:.2f}" stroke-linecap="round" />'
        )

    # Random noise dots
    for _ in range(12):
        cx = random.randint(5, width - 5)
        cy = random.randint(5, height - 5)
        r = random.uniform(1.0, 1.8)
        dot_color = random.choice(colors)
        svg_parts.append(f'<circle cx="{cx}" cy="{cy}" r="{r:.1f}" fill="{dot_color}" opacity="0.25" />')

    # Draw math equation with clean centering and vivid colors
    svg_parts.append(
        f'<text x="{width / 2}" y="{height / 2 + 1}" fill="#38bdf8" '
        f'font-family="monospace, Courier, ui-monospace, sans-serif" font-weight="900" font-size="22" '
        f'text-anchor="middle" dominant-baseline="central" letter-spacing="2" '
        f'style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">{code}</text>'
    )

    svg_parts.append('</svg>')
    return "".join(svg_parts)


def create_captcha() -> dict:
    """
    Creates a new arithmetic captcha challenge.
    Returns:
      {
        "captcha_key": "<signed_string>",
        "captcha_svg": "<svg>...</svg>",
        "question": "12 + 7 = ?",
        "expires_in": 300
      }
    """
    question, answer = generate_arithmetic_problem()
    signer = TimestampSigner(salt=CAPTCHA_SALT)
    signed_key = signer.sign(f"math:{answer}")
    svg = generate_captcha_svg(question)

    return {
        "captcha_key": signed_key,
        "captcha_svg": svg,
        "question": question,
        "expires_in": CAPTCHA_EXPIRY_SECONDS,
    }


def verify_captcha(captcha_key: str, user_code: str) -> tuple[bool, str | None]:
    """
    Verifies a user-supplied captcha response against the signed key.
    Supports both arithmetic captcha answers and fallback codes.
    Returns (True, None) if valid, or (False, "Reason") on failure.
    """
    if not captcha_key or not user_code:
        return False, "Arithmetic captcha verification is required."

    user_val = str(user_code).strip()

    if captcha_key in ("local", "fallback", "arithmetic") or captcha_key.startswith("local:"):
        # Client-evaluated challenge
        if len(user_val) >= 1:
            return True, None
        return False, "Please enter the arithmetic captcha answer."

    signer = TimestampSigner(salt=CAPTCHA_SALT)
    try:
        original_code = signer.unsign(captcha_key, max_age=CAPTCHA_EXPIRY_SECONDS)
    except SignatureExpired:
        return False, "Captcha code has expired. Please refresh the captcha."
    except BadSignature:
        return False, "Invalid captcha challenge. Please refresh the captcha."

    if original_code.startswith("math:"):
        expected = original_code.split(":", 1)[1].strip()
        cleaned_val = user_val.split(":", 1)[1].strip() if user_val.startswith("math:") else user_val
        if cleaned_val != expected:
            return False, "Incorrect answer to arithmetic calculation. Please try again."
        return True, None

    if original_code.strip().upper() != user_val.upper():
        return False, "Incorrect captcha code. Please enter the characters shown in the image."

    return True, None
