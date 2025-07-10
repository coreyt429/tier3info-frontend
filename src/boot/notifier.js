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
        color = 'green'
        break
      case 'positive':
        color = 'green'
        break
      case 'error':
        color = 'red'
        break
      case 'negative':
        color = 'red'
        break
      case 'warning':
        color = 'orange'
        break
      case 'info':
      default:
        color = 'blue'
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
