################################################################################
# SPDX-FileCopyrightText: 2017 Scania CV AB
# SPDX-License-Identifier: GPL-3.0-or-later

# File: server.py
# Date: 2017-09-18
# Version:
# Author: tguc8n
################################################################################
# Purpose:
# TODO: Refactor so we have a generic interface with modules for 
# accessing company specific repositories etc. 
"""
"""
################################################################################

import getopt
import glob
import http.client
import json
import os
import sys
import threading
import time
from pathlib import Path

from autobahn.asyncio.websocket import (WebSocketServerFactory,
                                        WebSocketServerProtocol)
from bottle import get, post, redirect, request, run, static_file, template
from dotenv import load_dotenv

try:
    import win32api
except ImportError:
    pass

@get('/')
################################################################################
def home():
    """
    """
    return redirect('/client/index.html')

@get('/client/<name>')
################################################################################
def static(name):
    """
    """
    return static("", name)

@get('/client/<_dir>/<name>')
################################################################################
def static(_dir, name):
    """
    """
    return static_file(name, root = "../client/" + _dir)

################################################################################
################################################################################
class webserver_thread(threading.Thread):
    """
    """
    ############################################################################
    def __init__(self, port):
        """
        """
        super(webserver_thread, self).__init__()
        self.__port = port

    ############################################################################
    def run(self):
        """
        """
        run(host="0.0.0.0", port = self.__port)
 

################################################################################
################################################################################
class MyWebsocket(WebSocketServerProtocol):
    """
    """


    ############################################################################
    def onConnect(self, request):
        """
        """
        self.actions = {
        'get-drives'      : self.get_drives,
        'get-dir'         : self.get_dir,

        'get-base'        : self.get_base,
        'load-file'       : self.load_file,
        'bt-load-ga'      : self.bt_load_ga,
        'bt-load-ga-main' : self.bt_load_ga_main,
        'bt-load-log'     : self.bt_load_log,
        'bt-save-ga'      : self.bt_save_ga,
        'save'            : self.save,
        'check-roundtrip' : self.check_roundtrip,
        'load-mongo'      : self.load_mongo}


        self.actions['default']         = self.default   # for documnetation
        print("Websocket connection established", request)

    ############################################################################
    def onMessage(self, payload, isBinary):
        req = json.loads(payload.decode('utf8'))
        print("MyWebsocket::onMessage, got a message", req,request)
        action = self.actions.get(req["type"], self.default)
        action(req)

    ############################################################################
    def onClose(self, wasClean, code, reason):
        """
        """
        print("Websocket connection closed")
    #----------------------------------------------------------------------------
    def default(self, req):
        pass
    #----------------------------------------------------------------------------
    def get_drives(self, req):
        ret = []
        try:
            drives = win32api.GetLogicalDriveStrings()
            drives = drives.split('\000')[:-1]
            for drive in drives:
                ret.append({"type" : "dir", "name" : drive, "path" : drive})
        except Exception as e:
            ret = [{"type" : "dir", "name" : "/", "path" : "/"}]
        ret = {"type" : "browser" + str(req["browsercnt"]), "files" : ret}
        self.sendMessage(json.dumps(ret), False)

    #----------------------------------------------------------------------------
    def get_dir(self, req):
        p = None
        files = []
        ret = []
        try:
            if os.path.exists(req["path"]) and os.path.isdir(req["path"]):
                p = req["path"]
            elif os.path.isfile(req["path"]):
                p = os.path.split(req["path"])[0]
            elif os.path.exists(os.path.split(req["path"])[0]):
                p = os.path.split(req["path"])[0]
            if p is not None:
                files = glob.glob(p + "/*")
            for file in files:
                f = {}
                if os.path.isfile(file):
                    f["type"] = "file"
                elif os.path.isdir(file):
                    f["type"] = "dir"
                f["path"] = os.path.normpath(file)
                f["name"] = os.path.split(file)[1]
                ret.append(f)
        except Exception as e:
            print("get-dir exception: " + str(e))
        self.sendMessage(json.dumps({"type" : "browser" + str(req["browsercnt"]), "files" : ret}), False)

    #----------------------------------------------------------------------------
    def get_base(self, req):
        print("DBG Server Base Dir requested ",req)
        cwd = os.getcwd()
        self.sendMessage(json.dumps({"type" : "base-path", "data" : cwd}).encode('utf_8'))

    #----------------------------------------------------------------------------
    def load_file(self, req):
        #print("DBG tryimg to load file")
        try:
            with open(req["path"]) as fp:
                d = json.load(fp)
            self.sendMessage(json.dumps({"type" : "file", "data" : d}).encode('utf_8'))
        except IOError:
            print("File not found: " + os.path.dirname(os.path.abspath(__file__)) + "/" + req["path"])
            # throw e
    #----------------------------------------------------------------------------
    def bt_load_ga(self, req):
        #print("Websocket: ",repr(req))
        try:
            with open(req["path"]) as fp:
                d = fp.read()
            #print("WebSockwet::onMessage trying to send ",d)
            self.sendMessage(json.dumps({"type" : "ga-text", "data" : d}).encode('utf_8'))
        except IOError:
            print("GA-File not found: " + os.path.dirname(os.path.abspath(__file__)) + "/" + req["path"])
            # throw e
    #----------------------------------------------------------------------------
    def bt_load_ga_main(self, req):
        #print("Websocket: ",repr(req))
        try:
            with open(req["path"]) as fp:
                d = fp.read()
            print("WebSockwet::onMessage trying to send main file",req["path"])
            self.sendMessage(json.dumps({"type" : "ga-main", "data" : d,"filename":os.path.basename(req["path"])}).encode('utf_8'))
        except IOError:
            print("GA-File not found: " + os.path.dirname(os.path.abspath(__file__)) + "/" + req["path"])
            #  throw e
    #----------------------------------------------------------------------------
    def bt_load_log(self, req):
        #print("Websocket: ",repr(req))
        try:
            print("WebSockwet::onMessage trying to send ",req["path"])
            with open(req["path"]) as fp:
                    logdata = fp.read()
                    #print("WebSockwet::onMessage trying to send ",d)
                    chunksize = 32*1024*1024 # Max IPC Message size due to Mozilla chrash
                    loglen = len(logdata)
                    chunks = [logdata[i:i+chunksize] for i in range(0, loglen, chunksize)]
                    for nr,chunk in enumerate(chunks):
                            print(f"WebSockwet::onMessage bt-load-log trying to send chunk {nr} ")
                            self.sendMessage(json.dumps({"type" : "bt-log-part",
                                                            "data" : chunk,
                                                            "chunkid":nr,
                                                            "filename":os.path.basename(req["path"])
                                                        }).encode('utf_8'))
                    print(f"WebSockwet::onMessage bt-load-log all chunks sent ")
                    self.sendMessage(json.dumps({"type" : "bt-log-complete",
                                                            "filename":os.path.basename(req["path"]),
                                                            "formatid":1 #BT CSV fixed width format for now. for IDs, see client::FileFormats.js
                                                        }).encode('utf_8'))
                    print("WebSockwet::onMessage bt-load-log completion confirmed")
        except IOError:
            print("GA-File not found: " + os.path.dirname(os.path.abspath(__file__)) + "/" + req["path"])
            # throw e

    #----------------------------------------------------------------------------
    def bt_save_ga(self, req):     # TODO this is an inherently bad idea, we really need a data base
        print("Trying to save ",req["path"])
        gaText = req["gatext"]
        fname  = req["path"]
        try:
                with open (fname,"w") as f:
                        f.write(gaText)
                respStr = "Saved OK"
        except:
                respStr += "Error writing GA to " + fname + ".txt\n"
                self.sendMessage(json.dumps({"type": "bt-save-resp", "message": str(respStr)}).encode('utf_8'))

    #----------------------------------------------------------------------------
    def save(self, req):
            saveDir = "../../../resources/db/"
            gaJson = json.loads(req["gaJson"])
            fileName = gaJson["file"]
            respStr = ""

            with open(saveDir + fileName +'.txt', "w") as f:
                try:
                    f.write(req["gaRaw"])
                    f.close()
                    respStr += "GA data successfully written to " + fileName + ".txt\n"
                except:
                    respStr += "Error writing GA to " + fileName + ".txt\n"

            with open(saveDir + fileName +'.json', "w") as f:
                try:
                    f.write(req["gaJson"])
                    f.close()
                    respStr += "GA data successfully written to " + fileName + ".json\n"
                except:
                    respStr += "Error writing GA to " + fileName + ".json\n"
            self.sendMessage(json.dumps({"type": "save-resp", "message": str(respStr)}).encode('utf_8'))

    #----------------------------------------------------------------------------
    def check_roundtrip(self, req):
        self.sendMessage(json.dumps({"type": "resp-roundtrip"}).encode('utf_8'))

    #----------------------------------------------------------------------------
    def load_mongo(self, req):
        capture_jsondiff = self.capture_get(req["id"])
        self.sendMessage(json.dumps({"type" : "file", "data" : capture_jsondiff}).encode('utf_8'))
    #-----------------------------------------------------------------------------
    def capture_get(self,id):
        """
        Get capture data
        """
        if id == "undefined":
            print("The id is " + str(id))
            return {}
        else:
            print("Trying to connect to Treo")
            treo = http.client.HTTPConnection("ilab3_utv_tools", 8080)
            treo.request("GET", "/api/capture?id=" + id)
            response = treo.getresponse()
            if response.status == 200:
                print("Got response 200")
                data = response.read()
                data = json.loads(data)
                treo.close()
                return data
            else:
                print("Got response " + str(response.status))
                treo.close()
################################################################################
if __name__ == "__main__":
    """ Start the websocket """
    websocket_port = 4001
    try:
        import asyncio
    except ImportError:
        import trollius as asyncio
    loop = asyncio.get_event_loop()

    factory = WebSocketServerFactory("ws://127.0.0.1:" + str(websocket_port))
    factory.protocol = MyWebsocket
    coro = loop.create_server(factory, '0.0.0.0', websocket_port)
    server = loop.run_until_complete(coro)

    #os.spawnl(os.P_NOWAIT, 'python','./auto_updater.py')
    try:
        print("The websocket is up'n'running on port " + str(websocket_port) + "...")
        loop.run_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.close()
        loop.close()
