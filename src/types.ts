export interface TipProfile {
  /** Display name of the person being thanked */
  name: string
  /** UPI VPA, e.g. name@okhdfcbank */
  upi: string
  /** Short bio / what people are thanking them for */
  bio?: string
  /** Emoji avatar (single emoji) */
  emoji?: string
  /** Suggested tip amounts in INR */
  presets: number[]
}
