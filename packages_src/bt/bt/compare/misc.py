import matplotlib.pyplot as plt
import numpy as np
from  .testgenerators import generate_events 

#-----------------------------------------------------------------
def binsig_to_intervals(T = [4, 6, 7, 9, 10, 12],
                        V = [0, 0, 1, 0, 1, 1],
                        invert = False):
#-----------------------------------------------------------------
    res = []
    s = None
    if invert:
        on = 0
        off = 1
    else:
        on = 1
        off = 0
    for i,t in enumerate(T):
        if s == None and V[i] == on:
            s = t
            continue
        # interval has started already
        # but we are still inside it
        if s != None and V[i] == on:
            continue
        # We have started an interval
        # but it is now closing
        if s != None and V[i] == off:
            res.append([s,t])
            s = None
    if s != None:
        res.append([s,t])
    return res
#binsig_to_intervals()


#-----------------------------------------------------------------------------------------------------------
def left_trim_samples(S,t):
#-----------------------------------------------------------------------------------------------------------
    '''
    S - Signal - {'xAxis':[],'values':[]}
    t - time
    RETURNS
        Modified S whith samples where ts >= t
    '''
    #print("Incoming",S,t)

    if len(S['xAxis']) == 0 or S['xAxis'][-1:][0] < t:
        return S
    i=0
    for i,ts in enumerate(S['xAxis']):
        if ts >= t:
            break
    if ts == t:
        S['xAxis'] = S['xAxis'][i:]
        S['values']= S['values'][i:]
    else:
        S['xAxis'] = S['xAxis'][i-1:]
        S['values']= S['values'][i-1:]
        S['xAxis'][0]= t

    return S
#-----------------------------------------------------------------------------------------------------------
def right_trim_samples(S,t):
#-----------------------------------------------------------------------------------------------------------
    '''
     S - Signal - {'xAxis':[],'values':[]}
     t - time
     RETURNS
         Modified S whith samples where ts <= t
         adjust first sample to t
    '''

    finalsample = -1234
    length = len(S['xAxis'])
    if length > 0 and S['xAxis'][-1:][0] <= t:
        return S
    if length == 0:
        return S
    # else wind to one after the cut.
    for i,ts in enumerate(S['xAxis']):
        if ts > t:
            #finalsample = S['values'][i] #Next sample value.
            break
    if i > 0:
        #print(f"Cutting at t={t},ts={ts}=i={i}",S['xAxis'][:i])
        S['xAxis'] = S['xAxis'][:i]
        S['values']= S['values'][:i]
        if  S['xAxis'][-1:][0] != t: #We lack a tiny bit until cut-point (that has another value)
            #print("Last element is less than t")
            S['xAxis'].append(t)
            S['values'].append(S['values'][-1:][0]) 
    else:
        S['xAxis'] = []
        S['values']= []
        
    return S
#-----------------------------------------------------------------------------------------------------------
def right_left_trim_samples_unit_test():
#-----------------------------------------------------------------------------------------------------------
    # Unit tests for right and left trim
    # First we draw the complete signal (dotted line)
    # Then we cut the line at different lengths from both sides
    # If it works, all cuts should follow the original dotted line

    for trimfunc in [right_trim_samples,left_trim_samples]:   
        for n in range(1, 15):
            x = generate_events(20)
            y = [np.random.randint(2) for _i in x]
            print("t=",x)
            print("v=",y)
            cuts = []
            plt.step(x=x,y=y,ls="--",where='post',lw=5)


            for i in range(0,500):
                cut  = np.random.random()*max(x)*1.10
                cuts.append(cut)
                S = {'xAxis':x ,'values':y }
                S = trimfunc(S,cut)
                #print("       x=",x)
                #print("Result=",cut,S['xAxis'])
                #print()
                plt.step(x=S['xAxis'],y=S['values'],marker='o',where='post',alpha=0.3)
            plt.title(f"{trimfunc.__name__[:-8]}({cut}) y={y}")
            plt.xlabel(f"x={x}")
            plt.step(x=x,y=y,ls="--",where='post',lw=5)
            plt.show()
            print("Tested positions:",len(set(cuts)))
            
#-----------------------------------------------------------------------------------------------------------
def resample_signal(S,P):
#-----------------------------------------------------------------------------------------------------------
    '''
    #ported from javascript
    # The signal S is sampled at the points P.
    # The signals are already sampled at discrete points in time
    # given a signal as XY ( X = x-axis, Y = values)
    # resampling here means for each p in P:
    # a) pick Y[i]    -- there exists an i such that X[i] == p
    # b) pick Y[i -1] -- there exists an i such that i < len(Y) and
    #                     X[i -1] < p < X[i]
    # all points p : X[max] < p < X[0] are ignored.
    S - Signal - {'xAxis':[],'values':[]}
    P - Events -[] 
    RETURNS:
    A value list (with P as implicit xAxis)
    '''

    res  = [];
    # project one value for each point in P.
    #                  o_______
    #         o________|         |
    #         |                  |
    # S=   o----                  o --------------o
    # PC=x   x  x      x x    x    x             x
    j = 0;
    i = 0;
    xAxis = S['xAxis']
    if len(xAxis)==0:
        return []
    if len(P) == 0:
        return []
    
    
    while i < len(P):
        if P[i] < xAxis[0]:
            i = i + 1
            continue # Skip point left of S

        # Find the point closest to the right of p.
        while j < len(xAxis) and xAxis[j] < P[i]:
            j = j + 1

        if j >= len(xAxis):
           break; # Skip points right of S.

        if xAxis[j] == P[i]:
           res.append(S['values'][j]);
        
        else:
           res.append(S['values'][j - 1]);
        
        i = i + 1

    return res;
#------------------------------------------------------------------------------------------------------
def resample_signal_unitTest(): 
#------------------------------------------------------------------------------------------------------
    # S= signal, P is timeline for new samples.
    S = {'values':     [0,  5, -3,  9,  -3,  15,   0],
         'xAxis' :     [0, 20, 60, 80, 110, 130, 260]}
    S0 = {'values':    [],
         'xAxis' :     []}
    P = []
  
    P.append({'S'  : S0,
              'P'  : [1, 10, 20, 55, 61, 100, 131, 261],
              'exp': []}); 
    
    P.append({'S'  : S,
              'P'  : [],
              'exp': []});
    
    P.append({'S'  : S,
              'P'  : [1, 10, 20, 55, 61, 100, 131, 261],
              'exp': [0  ,0,  5,  5,   -3,  9, 15,]}); # Last point should have been cut off.
    
    P.append({'S'  : S,
              'P'  : [-1, 5, 21, 68, 131, 250],
              'exp': [0,  5, -3,  15, 15]});           # Is this correct? cut off left of zero?

    P.append({'S'  : S,
              'P'  : [-10,0, 0, 21, 68, 130, 260, 290],
              'exp': [0, 0,  5, -3,  15,   0]});

    
    for test in P:
       
        res = resample_signal(test['S'],test['P']);
        passed = True;
        if len(res) == len(test['exp']):
            for i,z in enumerate(res): #(var i = 0; i < res.length; i++) {   
                if res[i] != test['exp'][i]:
                    passed = False
                    break
        else:
            passed = False;
        if passed: 
            print("TearsParser2.js::resample_signal UnitTest [Passed] ") 
        else:
            print(test)
            print("TearsParser2.js::resample_signal UnitTest [Failed]      v  S = ", S['values'])
            print("TearsParser2.js::resample_signal UnitTest               x  S = ", S['xAxis'])
            print("TearsParser2.js::resample_signal UnitTest                  P = ", test['P'])

            print("TearsParser2.js::resample_signal UnitTest            result = ",res);
            print("TearsParser2.js::resample_signal UnitTest   expected result = ",test['exp'])

#resample_signal_unitTest()

# Trim timelines
#----------------------------------------------------------------------------------------------------
def get_timeline_clipping(X1,X2):
#----------------------------------------------------------------------------------------------------
    '''
    Given two timelines, they may overlap only 
    partially. This function reports the non overlapping
    regions (left and right)
    [] means that the signals are empty
    ARGUMENTS 
    X1 - timeline for signal 1
    X2 - timeline for signal 2

    RETURNS:
    LEFT 
    [from (including) this sample, up to but not including this sample]
    
    RIGHT
    [from (not incl) this sample, up to and including this sample]
    
    See example:
    # Given:
    X1=[1, 3, 7, 11, 12]
    X2=[2, 5]
    inf_1,inf_2 = clip_timelines(X1,X2)
    
    #RETURNS:
    
    #inf_1 = {'clip_l': [1, 2], 'clip_r': [5, 12]}
    #inf_2 = {'clip_l': [], 'clip_r': []}
    
    
    #NOTE
    # The clipping may be outside if they are not overlapping 
    # at all
    '''
    
    X1_info = {}
    X2_info = {}
    
    # If one of the timelines is empty
    # the other gets cut entirely
    if len(X1) == 0:
        x2s,x2e = X2[0], X2[-1:][0]
        X1_info['clip_l'] = []
        X2_info['clip_l'] = [x2s,x2e]
        X1_info['clip_r'] = []
        X2_info['clip_r'] = [x2s,x2e]
        return X1_info,X2_info
 
    if len(X2) ==0:
        x1s,x1e = X1[0], X1[-1:][0]
        X2_info['clip_l'] = []
        X1_info['clip_l'] = [x1s,x1e]
        X2_info['clip_r'] = []
        X1_info['clip_r'] = [x1s,x1e]
            
        
    # Both timeline have at least one element 
    # Getting boundaries of both timelines
    x1s,x1e = X1[0], X1[-1:][0]
    x2s,x2e = X2[0], X2[-1:][0]
    
    if x1e < x2s or x2e < x1s:
        raise ValueError("Signals are not overlapping at all")
    if x1s > x2s:
        X1_info['clip_l'] = []
        X2_info['clip_l'] = [x2s,x1s]
    elif x1s < x2s:
        X2_info['clip_l'] = []
        X1_info['clip_l'] = [x1s,x2s]
    else: 
        X1_info['clip_l'] = []
        X2_info['clip_l'] = []
   
    if x2e > x1e:
        X1_info['clip_r'] = []
        X2_info['clip_r'] = [x1e,x2e]
    elif x2e < x1e:
        X2_info['clip_r'] = []
        X1_info['clip_r'] = [x2e,x1e]
    else: 
        X1_info['clip_r'] = []
        X2_info['clip_r'] = []
        
    return X1_info,X2_info


#----------------------------------------------
def get_timeline_clipping_unit_test():
#----------------------------------------------
    for x in range(0,4):  
        plt.subplots(figsize=(4,1))
        X1 = generate_events(np.random.randint(10))
        X2 = generate_events(np.random.randint(10))
        
        plt.step(x=X1,y=[1 for _y in X1],marker='x',ls="--",where='post',lw=1,color='black')
        plt.step(x=X2,y=[2 for _y in X2],marker='x',ls="--",where='post',lw=1,color='black')
        
        #X1 = [x + 15 for x in X1] #Make them non overlapping to test that as well (should raise exception)
        print(f"X1 = {X1}")
        print(f"X2 = {X2}")
        X1_info,X2_info = get_timeline_clipping(X1,X2)
      
        print(f"X1 = {X1_info}")
         
        plt.yticks([1,2]) 
        plt.gca().set_yticklabels(['X1','X2'])
        print(f"X1 = {X2_info}")
        plt.ylim([0,3])
        plt.show()
        #display("-------------------------------------------------------------")
#get_timeline_clipping_unit_test()


#----------------------------------------------------------------------------------------------------------------
def project_on_timeline(X1,V1,common_timeline):
#----------------------------------------------------------------------------------------------------------------

        ix1 = 0
        ix2 = 0
        res = []
        
        lasty = None
       
        for t in common_timeline:
            # add None values until this timeline starts
            #     or between end and the end of the common time line
            if t < X1[0] or t > X1[-1:][0] or ix1==len(X1):
                res.append(None)
                continue
            # Now we know t is within the signal timeline

            #Right on spot
            if t == X1[ix1] :
                res.append(V1[ix1])
                ix1 = ix1 + 1
                continue   

            while ix1 < len(X1) and t > X1[ix1]:
                print(f"t={t},X1[ix1]={X1[ix1]}, X1[:ix1]={X1[:ix1]} , t < X1[ix1]={t < X1[ix1]}")
                ix1 = ix1 + 1

            # ix1 is either at end or at the sample 
            # after the one we are interested in

            res.append(V1[ix1-1])
            
        return res
#----------------------------------------------------------------------------------------------------------------
def compare_signals_raw(X1,V1,X2,V2,operator="=="):    
#----------------------------------------------------------------------------------------------------------------
    
    
    # CASE 1 both signal are empty
    if len(X1)==0 and len(X2)==0:
        # raise exception ?
        raise ValueError("Both signals are empty ")
    if len(X1)==0:
        # operator == --> false during whole X2 ? 
        # operator != --> true during whole X2 ?   NEEDS DISCUSSION...
        raise ValueError(f"X1={X1} is empty, and X2={X2}")
    if len(X2)==0:
        # operator == --> false during whole X1 ? 
        # operator != --> true during whole X1 ?   NEEDS DISCUSSION...
        raise ValueError(f"X2={X2} is empty, and X1={X1}")
        
    # CASE 2 both signals non empty and completely non-overlapping
    x1s,x1e = X1[0], X1[-1:][0] 
    x2s,x2e = X2[0], X2[-1:][0] 
    
    if x1e < x2s or x2e < x1s:
        raise ValueError(f"Signals are not overlapping at all {X1},{X2}")
    
    # CASE 3 
    # Create common timeline. 
    common_timeline = sorted(list(set(X1 + X2)))
     
    #common_timeline
    V1c = project_on_timeline(X1,V1,common_timeline)
    V2c = project_on_timeline(X2,V2,common_timeline)
    
    #Construct the result by iterating the common timeline
    # ignoring any None entries
    cc = []
    vv = []
    for i,t in enumerate(common_timeline):
        if V1c[i]==None or V2c[i]==None:
            continue
        cc.append(t)
        vv.append(int(V1c[i] == V2c[i]))
    
    return {'common_timeline':common_timeline,
           'xAxis':cc,
           'values':vv}



#----------------------------------------------------------------------------------------------------------------
def compare_signals_raw_unit_test():
#----------------------------------------------------------------------------------------------------------------
    for i in range(0,10):
        log = generate_test_log()
        #display(log)

        X1 = log['Signal_0']['xAxis']
        X2 = log['Signal_1']['xAxis']
        #V1 = np.arange(0,len(X1)) #
        V1 = log['Signal_0']['values']
        V2 = log['Signal_1']['values']


        # Deal with empty signals
        # If len(X1) == 0 or len(X2) == 0

        # Sharpen the test,skipping lines starting at the same point 
        if X1[0]==X2[0]:
            continue
        #X1=[] 
        #X2=[]#[x - 15 for x in X1] # Now testing completely non-overlapping signals

        print(f" X1={X1}, V1={V1}")
        print(f" X2={X2}, V2={V2}")

        res = compare_signals_raw(X1,V1,X2,V2,"==")
        common_timeline = res['common_timeline']
        cc = res['xAxis']
        vv = res['values']

        print("RES cc",cc)
        print("RES vv",vv)

        #clp1,clp2  = get_timeline_clipping(X1,X2)
        plt.step(x=cc,y=np.array(vv) + 2.2,marker='x',ls="-",where='post',lw=5,color='black',alpha=0.3)
        #plt.step(x=X2,y=np.array(V2) + 1.2,marker='x',ls="--",where='post',lw=1,color='black')
       
        ax = plt.gca()

        res_i = binsig_to_intervals(cc,vv,invert=False)
        for s,e in res_i:
            rect = patches.Rectangle((s, 4), e-s, 1, linewidth=1, edgecolor='none', facecolor='green')
            ax.add_patch(rect)

        res_i = binsig_to_intervals(cc,vv,invert=True)
        for s,e in res_i:
            rect = patches.Rectangle((s, 4), e-s, 1, linewidth=1, edgecolor='none', facecolor='red')
            ax.add_patch(rect)

        plt.step(x=X1,y=np.array(V1)+1,marker='o',where='post',lw=2,alpha=0.5)
        plt.step(x=np.array(X2)+0.1,y=np.array(V2)+1.05,marker='o',where='post',lw=2,alpha=0.5)
        plt.title(f"X1={X1},V1={V1}")
        plt.xlabel(f"X2={X2},V2={V2}")

        plt.show()


#----------------------------------
def sum_intervals(R):
#----------------------------------

    sum = 0
    for s,e in R:
        sum += e-s
    return sum