import { useAnimatedNumber } from "../hooks/useAnimatedNumber";

interface Props {
  value: number;
  /** Turns the (possibly fractional) animated value into text. Defaults to a rounded integer. */
  format?: (n: number) => string;
  ms?: number;
  instant?: boolean;
  className?: string;
  testId?: string;
}

/** A number that counts to its new value. Screen readers get the final value only. */
export function AnimatedNumber({ value, format = (n) => String(Math.round(n)), ms, instant, className, testId }: Props) {
  const shown = useAnimatedNumber(value, ms, instant);
  return (
    <span className={className} data-testid={testId} aria-label={format(value)}>
      <span aria-hidden="true">{format(shown)}</span>
    </span>
  );
}
