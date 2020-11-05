################################################################################
# Scania (C) 2017
# File: server.py
# Date: 2017-09-18
# Version:
# Author: tguc8n
################################################################################
# Purpose:
"""
"""
################################################################################

from autobahn.asyncio.websocket import WebSocketServerProtocol, WebSocketServerFactory
from bottle import get, post, run, template, request, redirect, static_file
import threading
import json
import time
import os, sys, getopt
import glob
import http.client
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
def capture_get(id):
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
################################################################################
class MyWebsocket(WebSocketServerProtocol):
    """
    """

    ############################################################################
    def onConnect(self, request):
        """
        """
        print("Websocket connection established")

    ############################################################################
    def onMessage(self, payload, isBinary):
        """
        """
        response = json.loads(payload.decode('utf8'))

        if response["type"] == "get-drives":
            ret = []
            try:
                drives = win32api.GetLogicalDriveStrings()
                drives = drives.split('\000')[:-1]
                for drive in drives:
                    ret.append({"type" : "dir", "name" : drive, "path" : drive})
            except Exception as e:
                ret = [{"type" : "dir", "name" : "/", "path" : "/"}]
            ret = {"type" : "browser" + str(response["browsercnt"]), "files" : ret}
            self.sendMessage(json.dumps(ret), False)
        elif response["type"] == "get-dir":
            p = None
            files = []
            ret = []
            try:
                if os.path.exists(response["path"]) and os.path.isdir(response["path"]):
                    p = response["path"]
                elif os.path.isfile(response["path"]):
                    p = os.path.split(response["path"])[0]
                elif os.path.exists(os.path.split(response["path"])[0]):
                    p = os.path.split(response["path"])[0]
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
            self.sendMessage(json.dumps({"type" : "browser" + str(response["browsercnt"]), "files" : ret}), False)
        elif response["type"] == "load-file":
            try:
                with open(response["path"]) as fp:
                    d = json.load(fp)
                self.sendMessage(json.dumps({"type" : "file", "data" : d}).encode('utf_8'))
            except IOError:
                print("File not found: " + os.path.dirname(os.path.abspath(__file__)) + "/" + response["path"])
#                 throw e
        elif response["type"] == "save":
            saveDir = "../../../resources/db/"
            gaJson = json.loads(response["gaJson"])
            fileName = gaJson["file"]
            respStr = ""

            with open(saveDir + fileName +'.txt', "w") as f:
                try:
                    f.write(response["gaRaw"])
                    f.close()
                    respStr += "GA data successfully written to " + fileName + ".txt\n"
                except:
                    respStr += "Error writing GA to " + fileName + ".txt\n"

            with open(saveDir + fileName +'.json', "w") as f:
                try:
                    f.write(response["gaJson"])
                    f.close()
                    respStr += "GA data successfully written to " + fileName + ".json\n"
                except:
                    respStr += "Error writing GA to " + fileName + ".json\n"
            self.sendMessage(json.dumps({"type": "save-resp", "message": str(respStr)}).encode('utf_8'))
        elif response["type"] == "check-roundtrip":
            self.sendMessage(json.dumps({"type": "resp-roundtrip"}).encode('utf_8'))
        elif response["type"] == "load-mongo":
            capture_jsondiff = capture_get(response["id"])
            self.sendMessage(json.dumps({"type" : "file", "data" : capture_jsondiff}).encode('utf_8'))
        # elif response["type"] == "parse-tree-ga":
        #     print("NEW PARSE TREE: " + response["parseTree"])
        #
        #     try:
        #         parser = GAParser()
        #         gaJson = json.loads(response["parseTree"])
        #         print("CONFIG: " + parser.extractConfig(gaJson["config"]))
        #
        #         #TODO: TEMP solution
        #         self.sendMessage(json.dumps({"type": "invalid-config", "value": "[signal, signal2]"}).encode('utf_8'))
        #     except KeyError:
        #         print("No config")

    ############################################################################
    def onClose(self, wasClean, code, reason):
        """
        """
        print("Websocket connection closed")

################################################################################
class GAParser:

    #############################################################################
    def extractConfig(self, expr):
        try:
            firstKey = next(iter(expr.keys()))

            if firstKey in ["and", "or"]:
                return "(" + self.extractConfig(expr[firstKey][0]) + " " + firstKey + " " + self.extractConfig(expr[firstKey][1]) + ")"
            elif firstKey == "is":
                return self.extractConfig(expr[firstKey][0])
            else:
                return "(" + expr["lhs"] + " " + expr["operator"] + " " + expr["rhs"] + ")"
        except KeyError:
            return "key_error"

################################################################################
if __name__ == "__main__":
    """ Start the webserver thread, but only if the development option (-d) is not supplied """
    try:
        opts, args = getopt.getopt(sys.argv[1:], "d")
        if not opts:
            webserverthread = webserver_thread(50001)
            webserverthread.start()
    except getopt.GetoptError:
        print("WARN: The option was not recognized. Please, relaunch as: \"python server.py\" (both websocket and server threads) OR \"python server.py -d\" (only websocket)")

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

    try:
        print("The websocket is up'n'running on port " + str(websocket_port) + "...")
        loop.run_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.close()
        loop.close()
