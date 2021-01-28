import datetime
import json
import os
import re
import sys
 
import matplotlib.pyplot as plt
import pandas as pd

#Backw compatiblitity
if __name__ == '__main__':
    from bt.log.logfiles import get_log_files,decode_log_filename, format_session 
    from bt.multi_process_apply import mass_eval  
    from bt.multi_process_apply import run_one_log_eval
    from bt.report.common import relative_url   
    from bt.drs.req_tc_map import mandatory_req

    from bt.log.bt_time import SAGATime

    from bt.global_defaults import default_main_defs, \
                                default_ga_motor,  \
                                default_main_defs, \
                                default_log_dir,   \
                                default_ga_dir ,\
                                default_ga_motor, \
                                default_server_path

else:
    from .log.logfiles import get_log_files, decode_log_filename, format_session
    from .multi_process_apply import mass_eval  
    from .multi_process_apply import run_one_log_eval
    from .report.common import relative_url
    from .drs.req_tc_map import mandatory_req

    from .log.bt_time import SAGATime

    from .global_defaults import default_main_defs, \
                                default_ga_motor,  \
                                default_main_defs, \
                                default_log_dir,   \
                                default_ga_dir ,\
                                default_ga_motor, \
                                default_server_path
 
main_definitions = default_main_defs  
gaMotor = default_ga_motor 
#---------------------------------------------------------------------------------
#                                 expand_ga_rows  
#---------------------------------------------------------------------------------
def expand_ga_rows(row):
    try:      
        res = []
        t = row[[c for c in row.index if c != "gas"]].to_dict()
        lfinfo = decode_log_filename(row['log_file'])
        url = 'http://localhost:8080/?'
        url += 'log='  + relative_url(default_server_path, default_log_dir + "/" + row['log_file'])
        url += '&main='+ relative_url(default_server_path, main_definitions)
        url += "&ga="  + relative_url(default_server_path, default_ga_dir + "/" + row['ga_file'])
        t['url'] = url
        t['req'] = row['ga_file'][:23]
        t.update(lfinfo)
        for ga in row.gas:
            r = t.copy()
            r.update(ga)
            res.append(r)
    except Exception as e: # The mutation run cannot eval this one due to missing signal
         if row.ga_file != 'SR_C30_SRS_Safe-REQ-253.txt':
            print("evaluator::expand_ga_row:: Exception ",e)
            print(row.to_dict()) 
            print("----------------------------------------------")  
    return res

#---------------------------------------------------------------------------------
#                               transform_row  
#---------------------------------------------------------------------------------
def transform_row(row):
      #if row['tc'] == 'TC-DriveBrake-S-068' and row['req'] =='SR_C30_SRS_Safe-REQ-246':
      #      print (row)#['rel'],row['times'])
      
      guards = row['guards']
      res = "-"
      passes = row['passes'] 
      if len(passes) >0:
        res = "P"
        
      fails = row['fails']
    
      if len(fails) >0:
        res = "F"
        #print (fails)
      eval = "{}-{}-{}".format(len(guards),len(passes),len(fails))
      if mandatory_req(row['req'],row['tc']):
            res = "[{}]".format(res)
            eval = "[{}]".format(eval)
      if len(guards) > 0 and len(guards) == len(passes) and len(fails) > 0:
            eval = eval + "*" 
      
      drow = row.to_dict()
    
      drow.update({'ga':row['name'][len('SR_C30_SRS_Safe-'):],
                   'res':res + "@" + row['url'],
                   'ga_res':res,
                   'eval':eval
                       })
      return pd.Series(drow)
       
#---------------------------------------------------------------------------------
#                               restore_session_time  
#---------------------------------------------------------------------------------
def restore_session_time(grp):
    grp['session'] = grp['session'].map(lambda x: SAGATime(x).to_py_datetime())
    first = min(grp['session'].values)

    grp['session'] = first
    return grp

#---------------------------------------------------------------------------------
#-                        consolidate_guard_results 
#---------------------------------------------------------------------------------
def consolidate_guard_results(row):
    '''
    from new format (fails,passes,guards) (all in "parallel")
    this func collects corresponding fails and passes to each guards
    guard1=>{passes,fails},...,guardn=>{passes,fails}
    Makes it easier to draw and analyze the results

    NOTE:
    Only works for failed and not for events yet! Some event guars also slips through...
    EXAMPLE

        from evaluator import evaluate_current_ga_set_and_current_log_set
        from evaluator import consolidate_guard_results
        res = evaluate_current_ga_set_and_current_log_set() 
        expanded = res.apply(consolidate_guard_results, axis = 1)
        del(res)
    OUTPUT
        {'ga_file': 'SR_C30_SRS_Safe-REQ-349.txt',
        'log_file': '3_200_0_Passed_20200522_103545_TC-DriveBrake-S-016_SoftCCU_LOGDATA_20200522_103606_00.TXT',
        'status': 'OK',
        'url': 'http://localhost:8080/?log=......./SR_C30_SRS_Safe-REQ-349.txt',
        'req': 'SR_C30_SRS_Safe-REQ-349',
        'rel': '3',
        'mut': '200',
        'frc': '0',
        'tc': 'TC-DriveBrake-S-016',
        'mutation': '3_200_0',
        'tc_res': 'Passed',
        'session': Timestamp('2020-05-22 09:07:35'),
        'where': True,
        'name': 'SR_C30_SRS_Safe-REQ-349',
        'signals': ['MWT.TC_BO_oCCUOMToCCUS.TC_BO_CCUS_S_CcuoEmBr_Patched',
                    'MWT.TC_BI_iCCUS_AToCCUO.R2M28s1Out2_SC_NoTcmsEmBr',
                    'MWT.TC_BI_iCCUS_AToCCUO.TC_BI_CCUS_S_CcuoEmBr',
                    'MWT.TC_BI_iCCUS_AToCCUO.TC_BI_CCUS_S_NoSafEmBr'],
        'guards': [[102.77500001220324, 105.77500001279986]],
        'passes': [[102.95000001216249, 105.77500001279986]],
        'fails':  [[102.77500001220324, 102.95000001216249]],
        'ga': 'REQ-349',
        'res': 'F@http://localhost:8080/?log=../../....._SRS_Safe-REQ-349.txt',
        'ga_res': 'F',
        'eval': '1-1-1*',
        'exec': '3',
        'garesult': [{'guard': [102.77500001220324, 105.77500001279986],
                        'passes': [[102.95000001216249, 105.77500001279986]],
                        'fails': [[102.77500001220324, 102.95000001216249]]}],
        'gatype': 'State'}
    '''
    res = []
    try:
        G = row.guards.copy()
        if len(G)==0:
            row['garesult'] = {'guard':-123,
                                  'passes':[],
                                  'fails':[]}
            row['gatype'] = "Not Activated"
            #print(row.name,"===> Empty eval, cannot decide")
            return row
        P = row.passes.copy()
        F = row.fails.copy()    
        
        if not isinstance(G[0],list):
            #print("Skipping Events",G)
            for g in G:
                if len(P) > 0 :
                    p = P[0]
                else:
                    p = -100
                if len(F) > 0 :
                    f = F[0]
                else:
                    f = -100
                if abs(g-p) > abs(g-f):
                    res.append({'guard':g,'passed':False,'dist':f-g})
                    F = F[1:] 
                    continue
                else:
                    res.append({'guard':g,'passed':True,'dist':f-p})
                    P = P[1:] 
                    continue
            row['gatype'] = "Event"
            #print(row.name, "==>",row[['guards','passes','fails']])
            #print(res)
            return row
       
         
        while len(G)>0:
            g,G = G[0],G[1:]
            gs, ge = g
            passes = []
            fails = []
            while (len(P) > 0 and P[0][0] < ge) or  (len(F) > 0 and F[0][0] < ge):
                #As log as we have p or f within the guard
                  
                if len(P) > 0 and P[0][0] < ge :
                    passes.append(P[0])
                    P = P[1:]
                if len(F) > 0 and F[0][0] < ge :
                     fails.append(F[0])
                     F = F[1:]
            res.append({'guard':g,'passes':passes,'fails':fails})             
    except Exception as e:
            print("evaluator.py::consolidate_guard_results Exception: ",e)
            print(row.name,"===>",G)
            print(row.to_dict())
    # Merge the data again:
    row['garesult'] = res
    row['gatype'] = "State"
    return row


def parseargs():
    argdict = {}
    for a in sys.argv:
        try:
            key, val = a.split("=")
            argdict.update({key.strip(): val.strip()})
        except:
            pass
    return argdict
#---------------------------------------------------------------------------------
#---------------------------------   main ----------------------------------------
#---------------------------------------------------------------------------------
def evaluate_current_ga_set_and_current_log_set(  logdir = default_log_dir, gadir = default_ga_dir ,logs=None) : 
    
    res = []
    for ga in mass_eval(logdir = logdir, gadir = gadir ,logs = logs):
        res.extend(ga['row'])
    ds = pd.DataFrame(res)
    #ds.head(1)

    # Validation check:
    #logfiles = set(ds.log_file.values)
    #gafiles  = set(ds.ga_file)
    #print(f"LOGS:{len(logfiles)} GA:{len(gafiles)}")
    #print(f"Failed evaluations (should be 0) :{ len(ds[ds.status != 'OK'])}")
    ds = pd.DataFrame([item for sublist in ds.apply(expand_ga_rows,axis=1) for item in sublist]) 


    ds =  ds.apply(transform_row,axis=1)

    results = ds.groupby('rel').apply(restore_session_time)
    results['exec'] = results.mutation[0][0]

    return results

if __name__ == '__main__':
    args = parseargs()
    logdir = args.get('logs', default_log_dir)
    gadir  = args.get('gadir', default_ga_dir)
    print("----------------------------------")
    print("Evaluating logs in ", logdir)
    print("On gas in ",gadir)
    
    res =  evaluate_current_ga_set_and_current_log_set(logdir=logdir,gadir=gadir)
     
    if(args.get("save","")):
        fname = os.path.join(outdir, args['save'])
        evaldata = res.apply(consolidate_guard_results, axis = 1)
        evaldata.to_excel(fname)
