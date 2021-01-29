import os
from pathlib import Path  # Python 3.6+ only

from bottle import request, response, route, run, Bottle, static_file,TEMPLATES
from dotenv import load_dotenv

cwd = os.path.dirname(os.path.realpath(__file__)) #= <something>/napkin/server
env_path = cwd +  '/../.env'
load_dotenv(dotenv_path=env_path)

rest_srv_port =  int(os.getenv('NAPKIN_REST_SVR_PORT'))
rest_srv_host =      os.getenv('NAPKIN_REST_SVR_HOST')
rest_root     =      os.getenv('NAPKIN_REST_SVR_ROOT')

if rest_root[0] in "/\\":
    static_file_root =  rest_root
else:
    static_file_root =  os.getenv('NAPKIN_BASE') + os.path.sep + rest_root

app = Bottle()

#-------------------------- Napkin Main Tool Page -------------------------------
@app.route('/')
@app.route('/test')
def test():
     print("Processing the / path or /test")
     filename = 'index.html'
     res =  static_file(filename, root=static_file_root)
     return res

#--------------------------  Napkin Tool Support Files (build.js) -----------------
@app.route('/dist/<filename>')
@app.route('/static/dist/<filename>')
def dist_files(filename):
     res =  static_file(filename, root=static_file_root+ os.path.sep + "dist")
     print(filename)
     print(res)
     return res

 

#---------------------------- Other RESTful Services -------------------------------
TEMPLATES.clear()
print(f"Starting Napkin rest server at {rest_srv_host}:{rest_srv_port}")
run(app, host=rest_srv_host, port=rest_srv_port)
