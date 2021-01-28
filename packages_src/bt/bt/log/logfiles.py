import os
import sys

from .bt_time import SAGATime


#---------------------------------------------------------------------------------
#-----------------------------   get_log_files -----------------------------------
#---------------------------------------------------------------------------------   
def get_log_files(basedir):
    logs = os.listdir(basedir)
    logfiles = [basedir + "/" + x for x in logs if "LOGDATA" in x and "TXT" in x]
    return logfiles

#---------------------------------------------------------------------------------
#------------------------   decode_log_filename ----------------------------------
#---------------------------------------------------------------------------------   
def decode_log_filename(path, dual = False):
    lfname = os.path.basename(path)
    fields = lfname.split('_')    
    res = {
           'rel':fields[0], # base + field now distinguish a session
           'mut':fields[1],
           'frc':fields[2],
           'tc' :fields[6],
           'mutation':"_".join(fields[0:3]),
           'tc_res':fields[3],
           'session':"_".join([fields[4],fields[5]])
    }
    if dual:
        m1 = res['mut']
        m2 = res['frc']
        job = deco
    return res

#---------------------------------------------------------------------------------
#                               format_session  
#---------------------------------------------------------------------------------
def format_session(session):
    '''
    Instead of having the files in a proper data base, we hide the info in the file name for now:
    '''
    return f"[{session[0:4]}-{session[4:6]}-{session[6:8]} {session[9:11]}:{session[11:13]}]" 
 
#---------------------------------------------------------------------------------
#                               format_session  
#---------------------------------------------------------------------------------
def restore_session_time(grp):
    '''
        Given a set of logfiles (with a session field as 20200522_103606_00
        the function finds the first time (the test case that was executed first)
        and sets the other test cases to the same time as it would show in the 
        original session with all test cases.
    '''
    grp['session'] = grp['session'].map(lambda x: SAGATime(x).to_py_datetime())
    first = min(grp['session'].values)

    grp['session'] = first
    return grp
