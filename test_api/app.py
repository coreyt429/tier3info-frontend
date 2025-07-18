from flask import Flask, request, jsonify
import json
import os
from flask_cors import CORS

app = Flask(__name__)
CFG_FILE = 'cfg.json'


CORS(app, resources={r"/*": {"origins": "http://localhost:9000"}}, supports_credentials=True)

def read_cfg():
    if not os.path.exists(CFG_FILE):
        return {}
    with open(CFG_FILE, 'r') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}


def write_cfg(cfg):
    with open(CFG_FILE, 'w') as f:
        json.dump(cfg, f, indent=2)

endpoints = [
    'cfg',
    'preferences',
    'menus',
    'dashboard',
    'menu',
    'broadworks/certificates'
]


@app.route('/api/cfg/', methods=['GET'])
@app.route('/api/cfg', methods=['GET'])
def list_configs():
    cfg = read_cfg()
    return jsonify(sorted(cfg.keys()))


@app.route('/api/cfg/<cfg_id>', methods=['GET'])
def get_config(cfg_id):
    cfg = read_cfg()
    if cfg_id in cfg:
        return jsonify(cfg[cfg_id])
    return jsonify({'error': 'Not found'}), 404


@app.route('/api/cfg/<cfg_id>', methods=['PUT'])
def save_config(cfg_id):
    data = request.get_json()
    if not isinstance(data, dict):
        return jsonify({'error': 'Invalid payload'}), 400
    cfg = read_cfg()
    cfg[cfg_id] = data
    write_cfg(cfg)
    return jsonify({'status': 'saved', 'id': cfg_id})

@app.route('/api/cfg/<cfg_id>', methods=['DELETE'])
def delete_config(cfg_id):
    cfg = read_cfg()
    if cfg_id in cfg:
        cfg.pop(cfg_id)
        write_cfg(cfg)
        return jsonify({'status': 'deleted', 'id': cfg_id})
    return jsonify({'error': 'Not found'}), 404

for endpoint in endpoints:
    app.add_url_rule(f'/api/{endpoint}/', view_func=list_configs, methods=['GET'])
    app.add_url_rule(f'/api/{endpoint}', view_func=list_configs, methods=['GET'])
    app.add_url_rule(f'/api/{endpoint}/<cfg_id>', view_func=get_config, methods=['GET'])
    app.add_url_rule(f'/api/{endpoint}/<cfg_id>', view_func=save_config, methods=['PUT'])
    app.add_url_rule(f'/api/{endpoint}/<cfg_id>', view_func=save_config, methods=['DELETE'])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)