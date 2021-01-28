
import matplotlib.pyplot as plt

import matplotlib.patches as patches
#---------------------------------------------------------------------------------
#------------------------------   interval_to_signal -----------------------------
#---------------------------------------------------------------------------------
   
def interval_to_signal(R=[[10,15],[19,30]], offset = 1, width = 0.8,x_max=500):
    #print(R)
    if len(R)==0:
        return [],[]
    x = [0]
    y = [offset - width/2]
    for rs,re in R:
        
        rs = max(rs,0)
        if(re > 10000000):
            re = min(re,x_max)
        
        x.append(rs)
        y.append(offset + width/2)
        x.append(re)
        y.append(offset - width/2)
    if(len(x)>1):
        x.append(x_max)
        y.append(offset - width/2)
    if(len(x)>1 and x[1]==0) and False:
        return x[1:], y[1:]
    else:
        return x,y


  

#---------------------------------------------------------------------------------
#----------------------------------  plot_ga -------------------------------------
#---------------------------------------------------------------------------------
   
def plot_ga(row, offset, **kwargs):
    '''
    
    supportlines :bool <- True
   
 
    '''
    if row['gatype'] != "State":
        gx = row['guards']
        gy = [offset + 1] * len(gx)
        
        fx = row['fails']
        fy = [offset + 2] * len(fx)
        
        px = row['passes']
        py = [offset +3] * len(px)

        plt.plot(gx,gy,color="black",  lw = 0, label = "G", marker="x" )
        plt.vlines(gx,0.2,3.8,color="gray",alpha = 0.5,linestyle='-') 
        plt.plot(px,py,color="green", lw = 0, label = "P", marker="+"  )
        plt.plot(fx,fy,color="red",   lw = 0, label = "F", marker="*" )

    else:
        gx,gy = interval_to_signal(row['guards'], offset=offset + 1)
        fx,fy = interval_to_signal(row['fails'], offset=offset + 2)
        px,py = interval_to_signal(row['passes'], offset=offset + 3)
    
        linestyles = kwargs.get('linestyles',[':','--'])
        plt.plot(gx,gy,color="gray",  drawstyle="steps-post", label = "G"             )
        plt.plot(px,py,color="green", drawstyle="steps-post", label = "P", linestyle=linestyles[0]   )
        plt.plot(fx,fy,color="red",   drawstyle="steps-post", label = "F", linestyle=linestyles[1] )
    
    if kwargs.get('supportlines',True):
        (xmin,xmax) = plt.xlim()
        for ix in (1,2,3):
            plt.hlines(ix,xmin,xmax,color="gray",alpha = 0.5,lw=0.5,linestyle='-')  
    plt.ylim((0.5, 3.54))
    plt.yticks([1,2,3], ["G","F","P"])
    if kwargs.get('xaxis',False):
        ax = plt.gca()
        ax.axes.xaxis.set_visible(False)
 

def draw_withins(offs, R, tw,text=False,h=0.5):
    '''
    draw_withins(offs, R, tw,text=False,h=0.5)
    R = intervals or Events

    '''
    if len(R) == 0:
        return
    ax1 = plt.gca()
    W = []
    if type(R[0]) is not int:
        for [s,e] in R:
            W.append([s,s+tw])
    else:
        W=[[r] for r in R]
    fatten = h/2
    ymin,ymax = plt.ylim()
    for r in W:
        r1 = patches.Rectangle(
            (r[0], ymin), tw, ymax-ymin,
            hatch ="",
            facecolor="yellow",
            alpha = 0.50)
        ax1.add_patch(r1)
        if text:
            ax1.text(r[0], offs - fatten,f"within {tw}s")

def draw_fors(offs, R, tw,text=False,h=0.5):
    '''
        Not sure about this, we currently use
        a separate line as:
        plt.arrow(9.5,off['Afor']-0.25, 0.8,0,head_width=0.3, head_length=0.3)
        since the for period not always starts at the beginning of R.....

        draw_fors(currY, R, tw,text=False,h=0.5)

    '''
    ax1 = plt.gca()
    W = []
    for [s,e] in R:
        W.append([s,s+tw])
    fatten = h/2
    for r in W:
        r1 = patches.Rectangle(
            (r[0], offs + fatten), r[1]-r[0], h,
            hatch ="",
            facecolor="lightblue",
            alpha = 0.50)
        ax1.add_patch(r1)
        if text:
            ax1.text(r[0]+0.5, offs + h + 0.1,f"for {tw}s")
            
def plot_interval(R, offs, color="black",x_max = 10):
    X,Y = interval_to_signal(R,offs,0.5,x_max=x_max)
    plt.plot(X,Y,drawstyle="steps-post",c = color)

def plot_events(X,offs,color='black'):
    for x in X:
            plt.scatter(x,offs,s=50,c=color)      