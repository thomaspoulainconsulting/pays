import { useState, useRef, useEffect, useCallback } from "react";

interface CountryInputProps {
  placeholder: string;
  onSubmit: (value: string) => boolean; // returns true if correct
  autoFocus?: boolean;
  focusTrigger?: number;
}

export default function CountryInput({
  placeholder,
  onSubmit,
  autoFocus = false,
  focusTrigger = 0,
}: CountryInputProps) {
  const [value, setValue] = useState("");
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (focusTrigger > 0) inputRef.current?.focus();
  }, [focusTrigger]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && value.trim()) {
        const isCorrect = onSubmit(value.trim());
        if (isCorrect) {
          setValue("");
        } else {
          setShaking(true);
          setTimeout(() => setShaking(false), 400);
        }
      }
    },
    [value, onSubmit]
  );

  return (
    <div className="country-input-wrapper">
      <input
        ref={inputRef}
        type="text"
        className={`country-input${shaking ? " shake" : ""}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
