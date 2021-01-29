
import pandas as pd

import datetime
import re
import os
import json

from pprint import pprint
import sys
 
  
from ..log.logfiles import decode_log_filename, format_session

#---------------------------------------------------------------------------------
# ------------------------   Parameters and Globals ------------------------------
#---------------------------------------------------------------------------------

from ..global_defaults import default_server_path
from ..global_defaults import default_server_connection
  


ga_report_view_css = '''
.nicetable {
  font-family: "Trebuchet MS", Arial, Helvetica, sans-serif;
  border-collapse: collapse;
  width: 100%;
}

.nicetable td, #T_garesults th {
  border: 1px solid #ddd;
  padding: 8px;
}

.nicetable tr:nth-child(even){background-color: #f2f2f2;}

.nicetable tr:hover {background-color: #ddd;}

.nicetable th {
  padding-top: 12px;
  padding-bottom: 12px;
  text-align: left;
  
  color: black;
}

.nicetable .level1{text-align:center;}

.nicetable .col_heading {
 background-color: lightgreen;
}


'''
 
#---------------------------------------------------------------------------------
#                                 relative_url  
#---------------------------------------------------------------------------------

def relative_url(s1:str,s2:str):
    '''
    Creates a s2 path that is relative to s1
    (e.g s1 is the path of a websocketserver and 
     s2 is a file that you wish to retreive)
    '''
    s1 = [s for s in s1.split(os.path.sep) if len(s)>0]
    s2 = [s for s in s2.split(os.path.sep) if len(s)>0]
    lix = 0
    try:
        while s1[lix] == s2[lix]:
            lix = lix + 1
    except Exception as _e:
        raise RuntimeError(f"Path {s2} cannot be made relative to {s1} ")
    else:
        rel = os.path.sep.join(['..' for s in range(0,len(s1) - lix)])   + os.path.sep + os.path.sep.join(s2[lix:])
        return rel

def test_relative_url():
    server_path = '/Users/dfm01/Documents/aProjects/napkin/server'
    log =         '/Users/dfm01/Documents/aProjects/napkin/session/log/CXF1-2020-09-23_FrcEnPatched/2_200_0_Passed_20200923_120418_TC-DriveBrake-S-001_SoftCCU_LOGDATA_20200923_120439_00.TXT'    
    print(server_path +'/'+ relative_url(server_path,log))

def res_url_formatter(s:str)->str:
    if not "@" in str(s):
        return s

    res,url = s.split("@")
    #url.replace("&","ANDSIGN")
    #url = "http://www.mdh.se"

    
    td_data = f"<a href = {url}> <div><center> {res} </center></div></a>"
    return td_data

#from IPython.core.display import display, HTML
#display(HTML())


def highlight_results(cell):
    cell = str(cell) # some cells may contain numbers
    cls = ""
 
    if "> P <" in cell:
        cls = 'background-color: lightgreen'
    elif "> [P] <" in cell:
        cls = 'background-color: lightgreen; font-weight: bold;'
    elif "> F <" in cell:
        cls = 'background-color: red'
    elif "> [F] <" in cell:
        cls = 'background-color: red'
    elif "> [-] <" in cell:
        cls = 'background-color: yellow; font-weight: bold;'
    else:
        cls = ""
    return cls

if __name__ == '__main__':
    test_relative_url()