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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)