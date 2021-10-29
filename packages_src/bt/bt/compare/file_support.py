#-----------------------------------------------------------------------------------------------------------
def load_ascii_csv_to_jsondiff(fname,timebase = -1):
#-----------------------------------------------------------------------------------------------------------
    '''
    Loads a DCUTerm DAT file that has been converted to ASCII csv.
    The format assumes an optial header file with less columns than two, next row is 
    the name of the signals separated by space(s). First column must be TIME
    any preceeding ' characters are removed. 
    The timeline goes from first sample, to last sample in the file. Only first value and changes in the signal 
    are stored. The last point is always the last point in the log file. 
    ARGUMENTS:
    fname - path to TXT file. 
    timebase - if 0 the time is untouched. -1 means start at zero. 
    
    RETURNS:
    The logfile in the JSONDiff compressed format as used in Napkin.
    {
    "Signal_1":{
        "pretty_print":"Sig1",
        "newName":"Sig1",
        "xAxis":[-0.010000000009313226,62.820000000006985,131.48000000001048,150,259.47000000000116],
        "values":[0,16.666666666666664,-2.7777777777777777,2,0] 
        },
    "Signal_2":{
        "pretty_print":"Sig2",
        "newName":"Sig2",
        "xAxis":[-0.010000000009313226,62.820000000006985,131.48000000001048,150,259.47000000000116],
        "values":[0,16.666666666666664,-2.7777777777777777,2,0] 
        },
    "TimeStamps":{}
    },
    
    '''
     
    signals = [] # First is time...
    with open(fname, 'r') as f:
        # Read header, format 1 or 2 ? 
        h1 = f.readline().split()
        if len(h1)< 2:                 #New format has extra line
            h1 = f.readline().split()  #Use New format
        
        #Create signal structures for each signal even the TIME signal to keep the column count
        for s in h1:
            if s=='TIME':
                continue
            s = s.replace("'","")
            sig_entry = {'newName':s,
                         'pretty_print':s,
                         'values':[],
                         'xAxis' :[]}
            signals.append(sig_entry)
           
        lines = f.readlines()
          
        for l in lines:
            fields = l.split()
            if timebase < 0:
                timebase = float(fields[0])
                ts = 0
            else:
                ts = float(fields[0]) - timebase
            for i,s in enumerate(fields):
                s = float(s)
                if i == 0:
                    continue # skip TIME
                sig = signals[i-1]
                if len(sig['xAxis']) == 0:
                    sig['xAxis'].append(ts)
                    sig['values'].append(s)
                else:
                    if sig['values'][-1:][0] != s:
                        sig['xAxis'].append(ts)
                        sig['values'].append(s)
        # Finally, we need to make sure that we stretch the timeline for all signals. 
        # Some signals may end in the middle, not changing until end of time. 
        ret = {}
        for i,sig in enumerate(signals):
            lastelement = len(sig['xAxis']) - 1
            if lastelement < 0:
                continue                    # if the file has no points at all.
            
            # if the file has only one point, 
            # we need to add an element
            if len(sig['xAxis']) > 1:
                if sig['xAxis'][lastelement] < ts:
                    sig['xAxis'][lastelement] = ts
            else:
                sig['xAxis'].append(ts)
                sig['values'].append(sig['values'][lastelement])
                                
            #Finally, the format is actyally "signal_1:{},signal_n{}"    
            ret["Signal_" + str(i)] = sig
            ret["TimeStamps"] = {}
        return ret