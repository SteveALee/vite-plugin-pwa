import { join as _join } from 'path'
import type { ResolvedVitePWAOptions } from './types'

function join(...args: string[]) {
  return _join(...args).replace(/\\/g, '/')
}

const registerSWScript = (options: ResolvedVitePWAOptions) => `
  let registration
  let wb

  const updateServiceWorker = async() => {
    // Assuming the user accepted the update, set up a listener
    // that will reload the page as soon as the previously waiting
    // service worker has taken control.
    wb && wb.addEventListener('controlling', (event) => {
      if (event.isUpdate)
        window.location.reload()
    })
    if (registration && registration.waiting) {
      // Send a message to the waiting service worker,
      // instructing it to activate.
      // Note: for this to work, you have to add a message
      // listener in your service worker. See below.
      await messageSW(registration.waiting, { type: 'SKIP_WAITING' })
    }
  }

  if ('serviceWorker' in navigator) {
    wb = new Workbox('${join(options.base, options.filename)}', { scope: '${options.scope}' })
    
    wb.addEventListener('activated', (event) => {
      // this will only controls the offline request.
      // event.isUpdate will be true if another version of the service
      // worker was controlling the page when this version was registered.
      if (!event.isUpdate && typeof onOfflineReady === 'function')
        onOfflineReady()
    })
    const showSkipWaitingPrompt = () => {
      // \`event.wasWaitingBeforeRegister\` will be false if this is
      // the first time the updated service worker is waiting.
      // When \`event.wasWaitingBeforeRegister\` is true, a previously
      // updated service worker is still waiting.
      // You may want to customize the UI prompt accordingly.

      // Assumes your app has some sort of prompt UI element
      // that a user can either accept or reject.
      onNeedRefresh()
    }
    // Add an event listener to detect when the registered
    // service worker has installed but is waiting to activate.
    wb.addEventListener('waiting', showSkipWaitingPrompt)
    // @ts-ignore
    wb.addEventListener('externalwaiting', showSkipWaitingPrompt)
    // register the service worker
    wb.register({ immediate }).then(r => registration = r)
  }
`

export function generateRegisterSW(options: ResolvedVitePWAOptions) {
  return `
import { Workbox, messageSW } from 'workbox-window'

export const registerSW = (
  immediate,
  onNeedRefresh,
  onOfflineReady,
) => {
  ${registerSWScript(options)}

  return updateServiceWorker
}`
}

export function generateRegisterSWVue(options: ResolvedVitePWAOptions) {
  return `
import { ref } from 'vue'  
import { Workbox, messageSW } from 'workbox-window'

export const registerSW(
  immediate,
  onNeedRefresh,
  onOfflineReady,
) => {
  const offlineAppReady = ref(false)
  const appNeedsRefresh = ref(false)
  ${registerSWScript(options)}

  return {
    offlineAppReady,
    appNeedsRefresh,
    updateServiceWorker
  }
}`
}
