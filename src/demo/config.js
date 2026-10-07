// Demo mode is selected at build time. Normal builds always use the real API.
export const DEMO_MODE = import.meta.env.MODE === 'demo';
