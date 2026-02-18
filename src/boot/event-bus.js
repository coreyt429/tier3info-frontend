import mitt from 'mitt'

const emitter = mitt()

export default ({ app }) => {
  // Make available globally via app.config.globalProperties
  app.config.globalProperties.$eventBus = emitter
  // Optionally attach to window for non-setup script access (like your plugin)
  if (!window.eventBus) {
    window.eventBus = emitter
  }
}
