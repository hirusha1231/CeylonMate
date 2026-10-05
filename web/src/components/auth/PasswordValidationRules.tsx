import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

export interface PasswordRule {
  id: string;
  label: string;
  validator: (pwd: string) => boolean;
}

export const COMMON_PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: 'At least 8 characters long',
    validator: (pwd) => pwd.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'At least one uppercase letter (A-Z)',
    validator: (pwd) => /[A-Z]/.test(pwd),
  },
  {
    id: 'lowercase',
    label: 'At least one lowercase letter (a-z)',
    validator: (pwd) => /[a-z]/.test(pwd),
  },
  {
    id: 'number',
    label: 'At least one number (0-9)',
    validator: (pwd) => /[0-9]/.test(pwd),
  },
  {
    id: 'special',
    label: 'At least one special character (!@#$%^&*)',
    validator: (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`§±]/.test(pwd),
  },
];

export function evaluatePasswordStrength(password: string) {
  if (!password) {
    return {
      passedCount: 0,
      totalCount: COMMON_PASSWORD_RULES.length,
      percent: 0,
      label: 'Enter a password',
      color: 'bg-stone-700',
      textColor: 'text-stone-400',
      isSecure: false,
    };
  }

  const passedCount = COMMON_PASSWORD_RULES.filter((rule) => rule.validator(password)).length;
  const percent = Math.round((passedCount / COMMON_PASSWORD_RULES.length) * 100);

  let label = 'Very Weak';
  let color = 'from-rose-600 to-rose-500';
  let textColor = 'text-rose-400';

  if (passedCount === 2) {
    label = 'Weak';
    color = 'from-rose-500 to-amber-500';
    textColor = 'text-amber-400';
  } else if (passedCount === 3) {
    label = 'Fair';
    color = 'from-amber-500 to-yellow-400';
    textColor = 'text-yellow-300';
  } else if (passedCount === 4) {
    label = 'Good';
    color = 'from-yellow-400 to-emerald-400';
    textColor = 'text-emerald-300';
  } else if (passedCount === 5) {
    label = 'Strong & Secure';
    color = 'from-emerald-400 via-[#D4AF37] to-[#C5A880]';
    textColor = 'text-[#D4AF37]';
  }

  return {
    passedCount,
    totalCount: COMMON_PASSWORD_RULES.length,
    percent,
    label,
    color,
    textColor,
    isSecure: passedCount >= 4, // 4 or 5 is valid
  };
}

export function validatePasswordRules(password: string, confirmPassword?: string): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: 'Password is required.' };
  }
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters in length.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one numeric digit (0-9).' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`§±]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character (!@#$%^&*).' };
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match. Please re-enter your password.' };
  }
  return { isValid: true };
}

interface PasswordValidationRulesProps {
  password: string;
  confirmPassword?: string;
  showMatchStatus?: boolean;
}

export const PasswordValidationRules: React.FC<PasswordValidationRulesProps> = ({
  password,
  confirmPassword,
  showMatchStatus = true,
}) => {
  const strength = evaluatePasswordStrength(password);
  const isConfirmTyped = confirmPassword !== undefined && confirmPassword.length > 0;
  const isMatching = isConfirmTyped && password === confirmPassword;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-3 pt-2"
    >
      {/* Dynamic Animated Strength Meter */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-stone-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C5A880]" />
            Password Strength:
          </span>
          <motion.span
            key={strength.label}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`font-semibold flex items-center gap-1 ${strength.textColor}`}
          >
            {strength.passedCount === 5 && <Sparkles className="w-3 h-3 text-[#D4AF37] animate-spin" />}
            {strength.label}
          </motion.span>
        </div>

        {/* Multi-segment Animated Bar */}
        <div className="grid grid-cols-5 gap-1.5 h-1.5 w-full bg-slate-950/60 p-0.5 rounded-full border border-stone-800">
          {[1, 2, 3, 4, 5].map((index) => {
            const isFilled = strength.passedCount >= index;
            return (
              <div
                key={index}
                className="h-full rounded-full overflow-hidden bg-stone-800 relative"
              >
                <motion.div
                  initial={false}
                  animate={{
                    width: isFilled ? '100%' : '0%',
                    opacity: isFilled ? 1 : 0,
                  }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className={`h-full bg-gradient-to-r ${strength.color} rounded-full`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Rules Checklist */}
      <div className="bg-slate-900/90 border border-stone-800/90 rounded-xl p-3 space-y-1.5 shadow-inner">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#C5A880]/90 font-semibold mb-2">
          Security Requirements:
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {COMMON_PASSWORD_RULES.map((rule) => {
            const isPassed = rule.validator(password);
            return (
              <motion.div
                key={rule.id}
                initial={false}
                animate={{
                  color: isPassed ? '#6ee7b7' : '#78716c',
                }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 text-xs"
              >
                <motion.div
                  initial={false}
                  animate={{
                    scale: isPassed ? [0.8, 1.25, 1] : 1,
                    backgroundColor: isPassed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(41, 37, 36, 0.4)',
                    borderColor: isPassed ? 'rgba(52, 211, 153, 0.6)' : 'rgba(87, 83, 78, 0.4)',
                  }}
                  transition={{ duration: 0.25 }}
                  className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0"
                >
                  {isPassed ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                      <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[3]" />
                    </motion.div>
                  ) : (
                    <div className="w-1 h-1 rounded-full bg-stone-500" />
                  )}
                </motion.div>

                <span className={`text-[11px] font-sans transition-colors ${isPassed ? 'text-emerald-300 font-medium' : 'text-stone-400'}`}>
                  {rule.label}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Password Match Indicator */}
        {showMatchStatus && isConfirmTyped && (
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-2 pt-2 border-t border-stone-800/80 flex items-center gap-2 text-[11px] font-mono ${
              isMatching ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isMatching ? (
              <div className="flex items-center gap-1.5 font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Passwords match</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Passwords do not match</span>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
