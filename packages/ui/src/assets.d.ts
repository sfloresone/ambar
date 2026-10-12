/** Explicit asset URL imports have the same string contract in the Astro and Vite applications. */
declare module "*?url" {
  const url: string;

  export default url;
}
