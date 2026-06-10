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

/** A business's testimonial-collection page. */
export interface Space {
  id: string
  slug: string
  /** Business / product name */
  name: string
  /** Prompt shown to customers, e.g. "Share your experience with Acme" */
  headline?: string
  /** Supporting text under the headline */
  intro?: string
  /** Brand accent colour as #RRGGBB */
  color?: string
  /** Logo URL (Supabase Storage) */
  logo?: string
}

/** A single testimonial submitted to a space. */
export interface Testimonial {
  id: string
  spaceId: string
  authorName: string
  /** Role / company, e.g. "Founder, Acme" */
  authorRole?: string
  /** Author photo URL (Supabase Storage) */
  authorAvatar?: string
  /** Video testimonial URL (Supabase Storage) */
  videoUrl?: string
  rating: number
  message: string
  approved: boolean
  createdAt: string
}
