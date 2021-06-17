import json
import os
from pathlib import Path  # Python 3.6+ only

from bottle import (TEMPLATES, Bottle, request, response, route, run,
                    static_file)
from bt.multi_process_apply import run_one_log_eval
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
#--------------------------- T-EARS Evaluation -----------------------------------
@app.route('/evaluate')
def evaluate():
    '''
    Parameters :
            print("gafiles=",request.query.gafiles)
            print("logfile=",request.query.logfile)
            print("maindefs", request.query.maindefs)          
    '''
    print("Evaluate called")
    try:
        print("gafiles=",request.query.gafiles)
        print("logfile=",request.query.logfile)
        print("maindefs", request.query.maindefs)
        
        gadir   =  os.getenv('NAPKIN_BASE') + os.getenv('DEFAULT_GA_DIR')
        logfile =  os.getenv('NAPKIN_BASE') +  os.getenv('DEFAULT_LOG_DIR') + request.query.logfile.replace('"','')
        maindefdir = gadir + os.path.sep + ".." + os.path.sep
        maindefs = maindefdir + request.query.maindefs
        gafiles = [gadir + s for s in  json.loads(request.query.gafiles)]
 
        argball= {
                        'ix'       : 1,
                        'ga_files' :gafiles,
                        'log_file' : logfile, 
                        'main_defs': maindefs,
                        'ga_motor' : os.getenv('DEFAULT_GA_MOTOR')
                    }
        print(argball)
        res = run_one_log_eval(argball)
    except Exception as e:
        print(e)
        res = "Something went wrong" + str(e)
    
    # res is shaped as {'ix':argball['ix'],
    #              'row':json.loads(p.stdout)}
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Origin, Accept, Content-Type, X-Requested-With, X-CSRF-Token' 
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
