// Build-time switches read through import.meta.env.
interface ImportMetaEnv {
  /** "1" lets a non-dev build (the private test page) accept a #YYYY-MM-DD date override. */
  readonly VITE_DATE_OVERRIDE?: string;
}
