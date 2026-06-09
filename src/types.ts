export interface TipProfile {
  /** Display name of the person being thanked */
  name: string
  /** UPI VPA, e.g. name@okhdfcbank */
  upi: string
  /** Short bio / what people are thanking them for */
  bio?: string
  /** Emoji avatar (single emoji), used when no photo is set */
  emoji?: string
  /** Profile picture URL (Supabase Storage); takes precedence over emoji */
  avatar?: string
  /** Suggested tip amounts in INR */
  presets: number[]
}
