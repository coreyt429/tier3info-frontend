export default ({ app }) => {
  const $q = app.config.globalProperties.$q

  if (!$q) {
    console.error('Quasar is not available via app.config.globalProperties.')
    return
  }

  window.eventBus?.on('show-notification', ({ type, message }) => {
    console.log('Notification event received:', { type, message })

    let color
    switch (type) {
      case 'success':
        color = 'positive'
        break
      case 'positive':
        color = 'positive'
        break
      case 'error':
        color = 'negative'
        break
      case 'negative':
        color = 'negative'
        break
      case 'warning':
        color = 'warning'
        break
      case 'info':
      default:
        color = 'info'
        break
    }

    $q.notify({
      type: type || 'info',
      message: message || 'Notification triggered',
      position: 'top',
      color: color,
    })
  })
}
