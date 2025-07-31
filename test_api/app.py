from flask import Flask, request, jsonify
import json
import os
from flask_cors import CORS
import logging
# Set up logging
logging.basicConfig(level=logging.INFO) 
logging.warning('This is a warning message')
logging.error('This is an error message')

CFG_FILE = 'cfg.json'
app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "http://localhost:9000"}}, supports_credentials=True)

def read_cfg(filename):
    if not os.path.exists(filename):
        return {}
    with open(filename, 'r') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

def write_cfg(cfg, filename):
    logging.info(f"Writing config to {filename}")
    with open(filename, 'w') as f:
        json.dump(cfg, f, indent=2)
    

endpoints = {
    '/api/cfg': 'cfg.json',
    '/api/preferences': 'preferences.json',
    '/api/menu': 'menus.json',
    '/api/bookmarks': 'bookmarks.json',
    '/api/dashboard': 'dashboard.json',
    # '/api/menu/user': 'menus.json',
    '/api/broadworks/cli_templates': 'broadworks_cli_templates.json',
    '/api/broadworks/certificates': 'broadworks_certificates.json',
    '/api/task_schedule': 'task_schedule.json',
}


@app.route('/api/cfg/', methods=['GET'])
@app.route('/api/cfg', methods=['GET'])
def list_configs():
    route = request.path.removesuffix('/')
    logging.info("Fetching config list from route: %s", route)
    filename = endpoints.get(route, CFG_FILE)
    cfg = read_cfg(filename)
    return jsonify(sorted(cfg.keys()))


@app.route('/api/cfg/<cfg_id>', methods=['GET'])
def get_config(cfg_id=None):
    if cfg_id is None:
        cfg_id = 'default'
    logging.info("Received request for config ID: %s, path: %s", cfg_id, request.path)
    route = request.path.removesuffix(f"/{cfg_id}")
    logging.info("Fetching config for ID: %s from route: %s", cfg_id, route)
    filename = endpoints.get(route, CFG_FILE)
    cfg = read_cfg(filename)
    if cfg_id in cfg:
        return jsonify(cfg[cfg_id])
    return jsonify({'error': 'Not found'}), 404


@app.route('/api/cfg/', methods=['PUT', 'POST'])
@app.route('/api/cfg', methods=['PUT', 'POST'])
@app.route('/api/cfg/<cfg_id>', methods=['PUT', 'POST'])
def save_config(cfg_id=None):
    if cfg_id is None:
        cfg_id = 'default'
    data = request.get_json()
    if not (isinstance(data, dict) or isinstance(data, list)):
        return jsonify({'error': 'Invalid payload'}), 400
    route = request.path.removesuffix(f"/{cfg_id}") if cfg_id != 'default' else request.path.removesuffix('/')
    logging.info("Fetching config for ID: %s from route: %s", cfg_id, route)
    filename = endpoints.get(route, CFG_FILE)
    cfg = read_cfg(filename)
    cfg[cfg_id] = data
    write_cfg(cfg, filename)
    return jsonify({'status': 'saved', 'id': cfg_id})

@app.route('/api/login', methods=['GET'])
def get_login_url():
    logging.info("Login endpoint called")
    return jsonify({'url': 'https://todo.coreyt.com'})

@app.route('/api/cfg/<cfg_id>', methods=['DELETE'])
def delete_config(cfg_id):
    route = request.path.removesuffix(f"/{cfg_id}")
    logging.info("Fetching config for ID: %s from route: %s", cfg_id, route)
    filename = endpoints.get(route, CFG_FILE)
    cfg = read_cfg(filename)
    if cfg_id in cfg:
        cfg.pop(cfg_id)
        write_cfg(cfg, filename)
        return jsonify({'status': 'deleted', 'id': cfg_id})
    return jsonify({'error': 'Not found'}), 404

for endpoint in endpoints.keys():
    app.add_url_rule(f'{endpoint}/', view_func=list_configs, methods=['GET'])
    app.add_url_rule(f'{endpoint}', view_func=list_configs, methods=['GET'])
    app.add_url_rule(f'{endpoint}/<cfg_id>', view_func=get_config, methods=['GET'])
    app.add_url_rule(f'{endpoint}/', view_func=save_config, methods=['PUT'])
    app.add_url_rule(f'{endpoint}', view_func=save_config, methods=['PUT'])
    app.add_url_rule(f'{endpoint}/<cfg_id>', view_func=save_config, methods=['PUT'])
    app.add_url_rule(f'{endpoint}/<cfg_id>', view_func=delete_config, methods=['DELETE'])

@app.route('/api/menu/user', methods=['GET'])
def get_user_menu():
    menu = [
        {
            "title": "Home",
            "link": "/",
            "icon": "home",
            "caption": "Go to homepage",
        },
        {
            "title": "Tools",
            "icon": "build",
            "caption": "Useful tools",
            "children": [
                {
                    "title": "Locate",
                    "icon": "search",
                    "link": "/#/locate",
                    "caption": "Find Stuff",
                },
                {
                    "title": "Configuration",
                    "link": "/#/config",
                    "icon": "settings",
                    "caption": "Set stuff up",
                },
            ],
        },
    ]
    return jsonify(menu)

@app.route('/api/heartbeat', methods=['POST','PUT'])
def heartbeat():
    return jsonify({'message': 'okay'})

LOCATE_FILE = 'locate_sample_data.json'

@app.route('/api/locate/', methods=['POST'])
def locate():
    if not os.path.exists(LOCATE_FILE):
        return jsonify({'error': 'Sample data not found'}), 404

    with open(LOCATE_FILE, 'r') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid sample data format'}), 500

    hits = data.get('hits', {}).get('hits', [])
    query = request.get_json()
    query_string = query.get('query_string', '') if isinstance(query, dict) else ''

    filtered_hits = []
    for hit in hits:
        source = hit.get('_source', {})
        record = source.copy()
        record['id'] = hit.get('_id', '')
        if 'access_device' in query_string or 'device_id' in query_string:
            if source.get('type') == 'access_device':
                filtered_hits.append(record)
        else:
            filtered_hits.append(record)

    return jsonify(filtered_hits)

TAGSETS_FILE = 'tagsets.json'

def read_tagsets():
    if not os.path.exists(TAGSETS_FILE):
        with open(TAGSETS_FILE, 'w') as f:
            json.dump([], f)
    with open(TAGSETS_FILE, 'r') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

def write_tagsets(tagsets):
    with open(TAGSETS_FILE, 'w') as f:
        json.dump(tagsets, f, indent=2)

@app.route('/api/tagtool/tagset', methods=['GET'])
def list_tagsets():
    tagsets = read_tagsets()
    tagset_names = [tagset['tagset_name'] for tagset in tagsets]
    return jsonify(tagset_names)

@app.route('/api/tagtool/tagset/<tagset_name>', methods=['GET'])
def get_tagset(tagset_name):
    tagsets = read_tagsets()
    for tagset in tagsets:
        if tagset['tagset_name'] == tagset_name:
            return jsonify(tagset)
    return jsonify({'error': 'Tagset not found'}), 404

@app.route('/api/tagtool/tagset/<tagset_name>', methods=['PUT'])
def save_tagset(tagset_name):
    data = request.get_json()
    if not isinstance(data, dict) or 'tags' not in data or not isinstance(data['tags'], list):
        return jsonify({'error': 'Invalid payload'}), 400

    tagsets = read_tagsets()
    for tagset in tagsets:
        if tagset['tagset_name'] == tagset_name:
            tagset['tags'] = data['tags']
            write_tagsets(tagsets)
            return jsonify({'status': 'updated', 'tagset_name': tagset_name})

    new_tagset = {
        'tagset_name': tagset_name,
        'tags': data['tags']
    }
    tagsets.append(new_tagset)
    write_tagsets(tagsets)
    return jsonify({'status': 'created', 'tagset_name': tagset_name})

@app.route('/api/tagtool/tagset/<tagset_name>', methods=['DELETE'])
def delete_tagset(tagset_name):
    tagsets = read_tagsets()
    for tagset in tagsets:
        if tagset['tagset_name'] == tagset_name:
            tagsets.remove(tagset)
            write_tagsets(tagsets)
            return jsonify({'status': 'deleted', 'tagset_name': tagset_name})
    return jsonify({'error': 'Tagset not found'}), 404

@app.route('/api/broadworks/access_device/<device_id>/rebuild', methods=['POST'])
def rebuild_device(device_id):
    return jsonify({'status': 'okay', 'message': f'{device_id} rebuilt'})

@app.route('/api/broadworks/access_device/<device_id>/reboot', methods=['POST'])
def reboot_device(device_id):
    return jsonify({'status': 'okay', 'message': f'{device_id} rebooted'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)