// /*
// Interface related javascript functions.

// Note, these should mostly be used to create UI elements in a standard
// way.
// */

// // FIXME: move to util?
// function toSnakeCase(str) {
//   return str
//     .replace(/\s+/g, '_') // Replace spaces with underscores
//     .replace(/\./g, '_')
//     .replace(/[A-Z]/g, (letter) => '_' + letter.toLowerCase()) // Add underscores before uppercase letters and convert to lowercase
//     .replace(/__+/g, '_') // Replace multiple underscores with a single underscore
//     .replace(/^_+|_+$/g, '') // Remove leading and trailing underscores
// }

// function createDiv(dataObject, container) {
//   // Create the tab content container
//   console.log(dataObject)
//   var new_div = document.createElement('div')
//   new_div.className = dataObject.class || ''
//   new_div.id = dataObject.id || generateUniqueId()
//   console.log('new div:' + new_div.id)
//   container.appendChild(new_div)
//   if (dataObject.contents) {
//     build_data_display(dataObject.contents, new_div)
//   }
// }

// // FIXME: mace container optional, if not provided, create a new container and return it
// function createTabsWithData(dataObject, container) {
//   // Create the tab navigation
//   var tabNav = document.createElement('ul')
//   tabNav.className = 'nav nav-tabs'
//   container.appendChild(tabNav)

//   // Create the tab content container
//   var tabContent = document.createElement('div')
//   tabContent.className = 'tab-content'
//   container.appendChild(tabContent)

//   // Iterate over the keys in the dataObject
//   Object.keys(dataObject.contents).forEach(function (key, index) {
//     // Create the tab navigation item
//     var navItem = document.createElement('li')
//     navItem.className = 'nav-item'
//     var navLink = document.createElement('a')
//     navLink.className = 'nav-link'
//     navLink.setAttribute('data-toggle', 'tab')
//     navLink.href = '#' + toSnakeCase(key)
//     navLink.textContent = key
//     if (index === 0) {
//       navLink.classList.add('active')
//     }
//     navItem.appendChild(navLink)
//     tabNav.appendChild(navItem)

//     // Create the tab content item
//     var tabPane = document.createElement('div')
//     tabPane.className = 'tab-pane fade'
//     tabPane.id = toSnakeCase(key)
//     if (index === 0) {
//       tabPane.classList.add('show', 'active')
//     }
//     tabContent.appendChild(tabPane)

//     // Call the build_data_display function
//     build_data_display(dataObject.contents[key], tabPane)
//   })
// }

// const sample_data = [
//   {
//     type: 'divider',
//   },
//   {
//     type: 'legend',
//     contents: 'Test Legend',
//   },
//   {
//     type: 'html',
//     contents: 'Test html<br>more <b>html</b><br>',
//   },
//   {
//     type: 'tabs',
//     contents: {
//       'Tab 3': [
//         {
//           type: 'datatable',
//           contents: {
//             labels: ['Field1', 'Field2', 'Field3'],
//             data: [
//               [1, 2, 3],
//               [4, 5, 6],
//               [7, 8, 9],
//             ],
//           },
//         },
//       ],
//       'Tab 4': [
//         {
//           type: 'html',
//           contents: 'Tab 2 Content',
//         },
//       ],
//     },
//   },
// ]

// function build_data_display(data, divName) {
//   var parent
//   // Check if divName is a string or an element object
//   if (typeof divName === 'string') {
//     parent = document.getElementById(divName)
//     // clear since this is likely the initial call
//     parent.innerHTML = ''
//   } else if (divName instanceof HTMLElement) {
//     parent = divName
//   } else {
//     console.error('Invalid divName parameter')
//     return
//   }
//   var content = document.createElement('div')
//   parent.appendChild(content)
//   data.forEach((item) => {
//     if (item.type === 'html') {
//       span = document.createElement('span')
//       span.innerHTML = item.contents
//       content.appendChild(span)
//     } else if (item.type === 'divider') {
//       content.appendChild(divider(item.conents || null, item.id || null))
//     } else if (item.type === 'legend') {
//       content.appendChild(legend(item.contents, item.id || null))
//     } else if (item.type === 'tabs') {
//       createTabsWithData(item, content)
//     } else if (item.type === 'datatable') {
//       createDataTable(item, content)
//     } else if (item.type === 'chart') {
//       createChart(item, content)
//     } else if (item.type === 'div') {
//       createDiv(item, content)
//     }
//   })
// }

// // FIXME: move to util?
// function generateUniqueId(prefix) {
//   return prefix + '_' + Math.random().toString(36).substr(2, 9)
// }

// // This is the model for how these functions should work
// function createDataTable(dataObject, parent = null) {
//   // Create the table element
//   var table = document.createElement('table')
//   var table_id = dataObject.id || generateUniqueId('dt')
//   table.id = table_id
//   table.className = 'display dataTableClass'

//   // Create the table header
//   var thead = document.createElement('thead')
//   var headerRow = document.createElement('tr')
//   dataObject.contents.labels.forEach(function (label) {
//     var th = document.createElement('th')
//     th.textContent = label
//     headerRow.appendChild(th)
//   })
//   thead.appendChild(headerRow)
//   table.appendChild(thead)

//   // Create the table body
//   var tbody = document.createElement('tbody')
//   dataObject.contents.data.forEach(function (rowData) {
//     var row = document.createElement('tr')
//     rowData.forEach(function (cellData) {
//       var td = document.createElement('td')
//       // Check if cellData is a timestamp and reformat it
//       if (isTimestamp(cellData)) {
//         console.log('createDataTable: tier3info_preferences:', tier3info_preferences)
//         const timeFormat = tier3info_preferences.TimeFormat || '%B %d %Y, %H:%M:%S %Z'
//         const timeZone = tier3info_preferences.timeZone || 'America/New_York'
//         td.textContent = formatTimestamp(cellData, timeFormat, timeZone)
//       } else {
//         td.innerHTML = cellData
//       }
//       row.appendChild(td)
//     })
//     tbody.appendChild(row)
//   })
//   table.appendChild(tbody)

//   // Append the table to the specified div
//   if (parent) {
//     parent.appendChild(table)
//   }

//   // Initialize DataTable
//   $(document).ready(function () {
//     var savedEntries = localStorage.getItem('entriesPerPage') || 10
//     // "{scrollY: 400, dom: 'Bfrtip', language:{'search': 'Filter:'}, buttons: ['copy', {extend: 'csvHtml5',title: 'Data export'}, 'excel', 'pdf'],'columnDefs': [{'targets': [9], 'visible': false, 'searchable': true}]}");

//     $(`#${table_id}`).DataTable(
//       // {
//       //     "pageLength": parseInt(savedEntries)
//       // }
//       {
//         dom: 'Bfrtip',
//         scrollY: 400,
//         paging: false,
//         scrollCollapse: true,
//         buttons: ['copy', { extend: 'csvHtml5', title: 'Data export' }, 'excel', 'pdf'],
//       },
//     )

//     if (dataObject.contents.onclick) {
//       console.log('setup datatable onclick')
//       $(`#${table_id} tbody`).on('click', 'tr', function () {
//         dataObject.contents.onclick(this)
//       })
//     }

//     // Save the user's selection in localStorage
//     // $(`#${table_id}`).on('length.dt', function(e, settings, len) {
//     //     localStorage.setItem('entriesPerPage', len);
//     // });
//   })
//   console.log(`${table_id} created`)
//   return table
// }

// // FIXME: move to util? or time?
// // Function to check if a string is an ISO timestamp or in the format YYYY/MM/DD HH:MM:SS
// function isTimestamp(data) {
//   // Regular expression to match ISO 8601 format and YYYY/MM/DD HH:MM:SS format
//   const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/
//   const customFormatRegex = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/
//   return isoRegex.test(data) || customFormatRegex.test(data)
// }

// // FIXME: move to util? or time, or depreceated
// // Function to format the timestamp
// function formatTimestamp_old(timestamp, format) {
//   console.log(`formatTimestamp(${timestamp}, ${format})`)
//   const momentFormat = format
//     .replace('%Y', 'YYYY')
//     .replace('%m', 'MM')
//     .replace('%d', 'DD')
//     .replace('%H', 'HH')
//     .replace('%M', 'mm')
//     .replace('%S', 'ss')
//     .replace('%Z', 'Z')
//     .replace('%z', 'ZZ')
//     .replace('%a', 'ddd')
//     .replace('%A', 'dddd')
//     .replace('%b', 'MMM')
//     .replace('%B', 'MMMM')
//     .replace('%p', 'A')
//   console.log(
//     `moment(${timestamp}).format(${momentFormat}) = ${moment(timestamp).format(momentFormat)}`,
//   )
//   return moment(timestamp).format(momentFormat)
// }

// // Function to format the timestamp
// /*
// User Instructions for Building a Time Format String

// When constructing a time format string, you can use the following placeholders to represent different components of the date and time. Each placeholder has an equivalent format in Moment.js:

// Year
//     %Y or YYYY: Full year (e.g., 2024)
// Month
//     %m or MM: Month as a two-digit number (e.g., 01 for January)
//     %b or MMM: Abbreviated month name (e.g., Jan)
//     %B or MMMM: Full month name (e.g., January)
// Day
//     %d or DD: Day of the month as a two-digit number (e.g., 05)
// Hour
//     %H or HH: Hour in 24-hour format (e.g., 14 for 2 PM)
// Minute
//     %M or mm: Minute as a two-digit number (e.g., 09)
// Second
//     %S or ss: Second as a two-digit number (e.g., 45)
// Time Zone
//     %Z or Z: Time zone offset (e.g., +0900)
//     %z or ZZ: Time zone offset with colon (e.g., +09:00)
// Day of the Week
//     %a or ddd: Abbreviated day name (e.g., Mon)
//     %A or dddd: Full day name (e.g., Monday)
// AM/PM
//     %p or A: AM/PM designation (e.g., PM)

// YYYY-MM-DD HH:mm:ss
// */
// // FIXME: move to util? or time
// function formatTimestamp_backup(timestamp, format, timeZone) {
//   console.log(`formatTimestamp(${timestamp}, ${format}, ${timeZone})`)
//   const momentFormat = format
//     .replace('%Y', 'YYYY')
//     .replace('%m', 'MM')
//     .replace('%d', 'DD')
//     .replace('%H', 'HH')
//     .replace('%M', 'mm')
//     .replace('%S', 'ss')
//     .replace('%Z', 'Z')
//     .replace('%z', 'ZZ')
//     .replace('%a', 'ddd')
//     .replace('%A', 'dddd')
//     .replace('%b', 'MMM')
//     .replace('%B', 'MMMM')
//     .replace('%p', 'A')

//   const formattedTimestamp = moment(timestamp).tz(timeZone).format(momentFormat)
//   console.log(
//     `moment(${timestamp}).tz(${timeZone}).format(${momentFormat}) = ${formattedTimestamp}`,
//   )
//   return formattedTimestamp
// }

// function formatTimestamp(timestamp, format, timeZone) {
//   console.log(`formatTimestamp(${timestamp}, ${format}, ${timeZone})`)

//   // Convert format string to moment.js format
//   const momentFormat = format
//     .replace('%Y', 'YYYY')
//     .replace('%m', 'MM')
//     .replace('%d', 'DD')
//     .replace('%H', 'HH')
//     .replace('%M', 'mm')
//     .replace('%S', 'ss')
//     .replace('%Z', 'Z')
//     .replace('%z', 'ZZ')
//     .replace('%a', 'ddd')
//     .replace('%A', 'dddd')
//     .replace('%b', 'MMM')
//     .replace('%B', 'MMMM')
//     .replace('%p', 'A')

//   let momentObj

//   // Detect if timestamp is a number (epoch seconds or milliseconds)
//   if (typeof timestamp === 'number') {
//     // If it's less than year 2000 in ms, assume it's in seconds
//     if (timestamp < 1000000000000) {
//       momentObj = moment.unix(timestamp) // epoch seconds
//     } else {
//       momentObj = moment(timestamp) // epoch milliseconds
//     }
//   } else {
//     momentObj = moment(timestamp) // ISO string or other
//   }
//   const formattedTimestamp = momentObj.tz(timeZone).format(momentFormat)
//   console.log(
//     `moment(${timestamp}).tz(${timeZone}).format(${momentFormat}) = ${formattedTimestamp}`,
//   )
//   return formattedTimestamp
// }

// // FIXME: move to user_pref?
// function user_time_format(timestamp) {
//   const timeFormat = tier3info_preferences.TimeFormat || '%B %d %Y, %H:%M:%S %Z'
//   const timeZone = tier3info_preferences.timeZone || 'America/New_York'
//   return formatTimestamp(timestamp, timeFormat, timeZone)
// }

// // // FIXME: make parent optionan, and return chart_div
// function createChart(dataObject, parent) {
//   console.log(createChart)
//   console.log(dataObject)
//   // Create the table element
//   const row_div = document.createElement('div')
//   row_div.className = 'row justify-content-center'
//   const chart_div = document.createElement('div')
//   // chart_div.className = "col-xl text-center border m-2 bg-light";
//   chart_div.className = 'col-md-4 text-center border m-2 bg-light'
//   const chart_name_legend = document.createElement('legend')
//   chart_name_legend.innerHTML = dataObject.contents.legend
//   chart_div.appendChild(chart_name_legend)
//   const chart_canvas = document.createElement('canvas')
//   chart_canvas.id = dataObject.id || dataObject.contents.id
//   chart_div.appendChild(chart_canvas)
//   var ctx_chart = chart_canvas.getContext('2d')
//   var chart = new Chart(ctx_chart, {
//     type: 'line',
//     data: {
//       labels: dataObject.contents.labels,
//       datasets: dataObject.contents.datasets,
//     },
//     options: dataObject.contents.options,
//   })
//   row_div.appendChild(chart_div)
//   parent.appendChild(row_div)
// }

// //FIXME: deprecated? also, consider these options for createDateTable
// function search_table(tableName, tableExtraOptions) {
//   var key
//   var tableOptions = {
//     retrieve: true,
//     dom: 'frtip',
//     buttons: ['colvis'],
//     scrollY: 150,
//     paging: false,
//     colReorder: true,
//   }
//   for (let key of Object.keys(tableExtraOptions)) {
//     tableOptions[key] = tableExtraOptions[key]
//   }
//   $('#' + tableName).dataTable(tableOptions)
// }

// // FIXME: move to util? or user_prefs
// function TierInfoDebugSet(Value) {
//   debug = Value
//   if (debug == 1) {
//     document.getElementById('TierInfoDebug').checked = true
//   } else {
//     document.getElementById('TierInfoDebug').checked = false
//   }
// }
// // FIXME: move to util? or user_prefs
// function TierInfoDebug_onchange() {
//   if (document.getElementById('TierInfoDebug').checked) {
//     TierInfoDebugSet(1)
//   } else {
//     TierInfoDebugSet(0)
//   }
// }

// document.addEventListener('keydown', function (event) {
//   // Check if Ctrl is pressed along with 'M'
//   if (event.ctrlKey && event.key === 'm') {
//     // Prevent the default action to avoid any conflicts
//     event.preventDefault()

//     // Get the input element and set focus
//     var input = document.getElementById('inputMagicMenu')
//     if (input) {
//       input.focus()
//     }
//   }
// })

// // FIXME: move to util? user_prefs
// function Tier3InfoPreferences_Save_CB(data) {
//   // deprecated
//   document.getElementById('Tier3iInfoPreferences_footer').innerHTML = JSON.stringify(data)
// }

// function divider(legend_message = null, legend_id = null) {
//   const divider = document.createElement('span')
//   divider.className = 'd-block p-1 bg-secondary text-white'
//   if (legend_message) {
//     container = document.createElement('div')
//     container.appendChild(divider)
//     container.appendChild(legend(legend_message, legend_id))
//     return container
//   }
//   return divider
// }

// function legend(message, legend_id = null) {
//   console.log(message, legend_id)
//   const new_legend = document.createElement('legend')
//   if (legend_id) {
//     new_legend.id = legend_id
//   }
//   new_legend.innerHTML = message
//   return new_legend
// }

// // FIXME: user_prefs
// var preferences_editor

// // FIXME: user_prefs
// function Tier3InfoPreferences_Save() {
//   // deprecated
//   //json_text = document.getElementById('inputPreferences').value;
//   json_text = preferences_editor.getValue()
//   var request = { mode: 'ajax', 'content-type': 'application/json' }
//   request.sessionId = get_sessionId()
//   request.action = 'tier3info_preferences_save'
//   request.json_text = json_text
//   console.log(request)
//   console.log(JSON.stringify(request))
//   var url = cgiscript
//   fetch(url, {
//     headers: {
//       Accept: 'application/json',
//       'Content-Type': 'application/json',
//     },
//     method: 'POST',
//     body: JSON.stringify(request),
//   })
//     .then((response) => {
//       return response.json()
//     })
//     .then((data) => {
//       Tier3InfoPreferences_Save_CB(data)
//     })
//     .catch((err) => {
//       console.log(err)
//     })
// }

// // FIXME: user_prefs
// function TierInfoFavoriteSet(action) {
//   // deprecated
//   console.log(action)
//   var request = { mode: 'ajax', 'content-type': 'application/json' }
//   request.sessionId = get_sessionId()
//   request.action = 'tier3info_preferences_set'
//   request.pref = 'defaultAction'
//   request.value = action
//   console.log(request)
//   console.log(JSON.stringify(request))
//   var url = cgiscript
//   fetch(url, {
//     headers: {
//       Accept: 'application/json',
//       'Content-Type': 'application/json',
//     },
//     method: 'POST',
//     body: JSON.stringify(request),
//   })
//     .then((response) => {
//       return response.json()
//     })
//     .then((data) => {
//       console.log(data)
//     })
//     .catch((err) => {
//       console.log(err)
//     })
// }

// // FIXME: user_prefs
// function TierInfoFavorite_onchange() {
//   if (document.getElementById('TierInfoFavorite').checked) {
//     if (current_action == tier3info_preferences.defaultAction) {
//       console.log(current_action + ' is already default')
//     } else {
//       tier3info_preferences.defaultAction = current_action
//       tier3info_preferences_store()
//     }
//   }
// }

// // FIXME: user_prefs
// function TierInfoDebug_init() {
//   document.getElementById('wgh_right').innerHTML =
//     '<form><div class="form-check"><input type="checkbox" class="form-check-input" id="TierInfoFavorite" onchange="TierInfoFavorite_onchange();"><label class="form-check-label" for="TierInfoFavorite">Favorite?</label></div><div class="form-check"><input type="checkbox" class="form-check-input" id="TierInfoDebug" onchange="TierInfoDebug_onchange();"><label class="form-check-label" for="TierInfoDebug">Debug?</label></div></form>'
// }

// function TierInfoScratchPad_onload() {
//   ScratchPad = document.getElementById('TierInfoScratchPad')
//   ScratchPad.value = localStorage.getItem('locateScratchPad') // uncomment the next line later, to migrate to TierInfoScratchPad
//   //ScratchPad.value = localStorage.getItem('TierInfoScratchPad');
// }

// function TierInfoScratchPad_onkeyup() {
//   ScratchPad = document.getElementById('TierInfoScratchPad')
//   localStorage.setItem('locateScratchPad', ScratchPad.value) // Drop this line later to migrate to TierInfoScratchPad
//   localStorage.setItem('TierInfoScratchPad', ScratchPad.value)
// }

// function toggleDiv(divName) {
//   Div = document.getElementById(divName)
//   if (Div.hidden) {
//     Div.hidden = false
//   } else {
//     Div.hidden = true
//   }
//   return Div.hidden
// }

// // Global array to store displayed messages
// var displayedMessages = []

// function clearLoadingModal() {
//   // Set a timeout to delay the destruction and clearing of the modal
//   setTimeout(function () {
//     // Hide and destroy the loading modal
//     $('body').loadingModal('destroy')
//     // Clear the list of displayed messages after the timeout
//     displayedMessages = []
//   }, 50)
// }

// //    LoadingModal('rotatingPlane','rotatingPlane');
// //    LoadingModal('wave','wave');
// //    LoadingModal('wanderingCubes','wanderingCubes');
// //    LoadingModal('spinner','spinner');
// //    LoadingModal('chasingDots','chasingDots');
// //    LoadingModal('threeBounce','threeBounce');
// //    LoadingModal('circle','circle');
// //    LoadingModal('cubeGrid','cubeGrid');
// //    LoadingModal('fadingCircle','fadingCircle');
// //    LoadingModal('foldingCube','foldingCube');

// function LoadingModal(message, animation) {
//   // Default values for message and animation
//   if (message == null) {
//     message = 'Loading...'
//   }
//   if (animation == null) {
//     animation = 'fadingCircle'
//   }

//   // Check if the message has already been displayed
//   if (displayedMessages.includes(message) && $('body').loadingModal('isVisible')) {
//     // If so, do nothing to avoid redundancy
//     console.log('Redundant message:' + message)
//     return
//   }

//   // Add the message to the list of displayed messages
//   displayedMessages.push(message)

//   // Show or update the loading modal with the new message and animation
//   $('body').loadingModal({ text: message, animation: animation })
//   $('body').loadingModal('animation', animation)
//   $('body').loadingModal('text', message)

//   // Add click event handler to clear the modal when clicked
//   $('body')
//     .loadingModal()
//     .off('click')
//     .on('click', function (event) {
//       if ($(event.target).hasClass('query-loading-modal__text')) {
//         console.log('Modal clicked')
//         clearLoadingModal()
//       }
//     })
// }

// function magic_menu() {
//   // Get the input text value
//   var inputTextValue = document.getElementById('inputMagicMenu').value.toLowerCase()
//   if (inputTextValue == '') {
//     document.getElementById('magic_menu_output').innerHTML = ''
//     return
//   }

//   if (inputTextValue == '*') {
//     inputTextValue = ''
//   }

//   // Function to recursively search through menu and sub-items
//   function searchMenu(items) {
//     const matches = []
//     items.forEach((item) => {
//       // Convert all searchable properties to lowercase and check if they include the input text
//       const itemText = item.item ? item.item.toLowerCase() : ''
//       const linkText = item.link ? item.link.toLowerCase() : ''
//       const classText = item.class ? item.class.toLowerCase() : ''

//       // Check if any of the properties include the input text
//       if (
//         itemText.includes(inputTextValue) ||
//         linkText.includes(inputTextValue) ||
//         classText.includes(inputTextValue)
//       ) {
//         matches.push(item)
//       }

//       // If there are sub-items, recursively search them
//       if (item.items) {
//         matches.push(...searchMenu(item.items))
//       }
//     })
//     return matches
//   }

//   // Start the search with the top-level menu items
//   const matches = searchMenu(menu)
//   // console.log(matches)
//   columns = 5
//   if (matches.length <= 25) {
//     columns = Math.ceil(matches.length / 5)
//   }
//   // console.log(matches);
//   // Generate HTML for the matches as list items
//   const outputHtml = `<ul class="text-white-50" style="columns:${columns}">${matches
//     .map((match) => {
//       if (!match.link) {
//         return
//       }
//       let hrefAttribute = match.link || '#' // If match.link is null, use '#' as a fallback
//       const targetAttribute = hrefAttribute.startsWith('?action') ? '' : 'target="_blank"'

//       // Handle 'js:' links
//       let onClickAttribute = ''
//       if (hrefAttribute.startsWith('js:')) {
//         // console.log(hrefAttribute);
//         onClickAttribute = `onclick="${hrefAttribute.slice(3)}; return false;"` // Extract JavaScript code and prevent default action
//         // console.log(onClickAttribute);
//         hrefAttribute = '#' // Set href to '#' for 'js:' links
//       }
//       return `<li><a href="${hrefAttribute}" ${targetAttribute} ${onClickAttribute} class="text-white-50">${match.class}: ${match.item}</a></li>`
//     })
//     .join('')}</ul>` // The join('') here ensures there's no separator between list items

//   // Set the innerHTML of magic_menu_output with the list of matches
//   document.getElementById('magic_menu_output').innerHTML = outputHtml
//   console.log(outputHtml)
//   if (event.key === 'Enter' || event.keyCode === 13) {
//     console.log('Enter key was released')
//     if (matches.length == 1) {
//       const link = matches[0].link
//       // console.log(matches);
//       // Check if the link starts with "?action"
//       if (link.startsWith('js:')) {
//         // Extract and execute the JavaScript code
//         const jsCode = link.slice(3)
//         eval(jsCode)
//       } else if (link.startsWith('?action')) {
//         window.location.href = link
//       } else {
//         // Open in a new tab if it does not start with "?action"
//         window.open(link, '_blank').focus()
//       }
//     } else {
//       // console.log(matches.length)
//       if (matches.length == 0) {
//         if (inputTextValue.startsWith('fax:')) {
//           fax_search_form(inputTextValue.slice(4))
//         } else if (inputTextValue.startsWith('vsx:')) {
//           const inputTextValueFinal = document.getElementById('inputMagicMenu').value
//           vsx_search_form(inputTextValueFinal.slice(4))
//         } else if (inputTextValue.startsWith('loc:')) {
//           locate_search_form(inputTextValue.slice(4))
//         } else {
//           url = '?action=locate_form&keyword=' + inputTextValue
//           // console.log(url);
//           window.location.href = url
//         }
//       }
//     }
//   }
//   if (matches.length == 0) {
//     query_string = inputTextValue
//     if (/[a-zA-Z0-9]$/.test(query_string)) {
//       query_string += '*'
//     }
//     tier3info_restful_request({
//       path: '/locate',
//       callback: magic_menu_locate_callback,
//       method: 'POST',
//       body: { query_string: query_string, limit: 50 },
//     })
//   }
// }

// function magic_menu_locate_callback(response) {
//   console.log(response)
//   const inputTextValue = document.getElementById('inputMagicMenu').value.toLowerCase()
//   const items = []

//   for (const [_id, item] of Object.entries(response)) {
//     item.key_field = locate_cache_key_fields[item.type] || ''
//     item._id = _id
//     console.log(item)
//     console.log(item._id, item.key_field)
//     if (item[item.key_field].toLowerCase() === inputTextValue) {
//       items.unshift(item)
//     } else {
//       items.push(item)
//     }
//   }
//   columns = 5
//   if (items.length <= 25) {
//     columns = Math.ceil(items.length / 5)
//   }
//   const outputHtml = `<ul class="text-white-50" style="columns:${columns}">${items
//     .map((item) => {
//       let onClickAttribute = `onclick="locate_display_item('${item.type}', '${item._id}' ); return false;"`
//       return `<li><a href="#" ${onClickAttribute} class="text-white-50">${item.type}: ${item[item.key_field]}</a></li>`
//     })
//     .join('')}</ul>` // The join('') here ensures there's no separator between list items
//   // Set the innerHTML of magic_menu_output with the list of matches
//   document.getElementById('magic_menu_output').innerHTML = outputHtml
// }

// // FIXME: util?
// function copyRenderedContent(divName) {
//   // Get the element you want to copy
//   var element = document.getElementById(divName)

//   // Create a range and select the element
//   var range = document.createRange()
//   range.selectNodeContents(element)

//   // Get the selection object and add the range to it
//   var selection = window.getSelection()
//   selection.removeAllRanges() // Clear any existing selections
//   selection.addRange(range)

//   // selection to the clipboard
//   try {
//     document.execCommand('copy')
//     alert('Rendered content copied to clipboard!')
//   } catch (err) {
//     console.error('Failed to copy: ', err)
//   }

//   // Remove the range from the selection
//   selection.removeAllRanges()
// }

// function locate_display_item(item_type, item_id) {
//   console.log(item_type, item_id)
//   action_div = document.getElementById('action')
//   action_div.innerHTML = `Fetching ${item_type} ${item_id}`
//   // LoadingModal(`Fetching ${item_type} ${item_id}`);
//   tier3info_restful_request({ path: `/locate/${item_id}`, callback: locate_display_item_callback })
// }

// function locate_display_item_callback(response) {
//   action_div = document.getElementById('action')
//   action_div.innerHTML = `<pre>${JSON.stringify(response, null, 4)}</pre>`
//   // clearLoadingModal()
// }

// function isBase64(str) {
//   if (typeof str !== 'string') return false

//   // Check if string length is a multiple of 4
//   if (str.length % 4 !== 0) return false

//   // Check for valid Base64 characters
//   const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/

//   return base64Regex.test(str)
// }

// function unescapeEncodedString(encoded) {
//   // Step 1: Replace \xHH with actual characters
//   const hexDecoded = encoded.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) =>
//     String.fromCharCode(parseInt(hex, 16)),
//   )

//   // Step 2: Unescape other escaped characters (like \n, \")
//   const fullyDecoded = hexDecoded.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')

//   return fullyDecoded
// }

// function copyToClipboard(text) {
//   console.log(text)
//   if (isBase64(text)) {
//     text = unescapeEncodedString(atob(text))
//   }
//   console.log(text)
//   navigator.clipboard.writeText(text)
//   // const tempInput = document.createElement("textarea");
//   // tempInput.value = text;
//   // document.body.appendChild(tempInput);
//   // tempInput.select();
//   // document.execCommand("copy");
//   // document.body.removeChild(tempInput);
//   alert(`Copied to clipboard!:\n ${text}`)
// }
