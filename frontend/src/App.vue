<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import HomeView from "./components/HomeView.vue";
import PrivacyView from "./components/PrivacyView.vue";
import SiteFooter from "./components/SiteFooter.vue";
import SiteHeader from "./components/SiteHeader.vue";

const path = ref(window.location.pathname);

const titles = {
  home: "Loan Checker — porównanie chwilówek i pożyczek",
  privacy: "Polityka prywatności — Loan Checker",
} as const;

function syncPath() {
  path.value = window.location.pathname;
}

async function onClick(event: MouseEvent) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }
  const anchor = (event.target as Element | null)?.closest("a");
  if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
  const raw = anchor.getAttribute("href");
  if (!raw || raw.startsWith("mailto:") || raw.startsWith("http")) return;
  const url = new URL(anchor.href, window.location.origin);
  if (url.origin !== window.location.origin) return;
  if (url.pathname === window.location.pathname) return;
  event.preventDefault();
  history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
  path.value = url.pathname;
  await nextTick();
  if (url.hash) {
    document.querySelector(url.hash)?.scrollIntoView();
    return;
  }
  window.scrollTo(0, 0);
}

watch(
  path,
  (value) => {
    document.title = value === "/polityka-prywatnosci" ? titles.privacy : titles.home;
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener("popstate", syncPath);
  document.addEventListener("click", onClick);
});

onUnmounted(() => {
  window.removeEventListener("popstate", syncPath);
  document.removeEventListener("click", onClick);
});
</script>

<template>
  <div class="flex min-h-full flex-col antialiased">
    <SiteHeader />
    <PrivacyView v-if="path === '/polityka-prywatnosci'" />
    <HomeView v-else />
    <SiteFooter />
  </div>
</template>
