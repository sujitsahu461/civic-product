import React, { useEffect, useState, useCallback } from 'react';
import authService from '../../services/auth.service';
import Icon from '../ui/Icon';
import s from './ArithmeticCaptcha.module.css';

interface ArithmeticCaptchaProps {
  onVerify: (captchaKey: string, code: string, isCorrect: boolean) => void;
  required?: boolean;
}

export const ArithmeticCaptcha: React.FC<ArithmeticCaptchaProps> = ({
  onVerify,
  required = true,
}) => {
  const [question, setQuestion] = useState('7 + 5 = ?');
  const [expectedAnswer, setExpectedAnswer] = useState<number>(12);
  const [captchaKey, setCaptchaKey] = useState<string>('local');
  const [captchaSvg, setCaptchaSvg] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);

  const onVerifyRef = React.useRef(onVerify);
  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  // SVG renderer for arithmetic challenge
  const renderMathSvg = (expr: string) => {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="48" viewBox="0 0 200 48" style="border-radius: 8px; user-select: none;">
      <defs>
        <linearGradient id="mathGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
      </defs>
      <rect width="200" height="48" rx="8" fill="url(#mathGrad)" stroke="#334155" stroke-width="1"/>
      <line x1="12" y1="14" x2="188" y2="34" stroke="#475569" stroke-width="1.2" stroke-dasharray="4,4" opacity="0.4"/>
      <circle cx="25" cy="12" r="1.5" fill="#38bdf8" opacity="0.6"/>
      <circle cx="175" cy="36" r="1.5" fill="#34d399" opacity="0.6"/>
      <text x="100" y="27" fill="#38bdf8" font-family="'JetBrains Mono', 'Fira Code', monospace, Courier" font-weight="900" font-size="21" text-anchor="middle" dominant-baseline="central" letter-spacing="2" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.7));">${expr}</text>
    </svg>`;
  };

  const generateLocalProblem = useCallback(() => {
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a = 0;
    let b = 0;
    let ans = 0;

    if (op === '+') {
      a = Math.floor(Math.random() * 25) + 4; // 4 to 28
      b = Math.floor(Math.random() * 20) + 2; // 2 to 21
      ans = a + b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 30) + 15; // 15 to 44
      b = Math.floor(Math.random() * (a - 3)) + 2;
      ans = a - b;
    } else {
      a = Math.floor(Math.random() * 8) + 2; // 2 to 9
      b = Math.floor(Math.random() * 7) + 2; // 2 to 8
      ans = a * b;
    }

    const expr = `${a} ${op} ${b} = ?`;
    setQuestion(expr);
    setExpectedAnswer(ans);
    setCaptchaKey('local');
    setCaptchaSvg(renderMathSvg(expr));
    setUserInput('');
    setHasInteracted(false);
    onVerifyRef.current('local', '', false);
  }, []);

  const loadCaptcha = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authService.getCaptcha();
      if (res && res.captcha_key && res.captcha_svg) {
        setCaptchaKey(res.captcha_key);
        setCaptchaSvg(res.captcha_svg);
        const q = (res as any).question;
        if (q) {
          setQuestion(q);
          const match = q.match(/(\d+)\s*([\+\-×*])\s*(\d+)/);
          if (match) {
            const n1 = parseInt(match[1], 10);
            const op = match[2];
            const n2 = parseInt(match[3], 10);
            const ans = op === '+' ? n1 + n2 : op === '-' ? n1 - n2 : n1 * n2;
            setExpectedAnswer(ans);
          }
        }
        setUserInput('');
        setHasInteracted(false);
        onVerifyRef.current(res.captcha_key, '', false);
      } else {
        generateLocalProblem();
      }
    } catch {
      generateLocalProblem();
    } finally {
      setLoading(false);
    }
  }, [generateLocalProblem]);

  useEffect(() => {
    loadCaptcha();
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9\-]/g, '');
    setUserInput(val);
    setHasInteracted(true);

    const parsed = parseInt(val, 10);
    const isCorrect = !isNaN(parsed) && parsed === expectedAnswer;
    onVerify(captchaKey, val, isCorrect);
  };

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const readable = question
        .replace('+', 'plus')
        .replace('-', 'minus')
        .replace('×', 'multiplied by')
        .replace('= ?', '');
      const utterance = new SpeechSynthesisUtterance(`Security math verification. What is ${readable}?`);
      utterance.rate = 0.88;
      window.speechSynthesis.speak(utterance);
    }
  };

  const isAnswerCorrect = hasInteracted && parseInt(userInput, 10) === expectedAnswer;
  const isAnswerWrong = hasInteracted && userInput.length > 0 && parseInt(userInput, 10) !== expectedAnswer;

  return (
    <div className={s.captchaContainer}>
      <div className={s.headerRow}>
        <div className={s.label}>
          <Icon name="calculate" size={16} className={s.labelIcon} />
          <span>Arithmetic Security Verification</span>
        </div>
        <span className={s.badge}>Human Check</span>
      </div>

      <p className={s.instruction}>
        Solve the math equation below to verify you are a genuine human user:
      </p>

      <div className={s.challengeRow}>
        <div
          className={s.svgWrapper}
          dangerouslySetInnerHTML={{ __html: captchaSvg }}
          title={`Calculate: ${question}`}
        />

        <div className={s.actionButtons}>
          <button
            type="button"
            className={s.iconButton}
            onClick={loadCaptcha}
            disabled={loading}
            title="Generate new arithmetic equation"
            aria-label="Refresh Math Captcha"
          >
            <Icon name="refresh" size={18} className={loading ? s.spin : ''} />
          </button>

          <button
            type="button"
            className={s.iconButton}
            onClick={handleSpeak}
            title="Read out math problem aloud"
            aria-label="Listen to Math Problem"
          >
            <Icon name="volume_up" size={18} />
          </button>
        </div>
      </div>

      <div className={s.inputRow}>
        <div className={s.inputWrapper}>
          <span className={s.inputPrefix}>Answer:</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9\-]*"
            className={`${s.answerInput} ${isAnswerCorrect ? s.inputSuccess : ''} ${isAnswerWrong ? s.inputError : ''}`}
            placeholder="Type result (e.g. 19)"
            value={userInput}
            onChange={handleInputChange}
            required={required}
            maxLength={6}
          />
        </div>

        {isAnswerCorrect && (
          <div className={s.statusSuccess}>
            <Icon name="check_circle" size={16} />
            <span>Verified</span>
          </div>
        )}

        {isAnswerWrong && (
          <div className={s.statusError}>
            <Icon name="close" size={14} />
            <span>Incorrect</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArithmeticCaptcha;
