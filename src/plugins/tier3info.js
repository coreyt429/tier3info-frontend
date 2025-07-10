import axios from 'axios'
// import jsyaml from 'js-yaml'
var sessionId = null
var tier3info_preferences = null

function get_session_id() {
  const cookies = document.cookie.split('; ')
  console.log(cookies)
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].split('=')
    console.log(cookie)
    if (cookie[0] == 'sessionId') {
      sessionId = cookie[1]
    }
  }
  console.log(sessionId)
  if (import.meta.env.VITE_TIER3INFO_API_KEY) {
    sessionId = import.meta.env.VITE_TIER3INFO_API_KEY
  }
  return sessionId
}
export async function tier3info_restful_request(request) {
  // set method if missing
  if (!request.method) {
    request.method = 'GET'
  }
  // add api if missing
  if (!request.path.includes('api')) {
    request.path = '/api/' + request.path
  }
  // strip double slashes
  request.path = request.path.replaceAll('//', '/')
  console.log(request.path, request.body)

  const fetchOptions = {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Client-Identifier': 'tier3info_javascript',
      Authorization: 'Bearer ' + get_session_id(),
    },
    method: request.method,
  }
  if (request.data && !request.body) {
    request.body = request.data
  }
  console.log(request.body)
  // Include body for POST or PUT requests
  if (request.method.toUpperCase() === 'POST' || request.method.toUpperCase() === 'PUT') {
    if (typeof request.body === 'object') {
      fetchOptions.body = JSON.stringify(request.body)
    } else {
      fetchOptions.body = request.body
    }
  }
  if (import.meta.env.VITE_TIER3INFO_API_BASE) {
    request.path = import.meta.env.VITE_TIER3INFO_API_BASE + request.path
  }

  console.log(request.path)
  console.log(fetchOptions)
  return axios({
    url: request.path,
    method: request.method,
    headers: fetchOptions.headers,
    withCredentials: true,
    data:
      request.method.toUpperCase() === 'POST' || request.method.toUpperCase() === 'PUT'
        ? request.body
        : undefined,
  })
    .then((response) => {
      if (request.callback) {
        console.log('Response data to callback:', response.data)
        request.callback(response.data)
      } else {
        console.log('Response data to return:', response.data)
        return response
      }
    })
    .catch((error) => {
      console.error('Axios error:', error)
      console.error('Response:', error.response)
      console.error('Request:', error.request)
      if (error.response) {
        const response = error.response
        if (response.status === 403) {
          alert('403 Forbidden: You do not have permission to access this resource.')
        } else if (response.status === 500) {
          alert(
            `Error: ${response.status} ${response.statusText} \n This normally means we broke something, and we are working on it.  If it persists, please contact Voice Engineering On-Call.`,
          )
        } else if (response.status === 401) {
          console.log('ReAuthenticating')
        } else {
          const data = response.data
          if (data && data.message) {
            alert(`Error: ${response.status} ${data.message}`)
          } else {
            alert(`Error: ${response.status} ${response.statusText}`)
          }
        }
      } else {
        console.log('An error occurred:')
        console.log(error)
      }
    })
}

// Function to fetch preferences from the server
function fetchPreferencesFromServer() {
  tier3info_restful_request({
    path: '/preferences/',
    callback: tier3info_preferences_set,
  })
}

// Function to set preferences and update local storage
function tier3info_preferences_set(data) {
  console.log('tier3info_preferences_set', data)
  tier3info_preferences = data
  console.log('tier3info_preferences:', tier3info_preferences) // Verify the update
  // Store preferences and timestamp in local storage
  localStorage.setItem('tier3info_preferences', JSON.stringify(data))
  localStorage.setItem('tier3info_preferences_timestamp', Date.now())
}

// Function to load preferences
function loadPreferences() {
  const storedPreferences = localStorage.getItem('tier3info_preferences')
  const storedTimestamp = localStorage.getItem('tier3info_preferences_timestamp')

  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
  console.log(storedPreferences, storedTimestamp)
  if (storedPreferences != 'undefined' && storedTimestamp && now - storedTimestamp < oneDay) {
    // Use stored preferences if they are less than 24 hours old
    tier3info_preferences = JSON.parse(storedPreferences)
    console.log('Loaded preferences from local storage:', tier3info_preferences)
  } else {
    // Fetch preferences from the server if not found or older than 24 hours
    fetchPreferencesFromServer()
  }
}

// Load preferences when the script runs
loadPreferences()

// Import Ace Editor
// import ace from 'ace-builds/src-noconflict/ace'
// import 'ace-builds/src-noconflict/theme-github_dark'
// import 'ace-builds/src-noconflict/mode-yaml'

// // Function to open the modal and load preferences into Ace Editor
// function edit_tier3info_preferences() {
//   // Convert preferences to sorted YAML
//   const sortedPreferences = JSON.stringify(
//     tier3info_preferences,
//     Object.keys(tier3info_preferences).sort(),
//   )
//   const yamlPreferences = jsyaml.dump(JSON.parse(sortedPreferences))

//   // Initialize Ace Editor
//   const editor = ace.edit('editor')
//   editor.setTheme('ace/theme/github_dark')
//   editor.getSession().setMode('ace/mode/yaml')
//   editor.setValue(yamlPreferences, -1)
//   editor.commands.addCommand({
//     name: 'save',
//     bindKey: { win: 'Ctrl-S', mac: 'Command-S' },
//     exec: function (editor) {
//       save_tier3info_preferences(editor.getValue())
//       modal.style.display = 'none'
//     },
//   })

//   // Display the modal
//   const modal = document.getElementById('preferencesModal')
//   modal.style.display = 'block'

//   // Close the modal when the user clicks the close button
//   const span = document.getElementsByClassName('close')[0]
//   span.onclick = function () {
//     modal.style.display = 'none'
//   }

//   // Close the modal when the user clicks outside of it
//   window.onclick = function (event) {
//     if (event.target == modal) {
//       modal.style.display = 'none'
//     }
//   }

//   // Save preferences when the save button is clicked
//   document.getElementById('savePreferencesButton').onclick = function () {
//     save_tier3info_preferences(editor.getValue())
//     modal.style.display = 'none'
//   }
// }

// function tier3info_preferences_store() {
//   // Update local storage
//   localStorage.setItem('tier3info_preferences', JSON.stringify(tier3info_preferences))
//   localStorage.setItem('tier3info_preferences_timestamp', Date.now())

//   // Update server
//   tier3info_restful_request({
//     method: 'PUT',
//     path: '/preferences',
//     body: JSON.stringify(tier3info_preferences),
//     callback: function (response) {
//       console.log('Preferences updated on server:', response)
//     },
//   })
// }

// // Function to save preferences
// function save_tier3info_preferences(yamlString) {
//   try {
//     // Parse YAML string to JSON
//     const updatedPreferences = jsyaml.load(yamlString)

//     // Update global preferences
//     tier3info_preferences = updatedPreferences
//     tier3info_preferences_store()
//   } catch (e) {
//     console.error('Error parsing YAML:', e)
//   }
// }
