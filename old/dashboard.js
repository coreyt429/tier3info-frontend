let dashboardTimeoutHandle;
let refreshInterval = 15000; // 15 seconds

var dial_opts = {
	angle: 0, // The span of the gauge arc
	lineWidth: 0.25, // The line thickness
	radiusScale: 0.5, // Relative radius
	pointer: {
		length: 0.6, // // Relative to gauge radius
		strokeWidth: 0.035, // The thickness
		color: '#000000' // Fill color
	},
	limitMax: false,     // If false, max value increases automatically if value > maxValue
	limitMin: false,     // If true, the min value of the gauge will be fixed
	colorStart: '#5bb75b',   // Colors
	colorStop: '#5bb75b',    // just experiment with them
	strokeColor: '#E0E0E0',  // to see which ones work best for you
	generateGradient: true,
	highDpiSupport: true,     // High resolution support  
};


function display_vo_tickets(){
    var wgh_icon = document.getElementById('wgh_icon');
    wgh_icon.className = 'fas fa-ticket-alt';
    var actionDiv = document.getElementById('action');
    var dashboardInfoDiv = document.createElement('div');
    dashboardInfoDiv.id = 'dashboard_info';
    actionDiv.appendChild(dashboardInfoDiv);
    document.getElementById('wgh_text').innerHTML = 'Voice Operations Tickets'
    setTimeout(function() {
        load_dashboard_detail('voiceops_tickets');
    }, 100); // 100 milliseconds delay
}

function getTimeDifference(timestamp) {
    const currentTime = new Date();
    const pastTime = new Date(timestamp);
    const timeDifference = Math.floor((currentTime - pastTime) / 60000); // Difference in minutes
    return timeDifference;
}

function load_dashboard_detail_callback(data, detailDiv, metric_id){
    // FIXME:
    // if data.cfg.description exists, prepend data_description with
    //   divider
    //   legend: Description
    //   html: data.cfg.description
    let timeDifferenceText;
    const timeDifference = getTimeDifference(data.timestamp);
    if (timeDifference === 0) {
        timeDifferenceText = 'just now';
    } else if (timeDifference === 1) {
        timeDifferenceText = '1 minute ago';
    } else {
        timeDifferenceText = `${timeDifference} minutes ago`;
    }

    detailDiv.innerHTML = `last updated ${timeDifferenceText}`;
    console.log("data:", data);
    console.log(data.data_description)
    build_data_display(data.data_description, detailDiv)
    detailDiv.scrollIntoView({ behavior: 'smooth' });
    // needed for kafka topic delay data
    initializePopovers();
    clearLoadingModal()
}

function load_dashboard_detail(metric_id){
	const detailDiv = document.getElementById('dashboard_info');
    request = {"path": `dashboard/detail/${metric_id}`, "method": "GET"};
    request.callback = function(data) {
        load_dashboard_detail_callback(data, detailDiv, metric_id);
    };
    console.log("request", request);
    LoadingModal(`Loading  ${metric_id} Details`);
    tier3info_restful_request(request);
}

function refresh_dashboard_data(data) {
	console.log(data)
    const rowDiv = document.getElementById('dashboard-row');
	const status = {
		"green": "bg-success",
		"yellow": "bg-warning",
		"red": "bg-danger",
		"blue": "bg-primary"
	}
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            const item = data[key];
			const currentTime = new Date();
			const itemTime = new Date(item.timestamp);
			const expireTime = item.expire * 60 * 1000; // Convert minutes to milliseconds
            console.log(`currentTime(${currentTime}) - itemTime(${itemTime}) > expireTime(${expireTime})`);
			if (currentTime - itemTime > expireTime) {
                console.log("Expired item");
                console.log(JSON.stringify(item));
				item.color = "blue";
			}
            const existingColDiv = document.getElementById("dial_" + key);

            if (existingColDiv) {
                // Update existing element
                const progressBarDiv = existingColDiv.querySelector('.progress-bar');
				progressBarDiv.className = 'progress-bar ' + status[item.color];
                progressBarDiv.style.width = item.percent + '%';
                progressBarDiv.setAttribute('aria-valuenow', item.percent);

                // const span = existingColDiv.querySelector('.position-absolute span');
                // span.textContent = `(${item.count}/${item.target}) ${item.percent}%`;
                const span = existingColDiv.querySelector('.position-absolute span');
                if (item.hasOwnProperty('text') && item.text != null) {
                    span.textContent = `${item.text} ${item.percent}%`;
                } else {
                    // span.textContent = `(${item.count}/${item.target}) ${item.percent}%`;
                    span.textContent = `(${Number.isInteger(item.count) ? item.count : item.count.toFixed(2)}/${item.target}) ${item.percent}%`;
                }
                const labelDiv = existingColDiv.querySelector('.p-2 div');
                labelDiv.textContent = item.label;
            } else {
                // Create new element
                const colDiv = document.createElement('div');
                colDiv.className = 'col-xl-auto border m-2 bg-light';
                colDiv.style.minWidth = '300px';
                colDiv.id = "dial_" + key;

                const anchor = document.createElement('a');
                anchor.href = 'javascript:void(0)';
                anchor.onclick = function() {
                    LoadingModal('Loading ' + item.label);
                    load_dashboard_detail(key);
                    return false;
                };
                anchor.style.color = '#000000';
                anchor.style.textDecoration = 'none';

                const dFlexDiv = document.createElement('div');
                dFlexDiv.className = 'd-flex align-items-center';

                const p2Div1 = document.createElement('div');
                p2Div1.className = 'p-2';
                p2Div1.style.width = '100px';

                const labelDiv = document.createElement('div');
                labelDiv.style.fontSize = '14px';
                labelDiv.style.fontWeight = '600';
                labelDiv.textContent = item.label;

                p2Div1.appendChild(labelDiv);

                const p2Div2 = document.createElement('div');
                p2Div2.className = 'p-2 flex-grow-1 position-relative';
                p2Div2.style.minWidth = '200px';

                const progressDiv = document.createElement('div');
                progressDiv.className = 'progress';
                progressDiv.style.height = '30px';

                const progressBarDiv = document.createElement('div');
				progressBarDiv.className = 'progress-bar ' + status[item.color];
                progressBarDiv.role = 'progressbar';
                progressBarDiv.style.width = item.percent + '%';
                progressBarDiv.setAttribute('aria-valuenow', item.percent);
                progressBarDiv.setAttribute('aria-valuemin', '0');
                progressBarDiv.setAttribute('aria-valuemax', '100');

                progressDiv.appendChild(progressBarDiv);

                const positionDiv = document.createElement('div');
                positionDiv.className = 'position-absolute w-100 h-100 d-flex align-items-center justify-content-center';
                positionDiv.style.top = '0';
                positionDiv.style.left = '0';

                const span = document.createElement('span');
                // span.textContent = `(${item.count}/${item.target}) ${item.percent}%`;
                if (item.hasOwnProperty('text') && item.text != null) {
                    span.textContent = `${item.text} ${item.percent}%`;
                } else {
                    span.textContent = `(${item.count}/${item.target}) ${item.percent}%`;
                }
                positionDiv.appendChild(span);
                p2Div2.appendChild(progressDiv);
                p2Div2.appendChild(positionDiv);

                dFlexDiv.appendChild(p2Div1);
                dFlexDiv.appendChild(p2Div2);
                anchor.appendChild(dFlexDiv);
                colDiv.appendChild(anchor);
                rowDiv.appendChild(colDiv);
            }
        }
    }
    const refreshDiv = document.getElementById('dashboard-refresh');
    const currentTime = new Date();
    refreshDiv.innerHTML = `Refreshed ${user_time_format(currentTime)}`;
}

function dashboard_refresh() {
    console.log('dashboard_refresh');
    const rowDiv = document.getElementById('dashboard-row');
    const refreshDiv = document.getElementById('dashboard-refresh');
    
    if (rowDiv === null) {
        console.log('dashboard not loaded');
        return;
    }

    // Indicate that the dashboard is refreshing
    if (refreshDiv) {
        refreshDiv.innerHTML = '<div class="spinner"></div>';
    }

    // Make the request
    tier3info_restful_request({"path": "/dashboard", "callback": refresh_dashboard_data});

    // Clear the previous timeout if it exists
    if (dashboardTimeoutHandle) {
        clearTimeout(dashboardTimeoutHandle);
    }

    // // Set up the countdown
    // let countdown = refreshInterval / 1000; // Convert milliseconds to seconds
    // const countdownInterval = setInterval(() => {
    //     if (refreshDiv) {
    //         refreshDiv.innerHTML = `<div class="countdown-circle" style="animation-duration: ${refreshInterval}ms;"></div> Next refresh in ${countdown} seconds`;
    //     }
    //     countdown--;
    //     if (countdown < 0) {
    //         clearInterval(countdownInterval);
    //     }
    // }, 1000);
    // refreshDiv.innerHTML = `<div class="countdown-circle" style="animation-duration: ${refreshInterval}ms;"></div>`;
    // refreshDiv.innerHTML = '';
    // Set the timeout for the next refresh
    dashboardTimeoutHandle = setTimeout(dashboard_refresh, refreshInterval);
}