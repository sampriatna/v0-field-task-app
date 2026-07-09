import type { Tone } from "@/lib/labels"

export function Badge({ label, tone }: { label: string; tone: Tone }) {
  return <span className={`badge ${tone}`}>{label}</span>
}
