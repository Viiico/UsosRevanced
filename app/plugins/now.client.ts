/**
 * „Dziś” dla statusów terminów (`now-iso`). Na telefonie aplikacja potrafi wisieć w tle
 * kilka dni, więc data odświeża się po powrocie do aplikacji i co minutę, gdy jest otwarta.
 */
export default defineNuxtPlugin(() => {
  const nowIso = useState('now-iso', () => new Date().toISOString())
  const refresh = () => {
    nowIso.value = new Date().toISOString()
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh()
  })
  setInterval(refresh, 60_000)
})
