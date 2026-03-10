/// <reference types="vite/client" />
/// <reference types="vite-plugin-monkey/client" />
//// <reference types="vite-plugin-monkey/global" />
/// <reference types="vite-plugin-monkey/style" />

declare module '*.svelte' {
  import type { Component } from 'svelte';
  const component: Component;
  export default component;
}