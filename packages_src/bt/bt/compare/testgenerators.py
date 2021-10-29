import numpy as np
# From http://localhost:8890/notebooks/DRS_Mutation/Tears-operator-regression-test.ipynb

def generate_events(n = 3,unique = True):
    
    i = np.random.randint(5)
    res = [i]
    while len(res)<n:
        while i == res[-1:][0]:
            i += np.random.randint(5)
        res.append(i)
        n = n -1
    if unique:
        return sorted(set(res))
    else:
        return res 
#-----------------------------------------------------------------------------------------------------------
def generate_test_signal(name="Signal_1",newname="MWT_x",vrange=[-10,10],xrange=[0,5],invfreq=0.250):
#-----------------------------------------------------------------------------------------------------------
    '''
    S = generate_test_signal()['Signal_1']
    #display(S)
    plt.step(x=S['xAxis'],y=S['values'],marker='o',where='post',alpha=0.3)
    '''
    xAxis = [x / 100.0 for x in range(xrange[0]*100, xrange[1]*100, int(invfreq*100))]
    values = [vrange[0] + np.random.random()*(vrange[1]-vrange[0]) for x in xAxis]
    sig = {
                "pretty_print":newname,
                "newName":newname,
                "xAxis":[round(x,2) for x in xAxis],
                "values":[round(y,2) for y in values]
    }
    return sig

#-----------------------------------------------------------------------------------------------------------
def generate_binary_test_signal(name="Signal_1",newname="MWT_x",samples=10) :
#-----------------------------------------------------------------------------------------------------------
    '''
    S = generate_binary_test_signal()['Signal_1']
    display(S)
    plt.step(x=S['xAxis'],y=S['values'],marker='o',where='post',alpha=0.9)
    '''
    xAxis = generate_events(samples)
    values = [ np.random.randint(2)for x in xAxis]
    sig = {
                "pretty_print":newname,
                "newName":newname,
                "xAxis":[round(x,2) for x in xAxis],
                "values":[round(y,2) for y in values]    
    }
    return sig


#-----------------------------------------------------------------------------------------------------------
def generate_test_log(signals = 3):
#-----------------------------------------------------------------------------------------------------------
    log = {}
    for n in range(0,signals):
        name = f"Signal_{n}"
        log[name] = generate_binary_test_signal(name=name,newname=name)
    log["TimeStamps"] = {} 
    return log
generate_test_log()


