import time
import sys
import os

from bt.report.overview     import update_all_analysis_views
from bt.evaluator           import evaluate_current_ga_set_and_current_log_set  
from bt.report.allsessions  import update_overall_analysis_view
from bt.global_defaults     import default_ga_dir, overview_output

#----------------------------------------------------------------------------------------------
#                                        update 
#----------------------------------------------------------------------------------------------
def update(ga):
    print(f"This G/A was changed: {ga}")
    res2 = evaluate_current_ga_set_and_current_log_set()    
    update_all_analysis_views(res2, overview_output)       
    update_overall_analysis_view(res2, overview_output)
    return

#----------------------------------------------------------------------------------------------
#                                        main 
#----------------------------------------------------------------------------------------------
if __name__ == '__main__':
    print("Starting automatic update server loop")
    
    filetimes = []
    do_run = True

    ga_files = os.listdir(default_ga_dir)
    ga_files   = [default_ga_dir + "/" + x for x in ga_files if  "txt" in x]

    # Remember modification time stamps for watched G/As
    for ga in ga_files:
        mt = os.stat(ga).st_mtime
        filetimes.append({'ga':ga,'mt':mt})
        
    update("Initial Update")    

    while do_run:
        time.sleep(1)
        for g in filetimes:
            mt = os.stat(g['ga']).st_mtime
            if (mt != g['mt']):
                update(g['ga'])
                g['mt'] = mt